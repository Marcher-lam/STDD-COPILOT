# STDD Copilot 使用手册

STDD Copilot 完全基于 CLI 中的斜杠指令 (Slash Commands) 驱动，采用 OpenSpec 风格的命令命名空间 (`/stdd:*`)。

## 核心概念

| 概念 | 路径 | 说明 |
|------|------|------|
| **Commands** | `.claude/commands/stdd/` | `/stdd:*` 命令定义 |
| **Skills** | `.claude/skills/` | 可被命令调用的技能模块 |
| **Changes** | `stdd/changes/` | 变更管理 (提案→规格→实现→归档) |
| **Specs** | `stdd/specs/` | BDD 规格文件 (.feature) |
| **Memory** | `stdd/memory/` | 持久化记忆库 |
| **Config** | `stdd/config.yaml` | 项目配置 |

---

## 快速开始

### 场景 1: 简单明确需求

```bash
# 一键生成所有产物并实现
/stdd:ff 实现一个支持 Markdown 导出的 todo-list
```

### 场景 2: 需求需要澄清

```bash
# 1. 创建变更
/stdd:new 实现用户认证功能

# 2. 逐步生成产物
/stdd:continue  # 生成 proposal.md
/stdd:continue  # 生成 specs/*.feature
/stdd:continue  # 生成 design.md
/stdd:continue  # 生成 tasks.md

# 3. 实现
/stdd:apply

# 4. 验证并归档
/stdd:verify
/stdd:archive
```

### 场景 3: 需求表达不出来

```bash
# 1. 自由探索
/stdd:explore 理解现有的认证系统

# 2. 基于探索创建变更
/stdd:new 基于探索结果，优化认证流程

# 3. 后续同场景 2
...
```

---

## 完整实战流

### 1. 初始化项目 (首次使用)

```bash
/stdd:init
```

**系统动作**:
- 检测项目类型 (Node.js/Java/Python/Rust)
- 识别技术栈 (框架/测试框架/构建工具)
- 创建目录结构
- 生成记忆文件 (`stdd/memory/foundation.md`)
- 配置命令和技能

**输出示例**:
```
🚀 初始化 STDD Copilot

📊 项目分析
┌─────────────────┬──────────────────────┐
│ 项目类型        │ Node.js               │
│ 框架            │ React 18 + TypeScript│
│ 测试框架        │ Vitest               │
│ 构建工具        │ Vite                 │
└─────────────────┴──────────────────────┘

✅ 初始化完成！

快速开始:
  /stdd:new <需求>    创建第一个变更
  /stdd:ff <需求>     快速生成所有产物
```

---

### 2. 创建变更提案

```bash
/stdd:new 实现一个支持 Markdown 导出的 todo-list
```

**生成文件**: `stdd/changes/change-YYYYMMDD-HHMMSS/proposal.md`

**自动触发澄清**:
```
> [系统]: 数据持久化方式是？(localStorage / IndexedDB)
> 你: localStorage
> [系统]: 导出触发点是按钮还是自动保存？
> 你: 按钮
```

---

### 3. Fast-Forward 快速模式

```bash
/stdd:ff 实现用户登录功能，支持邮箱密码和 OAuth
```

**一键生成**:
```
stdd/changes/change-YYYYMMDD-HHMMSS/
├── proposal.md      # 需求提案
├── specs/
│   └── login.feature   # BDD 规格
├── design.md        # 设计文档
└── tasks.md         # 任务列表
```

---

### 4. 实现 (TDD 循环)

```bash
/stdd:apply
```

**Ralph Loop 流程**:
```
┌──────────────────────────────────────────────────────┐
│                    Ralph Loop                         │
│                                                     │
│  🔴 红灯  →  🔍 静态检查  →  🟢 绿灯  →           │
│  生成失败测试    语法/类型检查    最简实现           │
│                                                     │
│  →  🧪 伪变异审查  →  🔵 重构  →  ✅ 完成           │
│     检测骗绿灯断言     优化代码                       │
│                                                     │
│  ⚠️ 连续失败 3 次 → 自动熔断                          │
└──────────────────────────────────────────────────────┘
```

