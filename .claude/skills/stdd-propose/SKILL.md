---
name: stdd-propose
description: |
  提出新特性需求草案并进行澄清 QA。
  触发场景：用户说 '/stdd-propose', 'stdd propose', '提出需求', 'STDD需求', 'stdd propose'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 需求提案与澄清向导 (/stdd-propose)

目标：彻底消除需求边界的模糊地带，并拒绝超大颗粒度的史诗级 (Epic) 任务。

## 输入

- 用户的原始需求描述（自然语言，可长可短）

## 执行步骤

### 1. Epic 探测器（防爆炸）

分析用户的输入需求。如果判断这是一个庞大的 Epic 史诗级任务，**强行拦截**：

**判定标准**（满足任一即拦截）：
- 涉及 3 个以上独立用户角色
- 涉及 2 个以上独立子系统/模块
- 无法在 1 段 Given/When/Then 中描述核心行为
- 预估实现时间超过 2 小时

**拦截动作**：
```
⚠️ Epic 检测：该需求过于庞大，可能导致生成的 Spec 规范和任务链爆炸。

请将其切分为一个小故事 (User Story)，例如：
- 原始: "我要写一个完整的电商首页"
- 建议: "只先完成'商品列表的状态渲染'"

请重新描述更小粒度的需求：
```

暂停，等待用户切片后重新进入步骤 2。

### 2. 边界澄清问答

若需求粒度合理，**严禁在此阶段写任何实现代码**。

自动生成 **最多 2 个** 补全 QA，聚焦以下维度：

| 维度 | 示例问题 |
|------|----------|
| 边界条件 | "用户未登录时怎么处理？" |
| 异常场景 | "网络断开时是否需要本地缓存？" |
| 性能约束 | "列表最大支持多少条数据？" |
| 兼容性 | "是否需要支持 IE11？" |
| 优先级 | "这个功能在 MVP 中是否必须？" |

**输出格式**：
```
📋 需求澄清 QA：

Q1: [问题]
Q2: [问题]

请逐一回复。
```

等待用户逐条回复。

### 3. 生成需求草案

获得用户完整回复后，在 `stdd/changes/<change-name>/proposal.md` 写入需求草案。

**草案模板**：
```markdown
# Proposal: <标题>

## 原始需求
<用户原始输入>

## 澄清记录
<!-- Clarify Round #1 -->
- Q: <问题>
- A: <用户回答>

## 范围
### 包含
- <功能点列表>

### 不包含
- <明确排除的内容>

## 验收标准
- [ ] <标准 1>
- [ ] <标准 2>
```

### 4. 结束引导

提示用户执行下一步：
```
✅ 需求草案已生成: stdd/changes/<change-name>/proposal.md

下一步：
  /stdd:clarify   - 多轮深度澄清
  /stdd:ff        - 快速生成所有产物
```

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| 用户输入为空 | 提示"请描述您的需求" |
| 用户输入只有一句话 | 跳过 Epic 检测，直接生成草案 |
| 需求涉及已有变更 | 提示用户检查 `stdd list` 是否已有相关变更 |
| 用户拒绝切片 | 尊重用户选择，但记录警告 |

## 与其他 Skill 的关系

```
/stdd-propose ──► /stdd-clarify (多轮澄清)
                ──► /stdd:ff (快速跳过澄清)
```

---

## 用户旅程地图 (Story Mapping YAML)

参考 AIDD 的结构化产品发现，支持 YAML 格式的用户旅程文件，将需求从模糊描述升级为结构化的用户旅程。

### 旅程文件格式

生成文件: `stdd/changes/<change>/story-map.yaml`

```yaml
# Story Map: <功能名称>
# 版本: 1.0.0

persona:
  name: "典型用户"
  role: "end-user"
  goals:
    - "高效管理日常待办事项"
  pain_points:
    - "无法快速导出数据"
    - "离线时无法使用"

journey:
  steps:
    - id: discover
      title: "发现需求"
      actor: user
      action: "意识到需要管理待办"
      emotion: 😐 中性
      touchpoints:
        - "打开应用"
        - "看到空白列表"

    - id: create
      title: "创建 Todo"
      actor: user
      action: "输入标题并提交"
      emotion: 😊 积极
      touchpoints:
        - "输入框"
        - "提交按钮"
      happy_path:
        given: "用户在 Todo 页面"
        when: "输入标题并点击添加"
        then: "新 Todo 出现在列表中"
      sad_paths:
        - scenario: "空标题"
          given: "用户未输入标题"
          when: "点击添加"
          then: "显示验证错误"

    - id: export
      title: "导出数据"
      actor: user
      action: "选择导出格式并下载"
      emotion: 😊 积极
      touchpoints:
        - "导出按钮"
        - "格式选择器"
      happy_path:
        given: "用户有 3 个 Todo"
        when: "点击导出并选择 Markdown"
        then: "下载 .md 文件"
      sad_paths:
        - scenario: "空列表"
          given: "用户无 Todo"
          when: "点击导出"
          then: "按钮禁用 + 提示添加项目"

    - id: complete
      title: "完成任务"
      actor: user
      action: "勾选 Todo 为完成"
      emotion: 😃 满足
      touchpoints:
        - "复选框"

opportunities:
  - step: discover
    insight: "首次使用空列表体验差"
    proposal: "添加引导提示"
  - step: export
    insight: "用户可能需要 PDF 格式"
    proposal: "v2 支持 PDF 导出"

metrics:
  success_criteria:
    - name: "创建转化率"
      target: "≥80%"
      measure: "打开页面 → 成功创建"
    - name: "导出使用率"
      target: "≥30%"
      measure: "创建 Todo → 导出数据"
```

### 使用方式

```bash
# 为当前需求生成用户旅程地图
/stdd-propose --story-map

# 从已有 proposal.md 生成旅程地图
/stdd-propose --story-map --from=proposal.md

# 验证旅程地图完整性
/stdd-propose --story-map --validate
```

### 旅程地图与 BDD 的映射

旅程中的 `happy_path` 和 `sad_paths` 直接映射到 BDD 场景：

```
story-map.yaml                    →    feature.feature
─────────────────                       ────────────────
journey.steps[*].happy_path             →    Scenario: 正常路径
journey.steps[*].sad_paths[*]           →    Scenario: 异常路径
opportunities[*].proposal               →    Backlog (不进入当前 Sprint)
```
