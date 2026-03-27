---
description: 多角色协作系统 - Product Owner/Developer/Tester/Reviewer 角色扮演
---

# STDD 多角色协作系统 (/stdd-roles)

## 目标
通过角色扮演实现多视角协作，每个角色有独特的职责、关注点和决策权，确保软件开发的全面质量。

---

## 角色定义

### 🎯 Product Owner (产品负责人)
```
职责:
- 定义产品愿景和优先级
- 编写用户故事
- 验收功能是否符合业务需求
- 决策范围: 需求优先级、功能取舍

关注点:
- 业务价值最大化
- 用户体验
- 交付时间

口头禅: "这个功能对用户的价值是什么？"
```

### 💻 Developer (开发者)
```
职责:
- 技术方案设计
- 代码实现
- 代码重构
- 决策范围: 技术选型、架构实现

关注点:
- 代码质量
- 可维护性
- 性能优化

口头禅: "如何用最简洁的方式实现？"
```

### 🧪 Tester (测试工程师)
```
职责:
- 编写测试用例
- 执行测试
- 缺陷报告
- 决策范围: 测试覆盖、质量门禁

关注点:
- 边界条件
- 异常处理
- 测试覆盖率

口头禅: "如果用户这样操作会怎样？"
```

### 🔍 Reviewer (审查者)
```
职责:
- 代码审查
- 安全审计
- 架构评审
- 决策范围: 代码批准、架构变更

关注点:
- 代码规范
- 安全漏洞
- 技术债务

口头禅: "这段代码有什么潜在问题？"
```

---

## 协作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      STDD Role Workflow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                                              │
│   │   Product    │                                              │
│   │    Owner     │                                              │
│   │  定义需求    │                                              │
│   └──────┬───────┘                                              │
│          │ 需求文档                                              │
│          ▼                                                       │
│   ┌──────────────┐    ┌──────────────┐                         │
│   │   Tester     │◀──▶│  Developer   │                         │
│   │  编写测试    │    │  实现代码    │                         │
│   └──────┬───────┘    └──────┬───────┘                         │
│          │                    │                                  │
│          │     测试 + 代码    │                                  │
│          └────────┬───────────┘                                  │
│                   ▼                                               │
│          ┌──────────────┐                                        │
│          │   Reviewer   │                                        │
│          │   代码审查   │                                        │
│          └──────┬───────┘                                        │
│                 │ 审查报告                                        │
│                 ▼                                                 │
│          ┌──────────────┐                                        │
│          │   Product    │                                        │
│          │    Owner     │                                        │
│          │   验收确认   │                                        │
│          └──────────────┘                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 使用方式

### 启动角色协作模式
```bash
/stdd-roles start
```

### 切换角色
```bash
# 切换到产品负责人视角
/stdd-roles switch product-owner

# 切换到开发者视角
/stdd-roles switch developer

# 切换到测试工程师视角
/stdd-roles switch tester

# 切换到审查者视角
/stdd-roles switch reviewer
```

### 角色会议
```bash
# 召开角色会议 (所有角色发言)
/stdd-roles meeting "讨论 Todo 导出功能"

# 快速投票
/stdd-roles vote "是否采用 IndexedDB?"

# 共识确认
/stdd-roles consensus
```

---

## 角色视图

### Product Owner 视图
```bash
/stdd-roles switch product-owner
```

输出:
```
🎯 当前角色: Product Owner

📋 待处理需求:
  1. [高优先级] Todo Markdown 导出
  2. [中优先级] 离线支持
  3. [低优先级] 主题切换

💡 产品思考:
  - "Todo 导出功能对用户的核心价值是什么？"
  - "用户期望的导出格式有哪些？"
  - "是否需要支持批量导出？"

📝 建议行动:
  1. 明确导出格式需求
  2. 确定优先级
  3. 编写用户故事
```

### Developer 视图
```bash
/stdd-roles switch developer
```

输出:
```
💻 当前角色: Developer

🔧 技术上下文:
  - 技术栈: React + TypeScript
  - 测试框架: Vitest
  - 状态管理: Zustand

📐 架构思考:
  - ExportButton 组件位置: src/components/
  - 服务层: src/services/ExportService.ts
  - 测试覆盖目标: 90%

💡 开发建议:
  - 创建 ExportService 抽象导出逻辑
  - 支持 Markdown 和 JSON 两种格式
  - 使用策略模式便于扩展
```