**选项**:
```bash
/stdd:apply                    # 执行所有待办任务
/stdd:apply --task=TASK-001    # 执行特定任务
/stdd:apply --next             # 执行下一个任务
/stdd:apply --fix              # 修复失败的测试
```

---

### 5. 验证

```bash
/stdd:verify
```

**验证维度**:
| 维度 | 检查项 |
|------|--------|
| 接口一致性 | API 签名与规范一致 |
| 行为一致性 | BDD 场景全部通过 |
| 类型一致性 | TypeScript 类型正确 |
| 边界条件 | 空值/异常/边界值处理 |
| 文档一致性 | 代码注释与规范匹配 |

---

### 6. 归档

```bash
/stdd:archive
```

**归档流程**:
```
1. 运行验证 /stdd:verify
2. 同步规格 sync → stdd/specs/
3. 生成总结 archive.md
4. 移动到 archive/
5. 状态更新 → 📦 已完成
```

---

## 变更管理

### 变更状态流转

| 状态 | 标识 | 说明 |
|------|------|------|
| 待启动 | 📝 | proposal.md 创建 |
| 规格中 | 📋 | specs/*.feature 生成中 |
| 设计中 | 🎨 | design.md 生成中 |
| 任务就绪 | 📝 | tasks.md 生成完成 |
| 实现中 | 🔧 | /stdd:apply 执行中 |
| 已完成 | 📦 | 归档完成 |

### 变更目录结构

```
stdd/changes/
├── change-20260327-143052/
│   ├── proposal.md      # 需求提案
│   ├── clarify.json     # 澄清记录
│   ├── specs/
│   │   └── todo.feature # BDD 规格
│   ├── design.md        # 设计文档
│   ├── tasks.md         # 任务列表
│   ├── apply.md         # 实现记录
│   ├── status.yaml      # 状态追踪
│   └── archive.md       # 归档总结 (完成后)
└── archive/
    └── change-20260327-143052/  # 归档的变更
```

---

## Skill Graph 引擎

### 可视化

```bash
/stdd:graph visualize           # Mermaid 格式
/stdd:graph visualize --format=html  # HTML 可交互
/stdd:graph visualize --output=graph.svg
```

### 分析

```bash
/stdd:graph analyze             # 当前状态
/stdd:graph analyze --paths     # 可执行路径
/stdd:graph analyze --bottlenecks  # 瓶颈分析
```

### 运行

```bash
/stdd:graph run stdd-spec       # 从指定 Skill 开始
/stdd:graph run stdd-init --full    # 完整流程
/stdd:graph run --dry-run       # 预览计划
```

### 并行执行

```bash
/stdd:graph parallel --detect   # 识别可并行
/stdd:graph parallel --execute  # 执行
/stdd:graph parallel --max-workers=4
```

### 历史追踪

```bash
/stdd:graph history             # 所有历史
/stdd:graph history --last=10   # 最近 10 次
/stdd:graph history --failures  # 失败记录
```

### 智能推荐

```bash
/stdd:graph recommend           # 下一步推荐
/stdd:graph recommend --goal="完成用户认证"
```

---

## 完整命令参考

### 核心流程

| 命令 | 说明 |
|------|------|
| `/stdd:init` | 初始化项目，创建目录结构和配置 |
| `/stdd:new <需求>` | 创建新变更提案 |
| `/stdd:explore [目标]` | 自由探索模式 (只读) |
| `/stdd:ff <需求>` | Fast-Forward 快速生成所有产物 |
| `/stdd:continue` | 继续生成下一个产物 |
| `/stdd:apply` | 实现任务 (TDD 循环) |
| `/stdd:verify` | 验证规范一致性 |
| `/stdd:archive` | 归档变更 |

### Graph 引擎

| 命令 | 说明 |
|------|------|
| `/stdd:graph visualize` | 可视化 Skill 依赖图 |
| `/stdd:graph analyze` | 分析当前状态 |
| `/stdd:graph run <skill>` | 从指定 Skill 开始执行 |
| `/stdd:graph parallel` | 并行执行 |
| `/stdd:graph history` | 执行历史 |
| `/stdd:graph replay <id>` | 回放执行 |
| `/stdd:graph recommend` | 智能推荐 |

### SDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:api-spec` | API 规范先行 (OpenAPI/TypeScript) |
| `/stdd:schema` | 类型规范先行 (JSON Schema/Zod) |
| `/stdd:contract` | 契约测试 (消费者驱动契约) |
| `/stdd:validate` | 规范验证 (实现与规范一致性) |

### TDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:outside-in` | 外向内 TDD (E2E → 集成 → 单元) |
| `/stdd:mock` | 自动 Mock 生成 |
| `/stdd:factory` | 测试数据工厂 (Builder/Faker) |
| `/stdd:mutation` | 变异测试 (Stryker 风格) |

### 辅助功能

| 命令 | 说明 |
|------|------|
| `/stdd:guard` | TDD 守护钩子 (强制测试先行) |
| `/stdd:prp` | PRP 结构化规划 (What/Why/How/Success) |
| `/stdd:supervisor` | 多 Agent 协调器 (Supervisor 模式) |
| `/stdd:context` | 三层文档架构 (渐进式加载) |
| `/stdd:iterate` | 自主迭代循环 (Plan-Execute-Reflect) |
| `/stdd:memory` | 向量数据库记忆 (语义搜索) |
| `/stdd:parallel` | 并行执行模式 (DAG 调度) |
| `/stdd:roles` | 多角色协作 (PO/Dev/Tester/Reviewer) |
| `/stdd:metrics` | 质量指标仪表板 |
| `/stdd:learn` | 自适应学习系统 |

---

## 5 级防跑偏防御体系

| 级别 | 机制 | 说明 |
|------|------|------|
| 1 | 人机确认门 | 关键决策需人类确认 |
| 2 | 微任务隔离 | 5~6 个原子任务，降低上下文迷失 |
| 3 | 连续失败回滚 | 3 次失败自动熔断 |
| 4 | 静态质检门 | 语法/类型检查在测试前执行 |
| 5 | 伪变异审查 | 检测骗绿灯断言 |

---

## 典型执行路径

```
# 场景 1：简单明确需求
/stdd:new --> /stdd:ff --> /stdd:apply --> /stdd:verify --> /stdd:archive

# 场景 2：需求表达不出来
/stdd:explore --> /stdd:new --> /stdd:continue --> ... --> /stdd:apply --> /stdd:archive

# 场景 3：棕地项目核心场景
/stdd:init --> /stdd:clarify --> /stdd:confirm --> /stdd:spec --> /stdd:apply --> /stdd:archive
```

---

## 最佳实践

1. **首次使用先初始化** - 运行 `/stdd:init` 创建工作区
2. **简单需求用 ff** - 明确需求直接 `/stdd:ff` 一键完成
3. **复杂需求逐步生成** - 使用 `/stdd:continue` 允许中间干预
4. **启用守护** - 运行 `/stdd:guard on` 强制 TDD 纪律
5. **小步快跑** - 每个变更控制在 5~6 个任务
6. **测试先行** - 严格遵守 Ralph Loop，红灯 → 绿灯 → 重构
7. **持续验证** - 完成后运行 `/stdd:verify` 确保一致性
8. **监控质量** - 定期运行 `/stdd:metrics` 查看质量指标
9. **使用 Graph 引擎** - `/stdd:graph recommend` 获取智能推荐

---

## 与 OpenSpec 对比

| 对比项 | OpenSpec | STDD Copilot |
|--------|----------|--------------|
| 命令前缀 | `/opsx:*` | `/stdd:*` |
| 工作目录 | `openspec/` | `stdd/` |
| 核心流程 | proposal → specs → apply → archive | proposal → specs → design → tasks → apply → archive |
| TDD 支持 | 基础 | Ralph Loop (5 步骤 + 变异测试) |
| 防御体系 | - | 5 级防跑偏 |
| Graph 引擎 | - | Skill Graph 可视化/编排/调度 |

---

> **参考**: 借鉴自 OpenSpec 规范先行理念和 Stryker 变异测试
