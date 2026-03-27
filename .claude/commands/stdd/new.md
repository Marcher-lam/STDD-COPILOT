# /stdd:new - 创建新变更提案

创建一个新的 STDD 变更提案，系统将引导你完成需求收集和澄清过程。

## 使用方式

```
/stdd:new <需求描述>
```

## 执行流程

1. **创建变更目录** - 在 `stdd/changes/` 下创建新的变更目录
2. **生成提案文件** - 创建 `proposal.md` 包含需求描述
3. **启动澄清** - 自动进入需求澄清阶段
4. **状态标记** - 标记为 📝 待启动

## 生成的文件结构

```
stdd/
├── changes/
│   └── change-YYYYMMDD-HHMMSS/
│       ├── proposal.md      # 需求提案
│       ├── clarify.json     # 澄清记录
│       ├── confirm.md       # 确认文档
│       ├── specs/           # BDD 规格
│       ├── design/          # 设计文档
│       ├── tasks.md         # 任务列表
│       ├── apply.md         # 实现记录
│       └── status.yaml      # 状态追踪
```

## 示例

```
/stdd:new 实现一个支持 Markdown 导出的 todo-list

/stdd:new 优化用户认证流程，支持多因素认证

/stdd:new 重构数据访问层，使用 Repository 模式
```

## 下一步

- 运行 `/stdd:clarify` 进行需求澄清
- 或运行 `/stdd:ff` 快速生成所有产物