### Tester 视图
```bash
/stdd-roles switch tester
```

输出:
```
🧪 当前角色: Tester

📋 测试场景:
  1. ✅ 导出空列表 → 生成空 Markdown
  2. ✅ 导出已完成项 → 正确的勾选状态
  3. ⚠️ 导出大量数据 → 性能测试
  4. ⚠️ 特殊字符处理 → XSS 防护

🔍 边界条件:
  - 空列表
  - 1000+ 项
  - 特殊字符 (HTML, Markdown)
  - Unicode 字符

📊 覆盖率目标:
  - 语句覆盖: ≥ 90%
  - 分支覆盖: ≥ 85%
  - 函数覆盖: ≥ 95%
```

### Reviewer 视图
```bash
/stdd-roles switch reviewer
```

输出:
```
🔍 当前角色: Reviewer

📋 审查清单:
  [ ] 代码符合项目规范
  [ ] 无明显安全漏洞
  [ ] 测试覆盖充分
  [ ] 无硬编码值
  [ ] 错误处理完善

⚠️ 潜在问题:
  1. ExportService.ts:42 - 未处理 null 参数
  2. exportButton.tsx:15 - 缺少 aria-label

💡 改进建议:
  - 添加参数验证
  - 增强可访问性
  - 考虑添加日志
```

---

## 角色会议示例

```bash
/stdd-roles meeting "讨论是否使用 IndexedDB"
```

输出:
```
📢 角色会议: 讨论是否使用 IndexedDB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Product Owner:
  "从用户角度，IndexedDB 提供更大的存储空间，
   支持离线使用，但实现复杂度增加。
   我建议先评估用户实际需求量。"

💻 Developer:
  "技术实现上，IndexedDB 需要:
   - Dexie.js 作为 ORM (简化操作)
   - 迁移策略 (版本管理)
   - 预计增加 2 天开发时间
   建议: 先用 localStorage MVP，后续迭代升级"

🧪 Tester:
  "测试角度考虑:
   - IndexedDB 有更多的边界条件
   - 需要模拟离线场景
   - 跨浏览器兼容性测试
   建议: 先保持简单"

🔍 Reviewer:
  "代码质量角度:
   - IndexedDB 代码更复杂
   - 需要更完善的错误处理
   建议: 遵循 YAGNI 原则"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 共识结果:
  ✅ 先使用 localStorage 实现 MVP
  ✅ 预留 IndexedDB 升级接口
  ✅ 在 02_bdd_specs.feature 中记录此决策

执行: 记录决策到 .stdd/memory/decisions.md
```

---

## 角色投票

```bash
/stdd-roles vote "导出功能是否需要支持 PDF?"
```

输出:
```
📊 角色投票: 导出功能是否需要支持 PDF?

🎯 Product Owner: ✅ 是
  理由: "用户可能需要打印分享"

💻 Developer: ❌ 否
  理由: "PDF 生成复杂度高，建议后续迭代"

🧪 Tester: ❌ 否
  理由: "测试工作量翻倍"

🔍 Reviewer: ❌ 否
  理由: "增加维护成本"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

结果: ❌ 不支持 (1:3)

决策: 本迭代不支持 PDF 导出
      记录到 backlog 作为未来功能
```

---

## 与 STDD 工作流集成

```
/stdd-propose
    │
    └──► Product Owner: 定义需求价值

/stdd-clarify
    │
    └──► Product Owner + Developer: 业务与技术对齐

/stdd-spec
    │
    └──► Tester: 编写 BDD 规格

/stdd-plan
    │
    └──► Developer: 技术方案设计

/stdd-execute
    │
    ├──► Developer: 实现代码
    └──► Tester: 编写测试

/stdd-commit
    │
    └──► Reviewer: 代码审查
            │
            └──► Product Owner: 最终验收
```

---

## 配置

在 `.stdd/memory/roles-config.json` 中：

```json
{
  "roles": {
    "product-owner": {
      "enabled": true,
      "votingWeight": 1.5
    },
    "developer": {
      "enabled": true,
      "votingWeight": 1.0
    },
    "tester": {
      "enabled": true,
      "votingWeight": 1.0
    },
    "reviewer": {
      "enabled": true,
      "votingWeight": 1.2
    }
  },
  "consensusThreshold": 0.6,
  "meetingTimeout": 300000
}
```

---

> **引用**: 借鉴自 CrewAI 多 Agent 角色协作模式
