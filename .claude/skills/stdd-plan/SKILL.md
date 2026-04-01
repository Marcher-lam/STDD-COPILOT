---
name: stdd-plan
description: |
  评估架构变更并生成细粒度的微任务清单白板。
  触发场景：用户说 '/stdd-plan', 'stdd plan', '任务拆解', 'STDD计划', 'stdd plan'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 架构契约与微任务白板拆解 (/stdd-plan)

目标：输出详细微任务，同时建立绝对的跨模块数据契约（Contract），阻断实施阶段 AI 因隔离引发的失忆或接口乱编。

## 前置条件

- `specs/*.feature` 已生成
- 用户已审阅 BDD 规格

## 执行步骤

### 1. 契约对齐（防脱节）

在设计阶段，必须首先在 `stdd/memory/contracts.md`（或指向项目中真实的共享 `types.ts` 等文件）中敲定好组件/前后端之间的数据结构与接口类型。

**契约内容**：
```typescript
// contracts.md 或 src/types/contracts.ts

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO 8601
}

interface ExportOptions {
  format: 'markdown' | 'json';
  includeCompleted: boolean;
}
```

**目的**：保证哪怕 TDD 在执行某特定微任务时由于隔离只读取了 1 个文件，也有着"公用契约基准"打底。

### 2. 架构思考

在 `design.md` 中画出这次变更涉及的：
- 组件依赖流（哪些组件互相调用）
- 数据流向（数据从哪里来、到哪里去）
- 架构拓扑（模块边界图）

**格式**：Mermaid 图或 ASCII 拓扑均可。

### 3. 拆解微任务

在 `tasks.md` 内，严格采用 Markdown Checkbox (`[ ]`) 制作极细步骤。

**拆解原则**：
- 每个变更最多 **5-6 个原子任务**（防跑偏第 2 级）
- 由外向内推进：E2E测试架构 → 底层核心（逻辑与数据）→ 业务胶水层 → 外部 UI/CLI 呈现
- 每个任务预估 **30 分钟** 内完成

**任务格式**：
```markdown
## Tasks: <变更名称>

- [ ] TASK-001: 创建数据模型与契约类型
  - 输入: contracts.md
  - 输出: src/types/TodoItem.ts
  - 测试: src/__tests__/types/TodoItem.test.ts

- [ ] TASK-002: 实现 IndexedDB 存储层
  - 输入: src/types/TodoItem.ts
  - 输出: src/services/TodoStorage.ts
  - 测试: src/__tests__/services/TodoStorage.test.ts

- [ ] TASK-003: 实现核心 TodoList 逻辑
  - 输入: src/services/TodoStorage.ts
  - 输出: src/services/TodoService.ts
  - 测试: src/__tests__/services/TodoService.test.ts

- [ ] TASK-004: 实现 Markdown 导出功能
  - 输入: src/services/TodoService.ts, src/types/TodoItem.ts
  - 输出: src/utils/exportMarkdown.ts
  - 测试: src/__tests__/utils/exportMarkdown.test.ts

- [ ] TASK-005: 实现 UI 组件
  - 输入: src/services/TodoService.ts, src/utils/exportMarkdown.ts
  - 输出: src/components/TodoList.tsx
  - 测试: src/__tests__/components/TodoList.test.tsx
```

### 4. 确认门控（Human Gate）

通知用户审阅任务清单，**挂起等待签批**：

```
📋 微任务白板已生成: tasks.md (5 个任务)

请审阅任务拆解是否合理。确认后运行: /stdd:apply
```

### 5. 结束引导

用户认同后，提示输入 `/stdd:apply` 开始真正的 TDD 代码微生成环。

## 输出

- `contracts.md`（或更新的类型文件）— 跨模块接口契约
- `design.md` — 架构设计文档
- `tasks.md` — 微任务清单（Checkbox 格式）
- `arch-decisions.md` — 架构决策记录（ADR）
- `stdd/memory/arch-evolution.md` — 架构演进日志

## Unfolding Architecture（渐进式架构决策）

参考 tdder，Unfolding Architecture 是一种**按需渐进**的架构决策机制：不要求项目初期就确定完整架构，而是随着功能的增加逐步"展开"架构决策。

### 核心原则

```
┌─────────────────────────────────────────────────────────────┐
│              Unfolding Architecture 原则                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Sprint 1        Sprint 2        Sprint 3                  │
│   ┌─────┐         ┌─────┐        ┌─────┐                  │
│   │ MVC │ ──►     │ 分层 │ ──►   │ 微服务│                 │
│   └─────┘         │ Service │      │ 边界  │                 │
│                   │   层    │      │  清晰  │                 │
│   单体即可         └─────┘        └─────┘                  │
│                    业务增长          团队扩张                  │
│                    需要分层          需要拆分                  │
│                                                              │
│   关键: 架构决策是「拉」出来的，不是「推」进去的               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 架构决策记录 (ADR)

每次 `/stdd-plan` 执行时，自动维护架构决策记录。

**文件**: `stdd/changes/<change>/arch-decisions.md`

```markdown
# Architecture Decision Records

