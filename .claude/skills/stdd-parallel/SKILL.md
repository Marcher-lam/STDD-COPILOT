---
name: stdd-parallel
description: |
  并行执行模式 - 独立任务并行处理与结果聚合
  触发场景：用户说 '/stdd-parallel', 'parallel', '并行', '并发执行', 'DAG调度'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---
# STDD 并行执行模式 (/stdd-parallel)

## 目标
识别并并行执行独立的子任务，显著减少总执行时间，同时处理依赖关系和结果聚合。

---

## 架构设计

```
                    ┌─────────────────────────────────────┐
                    │         Task Analyzer               │
                    │   (依赖分析 & 并行度评估)            │
                    └───────────────┬─────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │         Execution Plan        │
                    │   (DAG 构建与层级划分)         │
                    └───────────────┬───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   Worker 1    │           │   Worker 2    │           │   Worker 3    │
│ (Coder Agent) │           │ (Coder Agent) │           │ (Tester Agent)│
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        └───────────────────────────┴───────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │       Result Aggregator       │
                    │   (结果聚合与冲突检测)         │
                    └───────────────────────────────┘
```

---

## 并行策略

### 策略 1: 模块并行
```
任务: 实现电商购物车

并行执行:
├── Worker 1: 前端组件 (Cart.tsx)
├── Worker 2: 后端 API (cart-routes.ts)
└── Worker 3: 数据库模型 (Cart.ts)

等待所有完成后:
└── 聚合: 集成测试
```

### 策略 2: 测试并行
```
任务: 运行所有测试

并行执行:
├── Worker 1: 单元测试 (src/__tests__/)
├── Worker 2: 集成测试 (tests/integration/)
└── Worker 3: E2E 测试 (tests/e2e/)

聚合:
└── 合并覆盖率报告
```

### 策略 3: 功能切片
```
任务: 实现 CRUD 操作

层级 1 (可并行):
├── Create 功能
├── Read 功能
├── Update 功能
└── Delete 功能

层级 2 (依赖层级 1):
└── 批量操作 (依赖所有 CRUD)
```

---

## 依赖图分析

### DAG 构建
```javascript
function buildDependencyGraph(tasks) {
  const graph = new DirectedAcyclicGraph();

  for (const task of tasks) {
    graph.addNode(task.id);

    for (const dep of task.dependencies) {
      graph.addEdge(dep, task.id);
    }
  }

  return graph;
}
```

### 层级划分
```javascript
function identifyLevels(graph) {
  const levels = [];
  const completed = new Set();

  while (completed.size < graph.nodeCount) {
    // 找出所有依赖已满足的节点
    const ready = graph.nodes.filter(node =>
      !completed.has(node) &&
      graph.getDependencies(node).every(dep => completed.has(dep))
    );

    levels.push(ready);
    ready.forEach(n => completed.add(n));
  }

  return levels;
}
```

---

## 使用方式

### 启动并行执行
```bash
/stdd-parallel
```

### 指定并行度
```bash
# 最大 4 个并行任务
/stdd-parallel --workers=4

# 自动检测 (基于 CPU 核心数)
/stdd-parallel --workers=auto
```

### 选择策略
```bash
# 模块并行
/stdd-parallel --strategy=module

# 测试并行
/stdd-parallel --strategy=test

# 功能切片
/stdd-parallel --strategy=slice
```

### 查看执行计划
```bash
/stdd-parallel plan
```

---

## 执行计划可视化

```bash
/stdd-parallel plan
```

输出:
```
📊 并行执行计划

任务依赖图 (DAG):
```
     Level 0 (并行)          Level 1 (并行)         Level 2
    ┌─────────────┐
    │   Task A    │──────────────┐
    │ (前端组件)  │              │
    └─────────────┘              ▼
                         ┌─────────────┐       ┌─────────────┐
    ┌─────────────┐      │   Task D    │──────▶│   Task F    │
    │   Task B    │─────▶│ (API 集成)  │       │ (集成测试)  │
    │ (后端 API)  │      └─────────────┘       └─────────────┘
    └─────────────┘              ▲
                                 │
    ┌─────────────┐              │
    │   Task C    │──────────────┘
    │ (数据库模型)│
    └─────────────┘
```

执行顺序:
  Level 0: Task A, Task B, Task C (3 并行)
  Level 1: Task D (1 并行)
  Level 2: Task F (1 并行)

预估时间: 15 分钟 (串行需 35 分钟)
加速比: 2.3x
```

---

## 冲突检测与解决

