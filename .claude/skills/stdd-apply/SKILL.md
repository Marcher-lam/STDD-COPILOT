---
name: stdd-apply
description: |
  开始实现（基于最终需求文档）。
  触发场景：用户说 '/stdd-apply', 'stdd apply', '开始实现', 'STDD实现', 'stdd apply'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 开始实现向导 (/stdd-apply)

目标：在需求文档和任务清单就绪后，编排实现流程：解析需求 → 调用代码生成 → 启动 TDD 循环。

## 前置条件

- `tasks.md` 已生成且包含可执行任务
- `contracts.md`（或共享类型文件）已存在

## 执行步骤

### 1. 检查任务清单

确认 `tasks.md` 存在且包含未勾选的 `[ ]` 任务。若所有任务已勾选 `[x]`，提示用户运行 `/stdd:verify`。

### 2. 解析需求上下文

读取以下文件拼装实现输入：
- **原始需求** — `proposal.md`
- **BDD 规格** — `specs/*.feature`
- **架构设计** — `design.md`
- **任务清单** — `tasks.md`
- **接口契约** — `contracts.md`

将上述内容合并为 `implementation_context.md`，供 TDD 循环的每个微任务作为参考。

### 3. 启动 Ralph Loop

自动调用 `/stdd:execute`，进入严格的 TDD 执行闭环。

此时按 `tasks.md` 的任务顺序，逐个执行：
- 每个任务遵循 Ralph Loop 五步流程
- 每完成一个任务打勾 `[x]`
- 遇到熔断暂停并提示用户

### 4. 记录实现日志

在 `implementation_log.md` 中追加：

```markdown
## 实现日志

### 启动时间
<timestamp>

### 涉及任务
- TASK-001: 创建数据模型与契约类型 ✅
- TASK-002: 实现 IndexedDB 存储层 ✅
- ...

### 关键里程碑
- [时间] TASK-001 红灯完成
- [时间] TASK-001 绿灯完成
- [时间] TASK-003 熔断（用户介入后恢复）
- [时间] 全部任务完成
```

### 5. 结束提示

输出实现完成的提示和后续指令：

```
✅ 实现已完成！

后续步骤:
  /stdd:verify      验证规范一致性
  /stdd:final-doc   生成最终需求文档
  /stdd:archive     归档变更
```

## 选项

| 选项 | 说明 |
|------|------|
| `--task=TASK-003` | 只执行特定任务 |
| `--next` | 执行下一个未完成任务 |
| `--fix` | 修复上次失败的任务 |
| `--dry-run` | 只输出执行计划，不实际运行 |

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| tasks.md 不存在 | 报错，提示先运行 `/stdd:plan` |
| 部分任务已完成 | 从第一个未勾选任务继续 |
| 用户中断 | 保存进度，可随时用 `/stdd:apply` 继续 |
| 全部任务已完成 | 跳过实现，直接提示验证 |

## 与其他 Skill 的关系

```
/stdd-plan ──► /stdd-apply ──► /stdd:verify
```
