---
name: stdd-commit
description: |
  归档特性，完成防范围溢漏审查，原子化提交。
  触发场景：用户说 '/stdd-commit', 'stdd commit', '提交代码', 'STDD提交', 'stdd commit'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 文档闭环与原子规范提交 (/stdd-commit)

目标：杜绝屎山堆积。每次大特性落幕必须严格归档和规范化提交。

## 前置条件

- 所有 `tasks.md` 中的任务已勾选 `[x]`
- 测试全部通过

## 执行步骤

### 1. 防溢出审查（Scope Leak Detection）

将实际落地产物集同最初规划的 `specs/*.feature` 进行逆向比对：

**检查维度**：
| 检查项 | 规则 |
|--------|------|
| 多余功能 | 实现了 BDD 规格中不存在的功能 → 警告 |
| 遗漏功能 | BDD 规格中有但未实现 → 阻断 |
| 超纲复杂度 | 实现中存在规格未要求的抽象层/中间件 → 警告 |

**输出**：
```
🔍 防溢出审查报告:
  ✅ 5/5 BDD 场景已实现
  ⚠️ 1 个警告: src/utils/cache.ts (规格中未要求缓存层)
  ❌ 0 个遗漏
```

若有遗漏 → 阻断提交，提示用户回到 `/stdd:apply` 补全。

### 2. 全局记忆更新

将本次特性引入的最新组件/系统架构更新进核心记忆库：

- `stdd/memory/components.md` — 新增组件和依赖关系
- `stdd/memory/foundation.md` — 更新技术栈和约束

**目的**：保证以后开发记忆不会断层，新特性成为后续开发的"既有事实"。

### 3. 原子化 Git 归档

扫描 `git diff`，基于 STDD 的纯绿色记录，**强制分为若干小份提交**：

**提交拆分策略**：
```bash
# 1. 测试文件
git add '__tests__/**' 'src/**/*.test.*' 'src/**/*.spec.*'
git commit -m "test: add tests for <功能名>"

# 2. 核心实现
git add 'src/services/**' 'src/utils/**' 'src/types/**'
git commit -m "feat: implement <功能名> core logic"

# 3. UI/表现层
git add 'src/components/**' 'src/pages/**'
git commit -m "feat: add <功能名> UI components"

# 4. 规格与文档
git add 'stdd/**'
git commit -m "docs: add STDD artifacts for <功能名>"
```

**Commit Message 规范**（Conventional Commits + TDD Phase Prefix）：

常规 Conventional Commits:
- `test:` 测试相关
- `feat:` 新功能
- `fix:` Bug 修复
- `refactor:` 重构
- `docs:` 文档
- `chore:` 构建/工具

**TDD Phase Prefix**（参考 TDG）：

Ralph Loop 的每个提交**强制使用阶段前缀 + issue 编号**：

```bash
# Red 阶段提交 - 写了失败测试
git commit -m "red: add failing test for TodoService.create #42"

# Green 阶段提交 - 最小实现让测试通过
git commit -m "green: implement TodoService.create minimal logic #42"

# Refactor 阶段提交 - 优化代码结构
git commit -m "refactor: extract validation logic from TodoService #42"

# 修复阶段提交 - Bug 修复
git commit -m "fix: handle edge case for empty title in TodoService #42"
```

**阶段前缀规则**：

| 前缀 | 阶段 | 格式 | 必须 issue 编号 |
|------|------|------|---------------|
| `red:` | Red 阶段 | `red: <描述> #<issue>` | 是 |
| `green:` | Green 阶段 | `green: <描述> #<issue>` | 是 |
| `refactor:` | Refactor 阶段 | `refactor: <描述> #<issue>` | 是 |
| `fix:` | Bug 修复 | `fix: <描述> #<issue>` | 否（已有修复) |
| `test:` | 补充测试 | `test: <描述> #<issue>` | 否(非 Ralph Loop) |
| `feat:` | 非阶段提交 | `feat: <描述>` | 否(跳过 TDD) |
| `docs:` | 文档 | `docs: <描述>` | 否 |

**TDD 审计追溯**：

```bash
# 查看某功能的 TDD 提交历史
git log --oneline --grep="red:\|green:\|refactor:" -- features/TodoService

# 输出:
# abc1234 red: add failing test for TodoService.create #42
# abc1235 green: implement TodoService.create minimal logic #42
# abc1236 refactor: extract validation logic from TodoService #42
```

这确保每个功能的 TDD 过程有完整的 git 历史可追溯。

### 4. 归档变更

将变更目录移至归档：

```bash
mv stdd/changes/<change-name> stdd/changes/archive/<change-name>
```

更新 `stdd/changes/archive/<change-name>/status.yaml`：
```yaml
status: completed
completed_at: "<timestamp>"
git_commits:
  - "<commit-hash-1>"
  - "<commit-hash-2>"
```

### 5. 结束

```
🎉 特性归档完成！

提交记录:
  <hash-1> test: add tests for todo-list
  <hash-2> feat: implement todo-list core logic
  <hash-3> feat: add todo-list UI components
  <hash-4> docs: add STDD artifacts for todo-list

记忆已更新: components.md, foundation.md
归档位置: stdd/changes/archive/<change-name>
```

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| 有未暂存的修改 | 提示用户处理后再提交 |
| 测试未全部通过 | 阻断提交，提示回到 `/stdd:apply` |
| 无 git 仓库 | 跳过 git 操作，只做归档 |
| 用户想一次提交 | 警告但不阻断，执行单次 commit |

## 与其他 Skill 的关系

```
/stdd-final-doc ──► /stdd-commit ──► (完成)
```
