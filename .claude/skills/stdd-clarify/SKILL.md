---
name: stdd-clarify
description: |
  需求细化与澄清（与用户交互）。
  触发场景：用户说 '/stdd-clarify', 'stdd clarify', '需求澄清', 'STDD澄清', 'clarify需求'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 需求澄清向导 (/stdd-clarify)

目标：通过系统化的多轮问答，补全需求的隐含约束和边界条件，消除歧义。

## 前置条件

- 存在活跃变更目录 `stdd/changes/<change>/`
- `proposal.md` 已生成

## 执行步骤

### 1. 加载原始需求

读取 `proposal.md` 中的原始需求文本和范围定义。

### 2. 生成澄清问题

基于需求自动生成 **3-5 条关键澄清问题**，按优先级排序：

| 优先级 | 问题类型 | 示例 |
|--------|----------|------|
| P0 必须澄清 | 技术栈选择 | "持久化方式：localStorage / IndexedDB / 后端 API？" |
| P0 必须澄清 | 边界条件 | "空列表时导出按钮是否禁用？" |
| P1 建议澄清 | 性能约束 | "列表最大支持多少条数据？" |
| P1 建议澄清 | 兼容性 | "是否需要支持移动端？" |
| P2 可选澄清 | 安全要求 | "导出数据是否需要脱敏？" |

**生成规则**：
- 每个问题提供 2-4 个选项供用户快速选择
- 避免纯开放式问题，降低用户认知负担
- 若需求已经很清晰（如纯 UI 调整），可少于 3 个问题

### 3. 逐条交互

将每个问题逐条输出到终端，**等待用户回复后再问下一个**。

```
📝 澄清 Round #1

Q1/3: 数据持久化方式？
  A) localStorage
  B) IndexedDB
  C) 后端 API
  D) 仅内存（不需要持久化）

> B
✅ 已记录: IndexedDB
```

### 4. 记录澄清结果

将用户的回复写入 `proposal.md` 的 **澄清记录** 区块：

```markdown
<!-- Clarify Round #1 -->
- Q: 数据持久化方式？ → A: IndexedDB
- Q: 空列表时导出按钮是否禁用？ → A: 是，显示禁用状态并提示"请先添加项目"
<!-- /Clarify -->
```

### 5. 完成判断

- **所有问题已回答** → 输出 `澄清完成`，自动进入 `/stdd:confirm`
- **用户主动终止** → 保存已有澄清记录，提示可随时用 `/stdd:clarify` 继续

## 输出

- 更新后的 `proposal.md`（含澄清记录区块）

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| proposal.md 不存在 | 报错，提示先运行 `/stdd:propose` |
| 用户回答"不确定" | 对该问题标记 `[待定]`，不阻塞后续流程 |
| 多次运行 /stdd:clarify | 追加新的 Round，不覆盖已有记录 |
| 需求过于简单无需澄清 | 直接跳过，自动流转到 /stdd:confirm |

## 与其他 Skill 的关系

```
/stdd-propose ──► /stdd-clarify ──► /stdd-confirm
```

---

## 高级引导方法库 (Advanced Elicitation Methods)

参考 BMAD-METHOD，提供 60+ 结构化推理方法替代基础问答。每种方法从不同角度挖掘需求的隐含约束和风险。

### 引导方法分类

