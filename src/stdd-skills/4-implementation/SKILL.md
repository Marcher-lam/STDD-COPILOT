---
description: TDD 实现循环 - Ralph Loop
version: "1.0"
---

# /stdd:apply - TDD 实现循环

执行 `tasks.md` 中定义的任务，遵循 Ralph Loop TDD 循环。

## 使用方式

```bash
/stdd:apply                    # 执行所有待办任务
/stdd:apply --task=TASK-001    # 执行特定任务
/stdd:apply --next             # 执行下一个任务
/stdd:apply --fix              # 修复失败的测试
```

## Ralph Loop (TDD 循环)

```
┌─────────────────────────────────────────────────────────────┐
│                      Ralph Loop                              │
│                                                              │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐               │
│  │ 🔴 RED  │────►│ 🔍 CHECK│────►│ 🟢 GREEN│               │
│  │ 写失败  │     │ 静态检查│     │ 最小实现│               │
│  │ 测试    │     │         │     │         │               │
│  └─────────┘     └─────────┘     └─────────┘               │
│       │                               │                     │
│       │                               ▼                     │
│       │                         ┌─────────┐                │
│       │                         │ 🧪 MUT. │                │
│       │                         │ 变异测试│                │
│       │                         └─────────┘                │
│       │                               │                     │
│       │                               ▼                     │
│       │                         ┌─────────┐                │
│       │                         │ 🔵 REFACT│                │
│       │                         │ 重构优化│                │
│       │                         └─────────┘                │
│       │                               │                     │
│       └───────────────────────────────┘                     │
│                    循环直到所有测试通过                       │
│                                                              │
│  ⚠️ 连续失败 3 次 → 熔断 (手动 git stash 回退)               │
└─────────────────────────────────────────────────────────────┘
```

## 执行流程

### 1. 红灯阶段 (RED)
```
1. 读取下一个未完成任务
2. 分析任务需求
3. 生成失败测试用例
4. 确认测试失败 (红灯)
```

### 2. 静态检查 (CHECK)
```
1. 语法检查 (ESLint/TSLint)
2. 类型检查 (tsc --noEmit)
3. 代码规范检查
4. 如有错误，修复后重试
```

### 3. 绿灯阶段 (GREEN)
```
1. 编写最小实现
2. 运行测试
3. 确认测试通过 (绿灯)
4. 如失败，返回修改
```

### 4. 变异审查 (MUTATION)
```
1. 伪修改代码
2. 运行测试
3. 确认测试失败 (检测骗绿灯)
4. 恢复代码
```

### 5. 重构阶段 (REFACTOR)
```
1. 检查代码质量
2. 优化结构
3. 消除重复
4. 确认测试仍通过
```

## 任务状态

| 状态 | 标识 | 说明 |
|------|------|------|
| 待办 | `[ ]` | 未开始 |
| 进行中 | `[🔄]` | 正在执行 |
| 完成 | `[x]` | 已完成 |
| 阻塞 | `[⚠️]` | 需要帮助 |
| 跳过 | `[~]` | 已跳过 |

## 5 级防跑偏

| 级别 | 机制 | 触发条件 |
|------|------|----------|
| 1 | 人机确认门 | 关键决策点 |
| 2 | 微任务隔离 | 任务 > 6 个时警告 |
| 3 | 连续失败回滚 | 失败 ≥ 3 次 |
| 4 | 静态质检门 | 每次实现前 |
| 5 | 伪变异审查 | 测试通过后 |

## 示例输出

```
🔧 /stdd:apply - Task Execution

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: TASK-001 - Create TodoService

🔴 RED: Generating failing test...
   Created: src/__tests__/TodoService.test.ts
   Test result: FAIL (expected)

🔍 CHECK: Static analysis...
   ✓ TypeScript: No errors
   ✓ ESLint: No warnings

🟢 GREEN: Implementing...
   Modified: src/services/TodoService.ts
   Test result: PASS ✓

🧪 MUTATION: Checking for fake-green...
   Mutation: change return [] to [{}]
   Test result: FAIL (correctly detected) ✓

🔵 REFACTOR: Optimizing...
   No refactoring needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Task TASK-001 completed

Progress: [x] [ ] [ ] [ ] (1/4 tasks)

Next: /stdd:apply --next
```

## 熔断机制

```
⚠️ FUSE TRIGGERED

Task TASK-003 has failed 3 times consecutively.

Possible causes:
- Specification ambiguity
- Missing dependencies
- Incorrect approach

Actions:
1. Review the task and design
2. Run /stdd:clarify to refine requirements
3. Update design.md if approach needs change
4. Reset with `git stash` and try again

Manual intervention recommended.
```

## 命令选项

| 选项 | 说明 |
|------|------|
| `--task=ID` | 执行特定任务 |
| `--next` | 执行下一个任务 |
| `--fix` | 修复失败的测试 |
| `--no-mutation` | 跳过变异测试 |
| `--no-refactor` | 跳过重构 |
| `--dry-run` | 仅显示计划 |

## 与其他命令的集成

```
/stdd:apply
    │
    ├──► /stdd:verify  (验证实现与规格一致)
    │
    ├──► /stdd:metrics (查看质量指标)
    │
    └──► /stdd:archive (归档变更)
```
