# /stdd:ff - Fast-Forward 快速模式

按依赖顺序一次性生成四个核心产物，适合需求明确的场景。

## 使用方式

```
/stdd:ff [需求描述]
```

## 生成产物

按顺序自动生成:

| 顺序 | 产物 | 文件 | 说明 |
|------|------|------|------|
| 1 | proposal.md | 需求提案 | 结构化需求描述 |
| 2 | specs/*.feature | BDD 规格 | Given/When/Then 场景 |
| 3 | design.md | 设计文档 | 架构和接口设计 |
| 4 | tasks.md | 任务列表 | 原子化任务拆解 |

## 执行流程

```
proposal.md
    │
    ▼
specs/
    │
    ▼
design.md
    │
    ▼
tasks.md
```

## 状态流转

```
📝 待启动 → 📋 规格中 → 🎨 设计中 → 📝 任务就绪
```

## 示例

```
/stdd:ff 实现用户登录功能

/stdd:ff 添加文件上传组件，支持拖拽和多文件

/stdd:ff 优化首页加载性能，目标 LCP < 2.5s
```

## 注意事项

- 仅适用于**需求明确**的场景
- 如果需求模糊，建议使用 `/stdd:new` + `/stdd:clarify`
- 生成后可手动调整各产物
- 完成后运行 `/stdd:apply` 开始实现