```
┌─────────────────────────────────────────────────────────────┐
│               Advanced Elicitation Methods                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   🔍 风险发现类 (10 种)                                      │
│   ├── Pre-mortem          "如果项目失败了，是什么原因？"     │
│   ├── Devil's Advocate    "反对这个方案的理由有哪些？"       │
│   ├── Black Swan          "最不可能发生但最致命的情况？"     │
│   ├── Threat Modeling     "谁会攻击？怎么攻击？为什么？"     │
│   ├── Failure Modes       "每个组件可能的故障模式？"         │
│   ├── Chaos Engineering   "随机断开依赖会怎样？"             │
│   ├── Stress Testing      "10倍负载下系统会怎样？"          │
│   ├── Regression Risk     "这个变更会破坏什么已有功能？"     │
│   ├── Dependency Risk     "哪些外部依赖最不可靠？"           │
│   └── Data Loss Scenario  "什么操作可能导致数据丢失？"       │
│                                                              │
│   🧠 深度推理类 (12 种)                                      │
│   ├── First Principles    "这个问题最本质的约束是什么？"     │
│   ├── 5-Whys              连续追问 5 次为什么                │
│   ├── Socratic Method     通过反问揭示逻辑矛盾              │
│   ├── Abductive Reasoning "最可能的解释是什么？"             │
│   ├── Analogical Reasoning "类似问题的解决方案？"            │
│   ├── Reductionism        "能否分解为更小的子问题？"         │
│   ├── Systems Thinking    "各部分如何互相影响？"             │
│   ├── Constraint Analysis "哪些约束是硬性的？哪些是假设？"   │
│   ├── Trade-off Analysis  "每个选择的代价是什么？"           │
│   ├── Second-Order Effect "这个决定的二阶效应是什么？"       │
│   ├── Reversibility       "哪些决定可以撤销？哪些不能？"     │
│   └── Opportunity Cost    "选择这个意味着放弃了什么？"       │
│                                                              │
│   👤 用户视角类 (10 种)                                      │
│   ├── Empathy Mapping     "用户在想什么？感受什么？"         │
│   ├── Persona Walkthrough "特定角色会怎么走这个流程？"       │
│   ├── Journey Mapping     "从意识到需求到完成任务的全过程"   │
│   ├── Edge Case User      "最极端的用户会怎么操作？"         │
│   ├── Accessibility Audit "残障用户能否使用？"               │
│   ├── Cross-Cultural      "不同文化背景用户的需求差异？"     │
│   ├── Novice vs Expert    "新手和专家的使用差异？"           │
│   ├── Error Recovery      "用户犯错后如何恢复？"             │
│   ├── Mental Model Gap    "用户的预期与实际行为的差距？"     │
│   └── Time Pressure       "用户赶时间时如何简化操作？"       │
│                                                              │
│   🏗️ 架构决策类 (10 种)                                      │
│   ├── ADR (Arch Decision) "这个决策的上下文/替代/后果？"     │
│   ├── C4 Model            系统/容器/组件/代码 4 层分析       │
│   ├── Event Storming      "领域事件有哪些？顺序如何？"       │
│   ├── Bounded Context     "这个概念的边界在哪里？"           │
│   ├── API Contract First  "消费者需要什么？提供者能保证？"   │
│   ├── Data Flow Analysis  "数据从哪里来？到哪里去？变几次？" │
│   ├── Coupling Analysis   "哪些模块耦合过紧？如何解耦？"    │
│   ├── Scalability Check   "100倍流量时架构瓶颈在哪？"       │
│   ├── Tech Debt Radar     "当前技术债务的严重程度？"         │
│   └── Build vs Buy        "自建还是采购？决策标准？"         │
│                                                              │
│   📋 需求完整性类 (10 种)                                    │
│   ├── INVEST Checklist    检查用户故事的 6 个属性             │
│   ├── Acceptance Criteria "怎么证明这个功能做完了？"         │
│   ├── Non-Functional Req  "性能/安全/可用性/可观测性？"      │
│   ├── Regulatory Check    "有没有合规/法律/隐私要求？"       │
│   ├── Backward Compat     "旧数据/旧接口如何兼容？"          │
│   ├── Migration Path      "从现有系统如何迁移？"             │
│   ├── Rollback Plan       "出问题如何回滚？"                 │
│   ├── Monitoring Needs    "需要监控哪些指标？"               │
│   ├── Documentation Needs "用户/开发者需要什么文档？"        │
│   └── Done Definition     "Done 的定义是什么？"              │
│                                                              │
│   🎯 优先级决策类 (8 种)                                     │
│   ├── MoSCoW              Must/Should/Could/Won't 分级       │
│   ├── RICE Scoring        Reach×Impact×Confidence/Effort     │
│   ├── Value vs Effort     二维矩阵优先级排序                 │
│   ├── Cost of Delay       "延迟一周的成本是多少？"           │
│   ├── MVP Definition      "最小可验证的产品是什么？"         │
│   ├── Timeboxing          "如果只有 1 天/1 周/1 月？"        │
│   ├── Risk vs Reward      "风险收益比如何？"                 │
│   └── Stakeholder Map     "谁是决策者？谁是影响者？"         │
│                                                              │
│   🔀 创新思维类 (8 种)                                       │
│   ├── SCAMPER             替代/合并/适应/修改/其他用途/消除/重排 │
│   ├── Six Thinking Hats   白/红/黑/黄/绿/蓝帽子思考         │
│   ├── lateral Thinking    侧向思维——跳出框架看问题           │
│   ├── Random Entry        随机词联想激发创意                 │
│   ├── Provocation         "如果反过来做会怎样？"             │
│   ├── Biomimicry          "自然界如何解决类似问题？"         │
│   ├── Reverse Brainstorm  "如何让这个功能彻底失败？"         │
│   └── Future Back         "5年后这个系统应该什么样？"        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

总计: 78 种引导方法
```

