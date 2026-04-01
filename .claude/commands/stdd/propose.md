# /stdd:propose - 提出需求提案

提出新特性需求草案并进行边界澄清，消除需求模糊地带。

## 使用方式

```
/stdd:propose <需求描述>
```

## 执行流程

1. **Epic 探测** - 分析需求粒度，拦截超大 Epic 级任务，要求切分为小故事
2. **边界澄清** - 找出边缘用例（并发、异常状态、性能约束），提出最多 2 个补全 QA
3. **生成草案** - 将需求写入 `stdd/changes/<change>/proposal.md`
4. **状态标记** - 标记变更为 📝 待启动

## 示例

```
/stdd:propose 实现一个支持 Markdown 导出的 todo-list

/stdd:propose 添加用户登录功能，支持邮箱和手机号
```

## 下一步

- 运行 `/stdd:clarify` 进行多轮需求澄清
- 或运行 `/stdd:ff` 快速生成所有产物
