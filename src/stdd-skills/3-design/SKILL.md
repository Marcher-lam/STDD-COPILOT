---
description: 生成设计文档 - 技术方案和架构决策
version: "1.0"
---

# /stdd:design - 生成设计文档

将规格转化为技术设计文档，包含架构决策和实现方案。

## 使用方式

```
/stdd:design                   # 为当前变更生成设计
/stdd:design --minimal         # 最小化设计 (简单任务)
/stdd:design --full            # 完整设计 (复杂任务)
```

## 执行流程

```
┌─────────────────────────────────────────────────────────────┐
│                    /stdd:design 流程                        │
│                                                             │
│  Input: proposal.md + specs/                               │
│      │                                                      │
│      ▼                                                      │
│  1. 分析技术需求                                            │
│     ├── 识别技术栈                                          │
│     ├── 识别框架限制                                        │
│     └── 识别依赖关系                                        │
│                                                             │
│  2. 设计技术方案                                            │
│     ├── 架构决策                                            │
│     ├── 数据模型                                            │
│     ├── API 设计                                            │
│     └── 文件结构                                            │
│                                                             │
│  3. 评估风险                                                │
│     ├── 技术风险                                            │
│     ├── 性能风险                                            │
│     └── 兼容性风险                                          │
│                                                             │
│  4. 输出 design.md                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## design.md 模板

```markdown
# Design: [变更标题]

## Overview
[设计概述，1-2 句话]

## Technical Approach
[技术方案详细说明]

## Architecture Decisions

### Decision: [决策标题]
**Context:** [背景]
**Decision:** [决策内容]
**Rationale:** [理由]
**Consequences:** [影响]

### Decision: [另一个决策]
...

## Data Model
[数据模型设计，可选]

## API Design
[API 设计，可选]

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/todos | Create todo |
| GET | /api/todos | List todos |

## File Changes
| File | Action | Description |
|------|--------|-------------|
| src/services/TodoService.ts | CREATE | Todo 业务逻辑 |
| src/api/todos.ts | MODIFY | 添加导出端点 |
| src/types/todo.ts | MODIFY | 添加导出类型 |

## Implementation Notes
[实现注意事项]

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 性能瓶颈 | Low | High | 添加缓存 |

## Testing Strategy
[测试策略]

## Open Questions
- [ ] [待确认问题 1]
- [ ] [待确认问题 2]
```

## 示例输出

```markdown
# Design: Add Dark Mode

## Overview
使用 React Context + CSS Custom Properties 实现主题切换，
支持用户手动选择和系统偏好检测。

## Technical Approach

### Theme State Management
- React Context 提供全局主题状态
- localStorage 持久化用户偏好
- matchMedia 检测系统偏好

### CSS Theming
- CSS Custom Properties (--color-*)
- :root 级别定义
- 媒体查询 fallback

## Architecture Decisions

### Decision: Context over State Management Library
**Context:** 需要全局主题状态管理
**Decision:** 使用 React Context 而非 Redux/Zustand
**Rationale:**
- 简单二值状态 (light/dark)
- 无复杂状态转换
- 避免额外依赖
**Consequences:**
- ✅ 更轻量
- ✅ 零依赖
- ⚠️ 跨组件状态需手动传递

### Decision: CSS Variables over CSS-in-JS
**Context:** 需要运行时主题切换
**Decision:** 使用 CSS Custom Properties
**Rationale:**
- 原生浏览器支持
- 无运行时开销
- 与现有样式系统兼容
**Consequences:**
- ✅ 性能最优
- ✅ 调试友好
- ⚠️ IE11 不支持 (已放弃)

## File Changes
| File | Action | Description |
|------|--------|-------------|
| src/contexts/ThemeContext.tsx | CREATE | 主题 Context |
| src/components/ThemeToggle.tsx | CREATE | 切换组件 |
| src/styles/themes.css | CREATE | 主题变量 |
| src/styles/globals.css | MODIFY | 导入主题 |
| src/App.tsx | MODIFY | 添加 ThemeProvider |

## Implementation Notes

1. **初始化顺序**
   - 先加载 localStorage 中的偏好
   - 无偏好时使用系统偏好
   - 系统偏好也无时默认 light

2. **SSR 兼容**
   - 服务端渲染时使用默认主题
   - 客户端 hydration 后应用实际主题
   - 避免闪烁

3. **Transition**
   - 主题切换时使用 CSS transition
   - 过渡时间 200ms
   - 仅过渡颜色属性

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| FOUC (闪烁) | Medium | Medium | 内联脚本预加载 |
| SSR 不一致 | Low | High | useLayoutEffect |

## Testing Strategy

### Unit Tests
- ThemeContext 状态切换
- localStorage 读写
- 系统偏好检测

### Integration Tests
- 主题切换 UI
- 持久化验证
- 页面刷新保持

### E2E Tests
- 用户完整流程
- 跨浏览器验证

## Open Questions
- [ ] 是否需要动画过渡？
- [ ] 是否支持自定义主题色？
```

## 设计原则

### 1. What not How
设计文档应该解释"如何做"，而不是重复规格中的"做什么"。

### 2. 决策可追溯
每个架构决策都应该有 Context、Decision、Rationale。

### 3. 风险可见
明确识别风险及其缓解措施。

### 4. 文件级别
精确到文件级别的变更计划，包括新增、修改、删除。

## 下一步

| 命令 | 说明 |
|------|------|
| `/stdd:plan` | 基于设计生成任务列表 |
| `/stdd:continue` | 自动执行下一步 |
| `/stdd:apply` | 开始实现 |
