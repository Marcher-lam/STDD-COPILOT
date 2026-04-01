# STDD Copilot 社区示例

本文档收集了使用 STDD Copilot 的社区贡献示例，帮助新用户快速上手。

---

## 目录

- [Greenfield 示例](#greenfield-示例)
- [Brownfield 示例](#brownfield-示例)
- [快速示例](#快速示例)

---

## Greenfield 示例

### 示例 1: Todo List 应用

**需求复杂度**: 简单
**技术栈**: React + TypeScript + Vitest
**预计时间**: 30 分钟

```bash
/stdd-init
/stdd-propose 实现一个支持 Markdown 导出的 todo-list，使用 localStorage 持久化
```

**澄清对话**:
```
> [系统]: 数据持久化方式是？(localStorage / IndexedDB)
> 用户: localStorage

> [系统]: 导出触发点是按钮还是自动保存？
> 用户: 按钮

> [系统]: 是否需要分类标签功能？
> 用户: 不需要，保持简单
```

**生成的 BDD 规格**:
```feature
Feature: Todo List with Markdown Export
  Scenario: User adds a todo item
    Given the user is on the todo list page
    When the user enters "Buy milk" and clicks Add
    Then a new todo item "Buy milk" should appear

  Scenario: User exports todos as Markdown
    Given the user has 3 todo items
    When the user clicks the Export button
    Then a markdown file should be downloaded
```

**任务拆解**:
1. [ ] 创建 TodoList 组件 UI
2. [ ] 实现 addItem 方法
3. [ ] 实现 toggleComplete 方法
4. [ ] 编写 exportMarkdown 函数
5. [ ] 实现 localStorage 持久化
6. [ ] 编写单元测试

---

### 示例 2: REST API 服务

**需求复杂度**: 中等
**技术栈**: Node.js + Express + PostgreSQL
**预计时间**: 2 小时

```bash
/stdd-propose 构建一个用户管理 REST API，支持 CRUD 操作，使用 JWT 认证
```

**生成的架构**:
```
src/
├── routes/
│   └── users.ts
├── middleware/
│   └── auth.ts
├── models/
│   └── User.ts
├── services/
│   └── userService.ts
└── __tests__/
    └── users.test.ts
```

---

## Brownfield 示例

### 示例 3: 为现有项目添加新功能

**场景**: 在已有 React 项目中添加暗黑模式

```bash
/stdd-init  # 初始化 STDD（检测现有技术栈）
/stdd-propose 为应用添加暗黑模式支持，跟随系统偏好，允许手动切换
```

**foundation.md 自动检测**:
```markdown
# 项目基础约束

## 技术栈
- 框架: React 18.2
- 样式: Tailwind CSS 3.3
- 测试框架: Vitest
- 包管理器: pnpm

## 测试命令
- 单元测试: pnpm test
- 覆盖率: pnpm test:coverage
```

---

### 示例 4: 重构遗留代码

**场景**: 将类组件重构为函数组件

```bash
/stdd-propose 将 src/components/LegacyWidget.jsx 类组件重构为函数组件，使用 hooks
```

**STDD 优势**:
- 自动生成现有行为的测试（红灯阶段）
- 确保重构不破坏现有功能（绿灯阶段）
- 伪变异审查确保测试质量

---

## 快速示例

### 一键通扫示例

适合简单、有把握的需求：

```bash
# 工具函数
/stdd-turbo 实现一个将字符串反转的工具函数

# 简单组件
/stdd-turbo 创建一个显示当前时间的 Clock 组件

# 配置文件
/stdd-turbo 生成 ESLint 配置文件，支持 TypeScript 和 React
```

### 防跑偏示例

展示 STDD 如何防止 AI 跑偏：

```bash
/stdd-propose 实现用户登录功能
```

**跑偏场景**: AI 可能会：
- 自行添加未要求的"记住我"功能
- 过度设计认证系统
- 引入不需要的第三方库

**STDD 防护**:
1. **需求澄清** - 系统会询问具体需求
2. **确认门** - 用户确认后才进入实现
3. **微任务隔离** - 只实现确认的功能
4. **伪变异审查** - 防止测试欺骗

---

## 完整示例项目

### 示例 5: Todo List 完整项目结构

**完整 STDD 工作流端到端演示**

```
todo-app/
├── stdd/
│   ├── config.yaml                    # STDD 配置
│   ├── memory/
│   │   ├── foundation.md              # 自动检测的技术栈
│   │   ├── components.md              # 组件架构追踪
│   │   ├── contracts.md               # 接口契约
│   │   └── learning/                  # Pattern Teaching 数据
│   ├── changes/
│   │   └── change-20260401-100000/
│   │       ├── proposal.md            # /stdd-propose 产出
│   │       ├── specs/
│   │       │   ├── todo-list.feature  # /stdd-spec 产出 (BDD)
│   │       │   ├── create-todo.usecase.yaml  # 原子用例
│   │       │   └── .pipeline/
│   │       │       ├── ir.json        # Test Pipeline IR
│   │       │       └── leak-report.json
│   │       ├── design.md              # /stdd-plan 产出
│   │       ├── tasks.md               # /stdd-plan 产出
│   │       └── fix-report.md          # (如为 bug fix)
│   └── reports/
│       ├── test-report.json           # 测试报告
│       └── mutation/                  # 变异测试报告
├── src/
│   ├── types/
│   │   └── todo.types.ts              # 类型定义
│   ├── services/
│   │   ├── TodoService.ts             # 业务逻辑
│   │   └── ExportService.ts           # 导出逻辑
│   ├── components/
│   │   └── TodoList.tsx               # UI 组件
│   └── __tests__/
│       ├── todo-list.spec.ts          # 测试骨架（自动生成）
│       ├── TodoService.test.ts        # 服务测试
│       └── mutations/                 # 变异测试
├── stdd.config.json                   # 项目级 STDD 配置
└── vision.md                          # 项目愿景
```

**完整执行流程**:
```bash
# 1. 初始化
/stdd:init                              # → 生成 stdd/config.yaml + vision.md

# 2. 需求阶段
/stdd:propose                           # → proposal.md
/stdd:clarify                           # → 澄清记录
/stdd:confirm                           # → <!-- Confirmed --> 标记

# 3. 规格阶段
/stdd:spec                              # → .feature + .usecase.yaml + 测试骨架

# 4. 计划阶段
/stdd:plan                              # → design.md + tasks.md + IMPLEMENTATION_ORDER

# 5. 实现阶段
/stdd:apply                             # → 选择微任务
/stdd:execute                           # → Ralph Loop (Red→Green→Refactor)

# 6. 验证阶段
/stdd:verify                            # → 规范一致性验证
/stdd:validate --review                 # → 代码审查
/stdd:commit                            # → 原子提交 + 归档
```

---

## 社区贡献

欢迎贡献您的示例！请遵循以下格式：

```markdown
### 示例 N: [标题]

**需求复杂度**: 简单/中等/复杂
**技术栈**: [列出技术]
**预计时间**: [时间]

```bash
[命令]
```

**过程记录**:
[简述开发过程]

**关键学习点**:
- [学习点 1]
- [学习点 2]
```

提交 PR 到 [GitHub 仓库](https://github.com/Marcher-lam/STDD-COPILOT) 即可。

---

## 相关资源

- [完整使用指南](./USAGE.md)
- [安装指南](./INSTALL.md)
- [命令参考](./docs/commands.md)
