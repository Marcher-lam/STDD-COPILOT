# Article 3: Small, Atomic Commits

> 每次提交应该是一个不可分割的、可独立理解和回滚的变更单元。

## 核心原则

1. **原子性原则**
   ```
   每个提交 = 一个逻辑变更
   - 一个功能
   - 一个修复
   - 一个重构
   - 一个文档更新
   ```

2. **提交粒度**
   ```
   ✅ 好的提交:
   - "feat: add user authentication"
   - "fix: resolve null pointer in payment"
   - "refactor: extract validation logic"

   ❌ 差的提交:
   - "update stuff"
   - "fix bugs"
   - "WIP"
   - "add feature A and B and fix C"
   ```

3. **提交时机**
   ```
   提交时机:
   - 🔴 红灯 → 不提交
   - 🟢 绿灯 → 可以提交 (最小实现)
   - 🔵 重构后 → 最佳提交时机
   ```

## 提交消息规范

### 格式

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### 类型定义

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | feat(auth): add OAuth2 login |
| `fix` | Bug 修复 | fix(api): handle null response |
| `refactor` | 重构 | refactor(user): extract validation |
| `test` | 测试 | test(cart): add edge cases |
| `docs` | 文档 | docs(api): update endpoint docs |
| `style` | 格式 | style: format with prettier |
| `chore` | 杂项 | chore: update dependencies |
| `perf` | 性能 | perf(query): optimize index |

### 提交消息模板

```bash
# 功能提交
feat(scope): 简短描述 (50字符内)

- 详细说明1
- 详细说明2

Refs: STDD-123

# 修复提交
fix(scope): 简短描述

问题: 描述问题
原因: 根本原因
修复: 解决方案

Fixes: #123
```

## 提交检查清单

```
提交前检查:
[ ] 所有测试通过
[ ] 代码已格式化
[ ] 无 lint 错误
[ ] 无敏感信息
[ ] 提交消息清晰
[ ] 变更可独立回滚
```

## Hook 验证

```bash
# Pre-commit Hook
if git diff --cached --name-only | grep -q "src/"; then
  # 检查测试
  if ! npm test; then
    echo "❌ 测试失败，无法提交"
    exit 1
  fi

  # 检查提交大小
  changes=$(git diff --cached --stat | tail -1)
  files=$(echo "$changes" | awk '{print $1}')

  if [ "$files" -gt 10 ]; then
    echo "⚠️ 提交文件过多 ($files)，考虑拆分"
  fi
fi
```

## 大变更拆分策略

```
大功能拆分为:
1. feat: add data model
2. feat: add repository layer
3. feat: add service layer
4. feat: add API endpoints
5. feat: add UI components
6. test: add integration tests
7. docs: add feature documentation
```

## 违规示例

```bash
# ❌ 差: 多功能混合
git commit -m "add user auth, fix payment bug, update docs"

# ✅ 好: 原子提交
git commit -m "feat(auth): add user authentication"
git commit -m "fix(payment): handle timeout gracefully"
git commit -m "docs(api): update authentication guide"
```

## STDD 集成

```bash
# 自动提交 (Ralph Loop 完成后)
/stdd:commit

# 手动操作 (使用标准 git 命令)
git commit --amend  # 修改上次提交
git add -p && git commit  # 拆分为多次原子提交
```

## 提交历史要求

```
理想的提交历史:
- 线性历史 (无 merge commits)
- 每个 commit 可独立 cherry-pick
- 每个 commit 可独立回滚
- bisect 友好
```
