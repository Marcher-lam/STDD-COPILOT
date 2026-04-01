---
name: stdd-supervisor
description: |
  多 Agent 协调器 - Supervisor 层级模式与任务委派
  触发场景：用户说 '/stdd-supervisor', 'supervisor', '协调器', '多Agent', '任务委派'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---
# STDD 多 Agent 协调器 (/stdd-supervisor)

## 目标
使用 **Supervisor 层级模式** 协调多个专业 Agent，实现复杂任务的自动分解与委派。

---

## 架构设计

```
                    ┌─────────────────────────────────────┐
                    │         Supervisor Agent            │
                    │   (任务分解、分配、监控、合并)        │
                    └───────────────┬─────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │ Planner Agent │       │ Coder Agent   │       │ Tester Agent  │
    │   (规划者)    │       │   (编码者)    │       │   (测试者)    │
    └───────────────┘       └───────────────┘       └───────────────┘
            │                       │                       │
            └───────────────────────┴───────────────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │ Reviewer Agent│
                            │   (审查者)    │
                            └───────────────┘
```

---

## Agent 角色定义

### Supervisor Agent (协调者)
- **职责**: 任务分解、分配、进度监控、结果合并
- **技能**: 任务分析、依赖识别、资源调度
- **触发**: `/stdd-supervisor <复杂任务>`

### Planner Agent (规划者)
- **职责**: 需求分析、方案设计、任务拆解
- **技能**: PRP 分析、BDD 规格编写、任务依赖图构建
- **触发**: 由 Supervisor 自动委派

### Coder Agent (编码者)
- **职责**: 代码实现、Bug 修复
- **技能**: 多语言编程、设计模式应用
- **触发**: 由 Supervisor 自动委派

### Tester Agent (测试者)
- **职责**: 测试用例编写、测试执行、覆盖率分析
- **技能**: TDD/BDD 测试、边界分析、变异测试
- **触发**: 由 Supervisor 自动委派

### Reviewer Agent (审查者)
- **职责**: 代码审查、质量检查、安全审计
- **技能**: 代码规范检查、安全漏洞检测
- **触发**: 由 Supervisor 自动委派

---

## 协调模式

### 模式 1: 顺序流水线 (Sequential Pipeline)
```
需求 → Planner → Coder → Tester → Reviewer → 完成
```
适用: 简单功能、线性依赖

### 模式 2: 并行协作 (Parallel Collaboration)
```
         ┌→ Coder A (前端)    ┐
需求 → Planner → Coder B (后端) → Reviewer → 完成
         └→ Coder C (数据库)  ┘
```
适用: 模块独立、可并行处理

### 模式 3: 层级委托 (Hierarchical Delegation)
```
Supervisor
    ├── Sub-Supervisor (前端组)
    │       ├── Coder 1
    │       └── Coder 2
    └── Sub-Supervisor (后端组)
            ├── Coder 3
            └── Coder 4
```
适用: 大型项目、多团队协作

---

## 使用方式

### 启动 Supervisor 模式
```bash
/stdd-supervisor 构建一个完整的电商购物车功能
```

### 指定协调模式
```bash
/stdd-supervisor --mode=parallel 实现用户认证模块
/stdd-supervisor --mode=sequential 修复登录 Bug
/stdd-supervisor --mode=hierarchical 重构支付系统
```

### 查看 Agent 状态
```bash
/stdd-supervisor status
```

### 暂停/恢复任务
```bash
/stdd-supervisor pause <task-id>
/stdd-supervisor resume <task-id>
```

---

## 任务分解逻辑

```javascript
function decomposeTask(requirement) {
  // 1. 分析需求复杂度
  const complexity = analyzeComplexity(requirement);

  // 2. 识别模块边界
  const modules = identifyModules(requirement);

  // 3. 构建依赖图
  const dependencyGraph = buildDependencyGraph(modules);

  // 4. 生成任务列表
  const tasks = generateTasks(dependencyGraph);

  // 5. 分配给专业 Agent
  return assignToAgents(tasks);
}
```

---

## Agent 通信协议

### 任务分配消息
```json
{
  "type": "task_assign",
  "from": "supervisor",
  "to": "coder",
  "task": {
    "id": "task-001",
    "description": "实现 TodoList 组件",
    "spec": "path/to/spec.md",
    "tests": "path/to/tests.md",
    "dependencies": ["task-000"],
    "priority": "high"
  },
  "context": {
    "projectRoot": "/path/to/project",
    "memoryPath": "stdd/memory",
    "activeFeature": "stdd/active_feature"
  }
}
```

