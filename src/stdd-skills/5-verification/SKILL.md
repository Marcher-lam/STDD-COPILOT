---
description: 归档变更 - 完成并归档变更
version: "1.0"
---

# /stdd:archive - 归档变更

完成变更并将其归档，合并 delta specs 到主 specs。

## 使用方式

```bash
/stdd:archive                  # 归档当前变更
/stdd:archive --change=xxx     # 归档指定变更
/stdd:archive --all-completed  # 归档所有完成的变更
/stdd:archive --force          # 强制归档 (跳过验证)
```

## 执行流程

```
┌─────────────────────────────────────────────────────────────┐
│                    /stdd:archive 流程                       │
│                                                             │
│  1. 验证状态                                                │
│     ├── 所有任务已完成                                      │
│     ├── 测试全部通过                                        │
│     └── 无未解决的阻塞                                      │
│                                                             │
│  2. 合并 Delta Specs                                        │
│     ├── ADDED → 追加到主 spec                              │
│     ├── MODIFIED → 替换现有需求                            │
│     └── REMOVED → 删除对应需求                              │
│                                                             │
│  3. 生成归档摘要                                            │
│     └── archive.md                                          │
│                                                             │
│  4. 移动到归档目录                                          │
│     stdd/changes/archive/YYYY-MM-DD-{change-id}/           │
│                                                             │
│  5. 更新状态                                                │
│     📦 已完成                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 归档前检查

```
✅ Pre-Archive Checklist

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Tasks
  ✅ All tasks completed
  ✅ No blocked tasks

🧪 Tests
  ✅ Unit tests: 12/12 passed
  ✅ Integration tests: 3/3 passed
  ✅ E2E tests: 2/2 passed

📊 Quality
  ✅ Code coverage: 92%
  ✅ Mutation score: 85%
  ✅ TypeScript: No errors
  ✅ ESLint: No warnings

📝 Specs
  ✅ Delta specs validated
  ✅ No merge conflicts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to archive? [Y/n]
```

## Delta Specs 合并规则

### ADDED Requirements

```markdown
# Before (main spec)
## Requirements
### Requirement: Login
...

# Delta spec
## ADDED Requirements
### Requirement: Two-Factor Auth
...

# After merge
## Requirements
### Requirement: Login
...
### Requirement: Two-Factor Auth
...
```

### MODIFIED Requirements

```markdown
# Before (main spec)
### Requirement: Session Expiration
The system SHALL expire sessions after 60 minutes.

# Delta spec
## MODIFIED Requirements
### Requirement: Session Expiration
The system SHALL expire sessions after 30 minutes.
(Previously: 60 minutes)

# After merge
### Requirement: Session Expiration
The system SHALL expire sessions after 30 minutes.
```

### REMOVED Requirements

```markdown
# Before (main spec)
### Requirement: Remember Me
The system SHALL allow users to enable "Remember Me".

# Delta spec
## REMOVED Requirements
### Requirement: Remember Me
(Deprecated in favor of 2FA)

# After merge
(该需求被删除)
```

## archive.md 模板

```markdown
# Archive: [变更标题]

## Metadata
| Field | Value |
|-------|-------|
| Change ID | change-20260327-143052 |
| Archived | 2026-03-27 15:30:00 |
| Duration | 2h 15m |
| Status | 📦 Completed |

## Summary
[变更的简短摘要，1-2 句话]

## Scope
### In Scope
- [功能 1]
- [功能 2]

### Out of Scope
- [排除项 1]

## Tasks Completed
- [x] TASK-001: Create infrastructure
- [x] TASK-002: Implement core logic
- [x] TASK-003: Add UI components
- [x] TASK-004: Write tests

## Files Changed
| File | Action |
|------|--------|
| src/services/AuthService.ts | CREATED |
| src/api/auth.ts | MODIFIED |
| src/types/auth.ts | MODIFIED |

## Quality Metrics
| Metric | Value |
|--------|-------|
| Test Coverage | 92% |
| Mutation Score | 85% |
| Files Changed | 8 |
| Lines Added | 342 |
| Lines Removed | 45 |

## Lessons Learned
- [学到的经验 1]
- [学到的经验 2]

## Related Changes
- change-20260325-auth-setup (前置变更)

## References
- Spec: stdd/specs/auth/spec.md
- Design: design.md
```

## 示例输出

```
📦 Archiving: add-dark-mode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Pre-archive validation passed

📋 Merging delta specs...
   ADDED: 3 requirements
   MODIFIED: 1 requirement
   REMOVED: 0 requirements

📄 Generating archive summary...
   Created: archive.md

📁 Moving to archive...
   From: stdd/changes/add-dark-mode/
   To: stdd/changes/archive/2026-03-27-add-dark-mode/

📊 Updated main spec:
   stdd/specs/ui/spec.md
   +45 lines, -0 lines

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Change archived successfully!

Next: /stdd:new [下一个需求]
```

## 归档目录结构

```
stdd/changes/archive/
├── 2026-03-25-auth-setup/
│   ├── proposal.md
│   ├── specs/
│   ├── design.md
│   ├── tasks.md
│   ├── apply.log
│   └── archive.md
├── 2026-03-26-user-profile/
│   └── ...
└── 2026-03-27-add-dark-mode/
    └── ...
```

## 恢复归档

如果需要恢复或审查归档的变更：

```bash
# 查看归档列表
/stdd:graph history --archived

# 查看归档详情
/stdd:graph show 2026-03-27-add-dark-mode

# 重新应用归档 (谨慎使用)
/stdd:graph replay 2026-03-27-add-dark-mode --restore
```

## 注意事项

1. **归档是不可逆的** - 归档后变更从活跃列表移除
2. **Spec 合并自动进行** - 确保 delta specs 格式正确
3. **保留完整历史** - 所有产物在归档中保留
4. **验证先于归档** - 默认需要通过所有验证

## 相关命令

| 命令 | 说明 |
|------|------|
| `/stdd:verify` | 验证实现与规格一致性 |
| `/stdd:graph history` | 查看执行历史 |
| `/stdd:graph replay` | 回放历史执行 |
