---
name: stdd-context
description: |
  三层文档架构 - Foundation/Component/Feature 层级优化 Token 使用
  触发场景：用户说 '/stdd-context', 'context', '上下文', '文档架构', '加载上下文'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---
# STDD 三层文档架构 (/stdd-context)

## 目标
通过分层文档架构优化 Token 使用，实现渐进式上下文加载，避免单次对话加载过多无关信息。

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Layer 0: Foundation                    │
│  (永久性、技术栈无关的约束)                                    │
│  文件: stdd/memory/foundation.md                            │
│  加载时机: 项目初始化时 /stdd-init                            │
│  Token 占用: ~500                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Layer 1: Component                     │
│  (组件拓扑、模块依赖、共享契约)                                 │
│  文件: stdd/memory/components.md + contracts.md            │
│  加载时机: 涉及跨模块变更时                                    │
│  Token 占用: ~1000                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Layer 2: Feature                       │
│  (当前功能特化的上下文)                                        │
│  文件: stdd/active_feature/*                                │
│  加载时机: 执行当前功能任务时                                  │
│  Token 占用: ~2000                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 层级定义

### Layer 0: Foundation (基础层)
**永久性约束，全局生效**

```markdown
# Foundation 文档

## 技术栈
- 前端: React 18 + TypeScript 5
- 后端: Node.js 20 + Express
- 数据库: PostgreSQL 15
- 测试: Vitest + Playwright

## 代码规范
- ESLint: @typescript-eslint/recommended
- Prettier: 默认配置
- 提交规范: Conventional Commits

## 测试策略
- 单元测试: Vitest
- 集成测试: Vitest + supertest
- E2E 测试: Playwright
- 覆盖率要求: >= 80%

## 禁止事项
- 禁止使用 any 类型
- 禁止跳过测试
- 禁止直接操作 DOM (使用 React 方法)

## CLI 命令模板
- 单元测试: pnpm vitest run {file}
- 类型检查: pnpm tsc --noEmit
- Lint: pnpm eslint {file}
```

### Layer 1: Component (组件层)
**模块拓扑与接口契约**

```markdown
# Component 文档

## 组件拓扑

\`\`\`
src/
├── components/       # UI 组件
│   ├── TodoList/
│   └── ExportButton/
├── services/         # 业务逻辑
│   ├── TodoService
│   └── ExportService
├── stores/           # 状态管理
│   └── todoStore
└── utils/            # 工具函数
    └── markdown
\`\`\`

## 模块依赖图

\`\`\`
TodoList → TodoService → todoStore
ExportButton → ExportService → TodoService
\`\`\`

## 接口契约 (contracts.md 引用)

### TodoService
\`\`\`typescript
interface TodoService {
  getAll(): Promise<Todo[]>;
  add(title: string): Promise<Todo>;
  toggle(id: string): Promise<void>;
  remove(id: string): Promise<void>;
}
\`\`\`

### ExportService
\`\`\`typescript
interface ExportService {
  exportMarkdown(todos: Todo[]): string;
  download(content: string, filename: string): void;
}
\`\`\`
```

### Layer 2: Feature (功能层)
**当前功能的完整上下文**

```markdown
# Feature 文档: Markdown 导出功能

## PRP 摘要
- What: 用户可将 Todo 列表导出为 Markdown
- Why: 便于分享和文档记录
- How: 前端生成 + 下载

## BDD 规格
Feature: Todo Markdown Export
  Scenario: 导出空列表
    Given 用户有 0 个 Todo
    When 用户点击导出
    Then 生成空 Markdown 文件

  Scenario: 导出包含完成的 Todo
    Given 用户有 3 个 Todo，其中 2 个已完成
    When 用户点击导出
    Then Markdown 包含 2 个已勾选项和 1 个未勾选项

## 任务列表
- [ ] 创建 ExportButton 组件
- [ ] 实现 ExportService.exportMarkdown
- [ ] 实现 ExportService.download
- [ ] 编写单元测试
- [ ] 编写 E2E 测试

## 相关文件
- src/components/ExportButton/index.tsx
- src/services/ExportService.ts
- src/__tests__/ExportService.test.ts

## 当前状态
- 阶段: Green (实现中)
- 进度: 2/5
- 下一步: 实现 ExportService.download
```

---

## 渐进式加载策略

### 策略 1: 按需加载
```javascript
// 根据任务类型决定加载哪些层
function determineContextLayers(task) {
  const layers = ['foundation']; // 总是加载基础层

  if (task.involvesMultipleModules) {
    layers.push('component');
  }

  if (task.isFeatureSpecific) {
    layers.push('feature');
  }

  return layers;
}
```

### 策略 2: 智能裁剪
```javascript
// 根据可用 Token 裁剪上下文
function trimContext(context, maxTokens) {
  if (context.tokenCount <= maxTokens) {
    return context;
  }

  // 优先保留: Foundation > Feature > Component
  // 裁剪顺序: Component > Feature > Foundation

  return trimByPriority(context, maxTokens);
}
```

### 策略 3: 缓存复用
```javascript
// 跨会话缓存基础层
const contextCache = {
  foundation: null,  // 永久缓存
  component: null,   // 变更时失效
  feature: null      // 每个功能重置
};
```

---

## 使用方式

### 查看当前上下文
```bash
/stdd-context show
```

输出:
```
📚 当前上下文层级:

Layer 0: Foundation ✅ (已加载)
  - foundation.md (498 tokens)

Layer 1: Component ✅ (已加载)
  - components.md (512 tokens)
  - contracts.md (488 tokens)

Layer 2: Feature ✅ (已加载)
  - 00_prp.md (234 tokens)
  - 02_bdd_specs.feature (456 tokens)
  - 04_tasks.md (178 tokens)

📊 总计: 2366 tokens
```

### 刷新特定层
```bash
/stdd-context refresh foundation
/stdd-context refresh component
/stdd-context refresh feature
```

### 清除缓存
```bash
/stdd-context clear
```

### 导出上下文
```bash
# 导出完整上下文
/stdd-context export --full > context.md

# 导出特定层
/stdd-context export --layer=foundation > foundation.md
```

---

## Token 预算分配

| 场景 | Foundation | Component | Feature | 总预算 | 剩余 |
|------|------------|-----------|---------|--------|------|
| 简单 Bug 修复 | ✅ 500 | ❌ | ❌ | 4000 | 3500 |
| 单模块功能 | ✅ 500 | ⚠️ 300 | ✅ 1500 | 4000 | 1700 |
| 跨模块功能 | ✅ 500 | ✅ 1000 | ✅ 1500 | 4000 | 1000 |
| 大型重构 | ✅ 500 | ✅ 1000 | ⚠️ 1000 | 4000 | 1500 |

图例:
- ✅ 完整加载
- ⚠️ 裁剪加载
- ❌ 不加载

---

## 与 STDD 工作流集成

```
/stdd-init
    │
    └──→ 生成 Layer 0: foundation.md

/stdd-plan
    │
    ├──→ 更新 Layer 1: components.md
    ├──→ 更新 Layer 1: contracts.md
    │
    └──→ 生成 Layer 2: 00_prp.md, 02_bdd_specs.feature, 04_tasks.md

/stdd-execute
    │
    └──→ 加载 Layer 0 + Layer 2 (按需加载 Layer 1)
        每个微任务只加载相关上下文

/stdd-commit
    │
    └──→ 更新 Layer 1: components.md (记录新增组件)
```

---

## 最佳实践

1. **保持 Foundation 精简** - 只包含真正全局的约束
2. **Component 按需更新** - 只有架构变更时更新
3. **Feature 完成后归档** - 移动到 `stdd/archive/`
4. **定期清理缓存** - 避免 Token 浪费

---

> **引用**: 借鉴自 Claude Pilot 三层文档架构
