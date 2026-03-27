# /stdd:continue - 继续生成下一个产物

根据当前状态，自动识别并生成下一个产物。

## 使用方式

```
/stdd:continue
```

## 状态机

```
proposal.md ──► specs/ ──► design.md ──► tasks.md ──► apply.md ──► archive.md
     │              │             │             │            │            │
     ▼              ▼             ▼             ▼            ▼            ▼
  [待启动]      [规格中]      [设计中]      [任务就绪]    [实现中]     [已完成]
```

## 产物生成顺序

| 当前状态 | 下一个产物 | 前置条件 |
|----------|------------|----------|
| proposal.md 完成 | specs/*.feature | 需求已确认 |
| specs 完成 | design.md | 场景已定义 |
| design.md 完成 | tasks.md | 设计已评审 |
| tasks.md 完成 | apply.md | 任务已拆解 |
| apply.md 完成 | archive.md | 实现已验证 |

## 智能检测

系统会自动检测:
- 当前变更目录
- 已完成的产物
- 下一步应该生成什么

## 示例

```
# 刚创建提案
/stdd:new 用户登录
# 继续 → 生成规格
/stdd:continue
# 继续 → 生成设计
/stdd:continue
# 继续 → 生成任务
/stdd:continue
```

## 与 /stdd:ff 的区别

- `/stdd:ff` - 一次性生成所有产物
- `/stdd:continue` - 逐步生成，允许中间干预调整