### 任务完成消息
```json
{
  "type": "task_complete",
  "from": "coder",
  "to": "supervisor",
  "task": {
    "id": "task-001",
    "status": "completed",
    "artifacts": [
      "src/components/TodoList.tsx",
      "src/__tests__/TodoList.test.tsx"
    ],
    "metrics": {
      "linesOfCode": 120,
      "testCoverage": 95,
      "executionTime": "5m 32s"
    }
  }
}
```

### 任务阻塞消息
```json
{
  "type": "task_blocked",
  "from": "coder",
  "to": "supervisor",
  "task": {
    "id": "task-001",
    "status": "blocked",
    "reason": "缺少 API 接口定义",
    "requiredInfo": ["contracts.md 更新"]
  }
}
```

---

## 状态持久化

在 `stdd/memory/supervisor-state.json` 中：

```json
{
  "sessionId": "sup-2026-03-27-001",
  "mode": "parallel",
  "status": "in_progress",
  "tasks": {
    "task-001": {
      "agent": "coder",
      "status": "completed",
      "startTime": "2026-03-27T10:00:00Z",
      "endTime": "2026-03-27T10:05:32Z"
    },
    "task-002": {
      "agent": "coder",
      "status": "in_progress",
      "startTime": "2026-03-27T10:05:35Z"
    },
    "task-003": {
      "agent": "tester",
      "status": "pending",
      "dependencies": ["task-002"]
    }
  },
  "metrics": {
    "totalTasks": 5,
    "completed": 1,
    "inProgress": 1,
    "pending": 3,
    "blocked": 0
  }
}
```

---

## 示例输出

```
🚀 STDD Supervisor 已启动

📋 任务分析:
- 复杂度: 中等
- 识别模块: 4 个
- 预估时间: 2 小时

📊 任务分解:
┌─────────┬────────────────┬───────────┬──────────┐
│ Task ID │ 描述           │ 负责Agent │ 状态     │
├─────────┼────────────────┼───────────┼──────────┤
│ T-001   │ 数据模型设计   │ Planner   │ ✅ 完成  │
│ T-002   │ API 接口实现   │ Coder     │ 🔄 进行中│
│ T-003   │ 前端组件开发   │ Coder     │ ⏳ 等待  │
│ T-004   │ 集成测试编写   │ Tester    │ ⏳ 等待  │
│ T-005   │ 代码审查       │ Reviewer  │ ⏳ 等待  │
└─────────┴────────────────┴───────────┴──────────┘

📈 进度: 20% (1/5)
⏱️ 已用时间: 5m 32s
🎯 预计剩余: 1h 54m

> Coder Agent 正在处理 T-002: API 接口实现...
```

---

## 与 STDD 工作流集成

```
/stdd-supervisor 启动
    │
    ├──→ Planner: 生成 00_prp.md, 02_bdd_specs.feature
    │
    ├──→ Coder: 执行 /stdd-execute (Ralph Loop)
    │
    ├──→ Tester: 运行测试，生成覆盖率报告
    │
    └──→ Reviewer: 代码审查，生成审查报告

最终输出:
- FINAL_REQUIREMENT.md
- 测试覆盖率报告
- 代码审查报告
- Git 提交历史
```

---

> **引用**: 借鉴自 LangGraph Supervisor 模式

## 与 /stdd-parallel 的区别

| 维度 | /stdd-supervisor (本 Skill) | /stdd-parallel |
|------|-----------------------------|-----------------|
| **协调层级** | Agent 级（多个独立 Agent 进程） | 任务级（同一 Agent 内的子任务） |
| **角色模型** | Planner/Coder/Tester/Reviewer 专业角色 | 无角色区分，同一执行体 |
| **通信方式** | Agent 间消息传递 + 结果聚合 | 共享文件系统 + 内存 |
| **适用规模** | 大型特性（需跨专业领域协作） | 中小型特性（5-15 个微任务） |
| **错误隔离** | Agent 间完全隔离，可独立重启 | 任务间失败不影响其他任务 |

**选择指南**：
- 多技术栈（前端+后端+测试）、需要角色评审 → `/stdd-supervisor`
- 单一技术栈、任务间只差数据流 → `/stdd-parallel`