### 使用方式

```bash
# 自动选择引导方法（根据需求类型智能匹配）
/stdd-clarify --elicitation=auto

# 指定引导方法
/stdd-clarify --elicitation=pre-mortem
/stdd-clarify --elicitation=5-whys
/stdd-clarify --elicitation=first-principles

# 组合引导（推荐 2-3 种互补方法）
/stdd-clarify --elicitation=pre-mortem+devil-advocate+edge-case-user

# 查看所有可用方法
/stdd-clarify --elicitation=list
```

### 智能匹配规则

| 需求类型 | 自动匹配方法 | 理由 |
|----------|------------|------|
| 新功能 | Journey Mapping + Pre-mortem | 全流程+提前发现风险 |
| API 设计 | API Contract First + Threat Modeling | 消费者视角+安全 |
| 数据库变更 | Data Flow Analysis + Rollback Plan | 数据完整性+回滚 |
| 性能优化 | Scalability Check + Stress Testing | 瓶颈+极端负载 |
| 安全修复 | Threat Modeling + Attack Surface | 攻击面分析 |
| 重构 | Coupling Analysis + Regression Risk | 依赖风险 |
| UI 变更 | Empathy Mapping + Accessibility Audit | 用户体验 |

### 引导输出格式

```
🧠 Elicitation: Pre-mortem

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

假设现在是 2026-05-01，这个功能已经上线 4 周，结果失败了。

📋 失败分析：

  1. 💥 "数据丢失——IndexedDB 迁移在 Safari 上失败"
     → 预防: 添加浏览器兼容性测试 + 数据备份机制

  2. 💥 "性能崩溃——导出 10000+ 条 Todo 时浏览器卡死"
     → 预防: 分批导出 + Web Worker

  3. 💥 "用户困惑——空列表时用户不知道怎么开始"
     → 预防: 添加引导提示 + 示例 Todo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 衍生需求（从失败分析中提取）：
  - [需求] Safari IndexedDB 兼容性测试
  - [需求] 分批导出机制
  - [需求] 新手引导流程
```

### 与标准澄清的关系

```
标准澄清 (--elicitation=off 或默认):
  Q1: 持久化方式？
  Q2: 最大数据量？
  → 简单问答，用户主动提供信息

高级引导 (--elicitation=auto):
  Pre-mortem → 如果失败是什么原因？
  5-Whys → 为什么选择这个方案？
  → 结构化推理，AI 主动挖掘隐含风险
```
