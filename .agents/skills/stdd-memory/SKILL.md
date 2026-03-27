---
description: 向量数据库记忆系统 - 语义搜索与跨会话上下文保持
---

# STDD 向量数据库记忆系统 (/stdd-memory)

## 目标
使用向量数据库存储项目知识，实现语义搜索历史决策、跨会话上下文保持和知识库构建。

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    STDD Memory System                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │   Ingest     │───▶│   Embed      │───▶│    Store     │  │
│   │   (摄取)     │    │   (嵌入)     │    │   (存储)     │  │
│   └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                    │         │
│                                                    ▼         │
│                                            ┌──────────────┐  │
│   ┌──────────────┐    ┌──────────────┐    │    Query     │  │
│   │    Result    │◀───│    Rank      │◀───│    (查询)    │  │
│   │   (结果)     │    │   (排序)     │    │              │  │
│   └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 存储内容

### 1. 决策记录 (Decision Records)
```json
{
  "id": "dr-2026-03-27-001",
  "type": "decision",
  "content": "选择 IndexedDB 而非 localStorage 进行离线存储，因为支持更大的存储容量和异步操作",
  "metadata": {
    "feature": "todo-persistence",
    "timestamp": "2026-03-27T10:00:00Z",
    "impact": ["storage", "offline-support"]
  },
  "embedding": [0.1, 0.2, 0.3, ...]
}
```

### 2. 代码片段 (Code Snippets)
```json
{
  "id": "cs-2026-03-27-001",
  "type": "code_snippet",
  "content": "export function exportMarkdown(todos: Todo[]): string { ... }",
  "metadata": {
    "language": "typescript",
    "function": "exportMarkdown",
    "testCoverage": 95
  },
  "embedding": [0.4, 0.5, 0.6, ...]
}
```

### 3. 错误解决方案 (Error Solutions)
```json
{
  "id": "es-2026-03-27-001",
  "type": "error_solution",
  "content": "TypeError: Cannot read property 'id' of undefined - 解决方案: 添加 null 检查",
  "metadata": {
    "errorType": "TypeError",
    "file": "TodoService.ts",
    "line": 42,
    "resolvedAt": "2026-03-27T10:15:00Z"
  },
  "embedding": [0.7, 0.8, 0.9, ...]
}
```

### 4. 模式知识 (Pattern Knowledge)
```json
{
  "id": "pk-2026-03-27-001",
  "type": "pattern",
  "content": "Repository Pattern: 将数据访问逻辑与业务逻辑分离",
  "metadata": {
    "patternType": "architectural",
    "useCase": "data-access",
    "complexity": "medium"
  },
  "embedding": [1.0, 1.1, 1.2, ...]
}
```

---

## 使用方式

### 存储记忆
```bash
# 自动存储 (在 stdd-commit 时自动调用)
/stdd-memory save

# 手动存储特定内容
/stdd-memory save "选择 React Query 进行数据获取，因为它提供了自动缓存和重新获取功能"
```

### 查询记忆
```bash
# 语义搜索
/stdd-memory search "如何处理离线数据存储"

# 查找相似问题
/stdd-memory find-similar "TypeError: Cannot read property"

# 获取上下文
/stdd-memory context "实现用户认证"
```

### 管理记忆
```bash
# 查看统计
/stdd-memory stats

# 清理过期记忆
/stdd-memory prune --older-than=30d

# 导出记忆
/stdd-memory export --format=json > memory_backup.json
```

---

## 查询示例

### 语义搜索
```bash
/stdd-memory search "如何实现数据导出功能"
```

输出:
```
🔍 搜索结果: "如何实现数据导出功能"

相关性: 95%
📄 决策记录: 选择纯前端生成 Markdown 而非后端 API
   时间: 2026-03-15
   原因: 减少服务器负载，提升响应速度

相关性: 87%
📄 代码片段: exportMarkdown 函数实现
   文件: src/utils/markdown.ts
   覆盖率: 95%

相关性: 82%
📄 模式知识: Export Strategy Pattern
   类型: 设计模式
   适用场景: 多格式导出
```

### 查找相似错误
```bash
/stdd-memory find-similar "TypeError: Cannot read property 'map' of undefined"
```

输出:
```
🔗 相似错误: 3 个

1. ⚠️ TypeError: Cannot read property 'id' of undefined
   解决方案: 添加 null 检查
   应用文件: TodoService.ts:42
   解决时间: 2 分钟

2. ⚠️ TypeError: Cannot read property 'filter' of undefined
   解决方案: 使用可选链 arr?.filter
   应用文件: ExportService.ts:15
   解决时间: 1 分钟

3. ⚠️ TypeError: Cannot read property 'length' of undefined
   解决方案: 默认值 str?.length ?? 0
   应用文件: StringUtils.ts:8
   解决时间: 1 分钟

💡 建议修复: 添加可选链操作符或 null 检查
```

---

## 与 STDD 工作流集成

```
/stdd-init
    │
    └──► 初始化向量数据库 (创建 .stdd/memory/vectors/)

/stdd-clarify
    │
    └──► 查询历史决策 (避免重复讨论)
        /stdd-memory search "相关技术选型"

/stdd-execute
    │
    ├──► 遇到错误时
    │       │
    │       └──► /stdd-memory find-similar "<error>"
    │               │
    │               └──► 返回历史解决方案

/stdd-commit
    │
    └──► 自动存储本次会话的关键决策
        /stdd-memory save
```

---

## 配置文件

在 `.stdd/memory/memory-config.json` 中：

```json
{
  "provider": "local",
  "embeddingModel": "text-embedding-3-small",
  "dimensions": 1536,
  "similarityThreshold": 0.75,
  "maxResults": 5,
  "retention": {
    "decision": "permanent",
    "error_solution": "90d",
    "code_snippet": "180d",
    "pattern": "permanent"
  },
  "indexing": {
    "autoIndex": true,
    "indexOnCommit": true,
    "batchSize": 100
  }
}
```

---

## 存储后端

### 本地文件存储 (默认)
```
.stdd/memory/vectors/
├── index.faiss      # FAISS 索引文件
├── metadata.db      # SQLite 元数据库
└── embeddings.npy   # 向量矩阵
```

### 外部存储 (可选)
- **Pinecone**: 云端向量数据库
- **Weaviate**: 开源向量搜索引擎
- **Chroma**: 轻量级嵌入式向量数据库

---

## 性能优化

### 批量索引
```bash
# 批量索引整个项目
/stdd-memory index --path=src --recursive
```

### 增量更新
```bash
# 只索引变更的文件
/stdd-memory index --incremental
```

### 缓存策略
- **查询缓存**: 缓存热门查询结果
- **嵌入缓存**: 缓存已计算的向量
- **预加载**: 启动时预加载常用上下文

---

## 示例输出

```
📚 STDD Memory System

📊 统计信息:
  总条目: 156
  ├─ 决策记录: 45
  ├─ 代码片段: 62
  ├─ 错误解决方案: 28
  └─ 模式知识: 21

📈 存储使用:
  向量数据库: 12.5 MB
  元数据库: 1.2 MB
  总计: 13.7 MB

🔍 最近查询:
  1. "离线存储方案" (95% 相关)
  2. "TypeError null 检查" (87% 相关)
  3. "React 状态管理" (82% 相关)

💡 建议:
  - 发现 3 个相似错误，建议提取为通用模式
  - 5 个决策记录超过 30 天未更新，建议复核
```

---

> **引用**: 借鉴自 AutoGPT 向量数据库记忆模式