### 文件冲突检测
```javascript
function detectFileConflicts(tasks) {
  const fileUsage = new Map();

  for (const task of tasks) {
    for (const file of task.affectedFiles) {
      if (fileUsage.has(file)) {
        return {
          conflict: true,
          file: file,
          tasks: [fileUsage.get(file), task.id]
        };
      }
      fileUsage.set(file, task.id);
    }
  }

  return { conflict: false };
}
```

### 解决策略
```
⚠️ 检测到文件冲突

文件: src/services/TodoService.ts
冲突任务:
  - Task A: 实现添加功能
  - Task B: 实现删除功能

解决方案:
1. 串行执行 Task A → Task B
2. 合并为单个任务 (推荐)
3. 拆分文件为多个模块

选择: [1/2/3]
```

---

## 执行监控

```
🔄 STDD Parallel 执行中

┌─────────────────────────────────────────────────────────────┐
│ Worker 1: Task A (前端组件)                    [████████░░] 80% │
│ Worker 2: Task B (后端 API)                    [██████████] 100%│
│ Worker 3: Task C (数据库模型)                  [██████░░░░] 60% │
└─────────────────────────────────────────────────────────────┘

📊 实时统计:
  已完成: 1/3
  进行中: 2
  等待中: 0
  失败: 0

⏱️ 时间:
  已用: 5m 23s
  预计剩余: 2m 15s

💡 状态:
  ✅ Task B 完成
  🔄 Task A: 生成组件代码
  🔄 Task C: 编写数据库迁移
```

---

## 结果聚合

```javascript
async function aggregateResults(workerResults) {
  const report = {
    success: true,
    completedTasks: [],
    failedTasks: [],
    mergedFiles: [],
    conflicts: []
  };

  for (const result of workerResults) {
    if (result.status === 'success') {
      report.completedTasks.push(result.task);
    } else {
      report.failedTasks.push(result);
      report.success = false;
    }

    // 检测文件合并冲突
    const mergeResult = await mergeFileChanges(result.changes);
    if (mergeResult.conflicts) {
      report.conflicts.push(...mergeResult.conflicts);
    }
  }

  return report;
}
```

---

## 聚合报告

```
📊 并行执行报告

✅ 总体状态: 成功

任务完成:
┌─────────────┬──────────┬──────────┬─────────────┐
│ Task ID     │ Worker   │ 耗时     │ 状态        │
├─────────────┼──────────┼──────────┼─────────────┤
│ Task A      │ Worker 1 │ 6m 12s   │ ✅ 完成     │
│ Task B      │ Worker 2 │ 5m 45s   │ ✅ 完成     │
│ Task C      │ Worker 3 │ 7m 30s   │ ✅ 完成     │
│ Task D      │ Worker 1 │ 3m 20s   │ ✅ 完成     │
│ Task F      │ Worker 2 │ 4m 15s   │ ✅ 完成     │
└─────────────┴──────────┴──────────┴─────────────┘

文件变更:
  新增: 8 个文件
  修改: 3 个文件
  删除: 0 个文件

性能统计:
  并行执行时间: 18m 22s
  串行预估时间: 42m 15s
  加速比: 2.3x
  并行效率: 76%

覆盖率:
  单元测试: 94%
  集成测试: 88%
  总体: 91%
```

---

## 配置

在 `stdd/memory/parallel-config.json` 中：

<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

```json
{
  "maxWorkers": 4,
  "strategy": "auto",
  "timeout": {
    "taskTimeout": 600000,
    "totalTimeout": 3600000
  },
  "retry": {
    "maxRetries": 2,
    "backoff": "exponential"
  },
  "conflictResolution": "prompt",
  "logging": {
    "level": "info",
    "progressBar": true
  }
}
```

---

> **引用**: 借鉴自 LangGraph 并行执行模式

## 与 /stdd-supervisor 的区别

| 维度 | /stdd-parallel (本 Skill) | /stdd-supervisor |
|------|---------------------------|-------------------|
| **协调层级** | 任务级（同一 Agent 内的子任务） | Agent 级（多个独立 Agent 进程） |
| **角色模型** | 无角色区分，同一执行体 | Planner/Coder/Tester/Reviewer 等专业角色 |
| **通信方式** | 共享文件系统 + 内存 | Agent 间消息传递 + 结果聚合 |
| **适用规模** | 中小型特性（5-15 个微任务） | 大型特性（需跨专业领域协作） |
| **错误隔离** | 任务间失败不影响其他任务 | Agent 间完全隔离，可独立重启 |

**选择指南**：
- 单一技术栈、任务间只差数据流 → `/stdd-parallel`
- 多技术栈（前端+后端+测试）、需要角色评审 → `/stdd-supervisor`
