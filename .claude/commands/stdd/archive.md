# /stdd:archive - 归档变更

完成并归档变更，更新主规格文件。

## 使用方式

```
/stdd:archive                     # 归档当前变更
/stdd:archive --change=change-id  # 归档指定变更
/stdd:archive --all-completed     # 役所有完成的变更
/stdd:archive --force             # 强制归档（跳过验证）
```

## 归档流程

```
┌──────────────────────────────────────────────────────┐
│                    归档流程                           │
│                                                     │
│  1. 运行验证 /stdd:verify                            │
│       │                                             │
│       ▼                                             │
│  2. 同步规格 sync → stdd/specs/                     │
│       │                                             │
│       ▼                                             │
│  3. 生成总结 archive.md                             │
│       │                                             │
│       ▼                                             │
│  4. 移动到 archive/                                 │
│       │                                             │
│       ▼                                             │
│  5. 状态更新 → 📦 已完成                             │
│                                                     │
└──────────────────────────────────────────────────────┘
```

## 归档产物

```
stdd/
├── changes/
│   └── archive/
│       └── change-YYYYMMDD-HHMMSS/
│           ├── proposal.md      # 原始提案
│           ├── specs/           # 规格文件
│           ├── design.md        # 设计文档
│           ├── tasks.md         # 任务列表
│           ├── apply.md         # 实现记录
│           └── archive.md       # 归档总结 (新增)
└── specs/
    └── feature/
        └── merged-specs.feature  # 合并后的主规格
```

## archive.md 内容

```markdown
# 归档: [变更标题]

## 概述
[变更的简要描述]

## 完成任务
- [x] TASK-001: ...
- [x] TASK-002: ...
- [x] TASK-003: ...

## 产出文件
- src/services/AuthService.ts
- src/__tests__/auth.test.ts
- docs/auth-flow.md

## 验证结果
- 测试覆盖率: 95%
- 规范一致性: 100%
- 代码质量评分: 92/100

## 经验总结
- [学到的经验1]
- [学到的经验2]

## 归档时间
2026-03-27 14:35:22
```

## 状态流转

```
🚀 实现中 → ✅ 验证通过 → 📦 已归档
```