## ADR-001: 初始分层架构
- **日期**: 2026-04-02
- **状态**: ✅ 已采纳
- **上下文**: 项目从单文件起步，首个功能需要 Service 层抽象
- **决策**: 采用 Controller → Service → Repository 三层
- **理由**: 业务逻辑与数据访问分离，测试可 mock Repository
- **触发变更**: change-20260402-100000 (Todo List)
- **替代方案**: 单文件 MVC（被否决——过早耦合）
- **后续影响**: 为 Sprint 3 微服务拆分奠定基础

## ADR-002: [后续决策由功能需求触发时自动生成]
```

### 架构演进触发器

以下信号出现时，`/stdd-plan` 自动触发架构决策评估：

| 信号 | 检测方式 | 推荐动作 |
|------|----------|----------|
| APP Mass > 5.0 | stdd-complexity | 拆分模块 |
| 循环依赖 | import 分析 | 引入接口层 |
| 同文件 > 300 行 | LOC 统计 | 拆分职责 |
| 测试需要 mock > 3 个外部模块 | stdd-mock 统计 | 引入适配器层 |
| 2+ 人同时修改同一文件 | git log 分析 | 拆分模块边界 |
| 功能跨 2+ 领域 | feature 分析 | 考虑限界上下文 |

### 架构演进日志

**文件**: `stdd/memory/arch-evolution.md`

```markdown
# Architecture Evolution Log

## Timeline

### Sprint 1 (2026-04-02)
- **架构**: 单体 (Controller → Service → Repository)
- **模块**: TodoService, ExportService
- **决策**: ADR-001 (三层分层)
- **APP Mass**: 2.1 (B 级)

### Sprint 2 (待规划)
- **触发器**: [待检测]
- **计划**: [待 ADR 评估]

## 架构热力图

```
src/
├── services/      ████████ 高变更频率
├── components/    ████     中等
├── types/         ██       低（稳定）
└── utils/         █        低（稳定）
```
```

### 与 Ralph Loop 集成

```
Ralph Loop: Refactor 阶段
    │
    ├──► 检测架构演进触发器
    │    ├── APP Mass > 阈值? → 记录到演进日志
    │    ├── 循环依赖? → 标记需要拆分
    │    └── 文件过长? → 建议拆分
    │
    └──► 输出架构建议（不阻断，仅记录）
         └── 下次 /stdd-plan 时作为输入
```

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| 变更极小（如改文案） | 允许只拆 1-2 个任务 |
| 任务超过 6 个 | 提示用户考虑切分，建议拆为多个变更 |
| 无法确定架构 | 标记为 `[待定]`，在 execute 阶段补充 |
| 用户拒绝任务清单 | 回到步骤 3 重新拆解 |

## 与其他 Skill 的关系

```
/stdd-spec ──► /stdd-plan ──► /stdd:apply
```

---

## 持久计划状态 (Persistent Plan State)

参考 Claude Pilot 的 `.pilot/` 持久化目录，STDD 在 `stdd/changes/<change>/` 中维护跨 session 的完整状态，确保中断后可恢复。

### 状态文件

```
stdd/changes/<change-name>/
├── .state.yaml            # 当前状态快照
├── proposal.md            # Phase 1 产物
├── specs/                 # Phase 2 产物
│   └── feature.feature
├── contracts.md           # Phase 3 产物
├── design.md              # Phase 3 产物
├── tasks.md               # Phase 3 产物
├── arch-decisions.md      # ADR 记录
└── implementation_log.md  # 执行日志
```

### 状态文件格式 (.state.yaml)

```yaml
# stdd/changes/<change-name>/.state.yaml
change: "change-20260402-100000"
description: "Todo List 导出功能"
created_at: "2026-04-02T10:00:00Z"
updated_at: "2026-04-02T14:30:00Z"

# 当前阶段
current_phase: "execute"  # proposal | spec | plan | execute | verify | commit
completed_phases:
  - proposal
  - spec
  - plan

# 执行进度
execution:
  total_tasks: 5
  completed_tasks: 3
  current_task: "TASK-004"
  ralph_loop:
    iteration: 7
    phase: "green"        # red | check | green | mutate | refactor
    failure_count: 0
    last_test_run: "passed"

# 恢复上下文（供 AI 快速恢复）
resume_context:
  last_action: "完成 TASK-003 重构，进入 TASK-004"
  next_action: "TASK-004: 实现 Markdown 导出功能 → Red 阶段"
  blocked_by: null
  decisions_made:
    - "选择 marked.js 作为 Markdown 解析库"
    - "ExportService 独立于 TodoService"
```

### 恢复机制

```bash
# session 中断后恢复
/stdd-plan --resume
# → 读取 .state.yaml，从上次中断点继续

# 查看当前状态
/stdd-plan --status
# → 输出当前阶段、进度、下一步

# 手动设置状态（调试用）
/stdd-plan --set-phase=execute --set-task=TASK-003
```

### 恢复输出

```
📋 STDD 状态恢复

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 变更: change-20260402-100000
   描述: Todo List 导出功能
   创建: 2026-04-02 10:00
   更新: 2026-04-02 14:30

📊 进度:
   阶段: execute (4/6)
   任务: 3/5 完成
   当前: TASK-004 (Ralph Loop: green 阶段)

▶️ 恢复动作:
   1. 继续 TASK-004 Ralph Loop
   2. 当前阶段: Green (最简实现)
   3. 失败计数: 0 (正常)

💡 上次中断点: "完成 TASK-003 重构，进入 TASK-004"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

继续执行: /stdd-execute
```
