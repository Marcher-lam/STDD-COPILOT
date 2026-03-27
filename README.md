<div align=”center”>

# STDD Copilot

**Specification & Test-Driven Development Copilot**

基于 Skill Graph 的全链路自动化开发框架

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[English](#) · 简体中文

</div>

---

## 简介

STDD Copilot 是一套基于 **Skill Graph（技能图谱）** 的全链路自动化开发框架。它将 **Spec-First (需求规范优先)** 与 **TDD (测试驱动开发)** 深度融合，通过动态编排外部 AI 代码助手（如 Claude Code, Qwen Code, OpenClaw 等），实现从”需求捕获”到”原子化提交”的全自动闭环。

## 核心特性

| 特性 | 描述 |
|------|------|
| **规范先行、提案驱动** | 用文件化管理，让 AI 编程从 "模糊对话" 走向 "可控工程" |
| **Spec-First 需求驱动** | 通过多轮智能澄清与确认门 (Confirm Gate)，将模糊语言转化为严谨的 BDD 规范 |
| **Ralph Loop 自动化 TDD** | 红灯 (生成测试) ➡️ 静态检查 ➡️ 绿灯 (实现代码) ➡️ 变异审查 ➡️ 重构 |
| **5级防跑偏防御体系** | 人机确认门 · 微任务隔离 · 连续失败回滚 · 静态质检门 · 伪变异审查 |
| **变更可追溯** | 所有变更都有完整记录，可审计、可回滚 |
| **协作友好** | 变更隔离，支持多人并行开发 |
| **工具集成广泛** | 兼容 Claude Code、Cursor、Copilot 等主流 AI 编码助手 |
| **Skill Graph 引擎** | `/stdd-graph` 统一的可视化、编排、调度和追踪系统 |

## 目录

- [安装](#-安装)
- [快速开始](#-快速开始)
- [核心工作流](#-核心工作流)
- [项目结构](#-项目结构)
- [技术栈](#-技术栈)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

## 安装

```bash
# 克隆仓库
git clone https://github.com/Marcher-lam/STDD-COPLOIT.git ~/stdd-copilot
cd ~/stdd-copilot

# 安装依赖
npm install

# 配置全局 CLI (可选)
npm link
```

详细安装说明请参阅 **[INSTALL.md](./INSTALL.md)**

## 快速开始

```bash
# 1. 初始化项目 (首次使用)
/stdd:init

# 2. 创建新变更 (两种方式)

# 方式 A: 需求明确 → Fast-Forward 一键生成
/stdd:ff 实现一个支持 Markdown 导出的 todo-list

# 方式 B: 需求模糊 → 逐步澄清
/stdd:new 实现用户认证功能
/stdd:continue  # 逐步生成 proposal → specs → design → tasks

# 3. 实现任务 (TDD 循环)
/stdd:apply

# 4. 验证并归档
/stdd:verify
/stdd:archive
```

## 典型执行路径

```
# 场景1：简单明确需求
/stdd:new --> /stdd:ff --> /stdd:apply --> /stdd:verify --> /stdd:archive

# 场景2：需求表达不出来
/stdd:explore --> /stdd:new --> /stdd:continue --> ... --> /stdd:apply --> /stdd:archive
```

完整使用指南请参阅 **[USAGE.md](./USAGE.md)**

## 核心工作流

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  /stdd-init │───▶│/stdd-propose│───▶│/stdd-clarify│───▶│/stdd-confirm│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│/stdd-commit │◀───│/stdd-final- │◀───│/stdd-execute│◀───│  /stdd-spec │
│             │    │    doc      │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                            │              │
                                            ▼              ▼
                                     ┌─────────────┐ ┌─────────────┐
                                     │ Ralph Loop  │ │ /stdd-plan  │
                                     │  🔴 → 🟢 → 🔵 │ └─────────────┘
                                     └─────────────┘
```

| 指令 | 说明 |
|------|------|
| **核心流程** | |
| `/stdd:init` | 初始化项目，创建目录结构和配置 |
| `/stdd:new` | 创建新变更提案 |
| `/stdd:explore` | 自由探索模式 (只读) |
| `/stdd:ff` | Fast-Forward 快速生成所有产物 |
| `/stdd:continue` | 继续生成下一个产物 |
| `/stdd:apply` | 实现任务 (Ralph Loop TDD) |
| `/stdd:verify` | 验证规范一致性 |
| `/stdd:archive` | 归档变更 |
| **Graph 引擎** | |
| `/stdd:graph visualize` | 可视化 Skill 依赖图 |
| `/stdd:graph analyze` | 分析当前状态和可执行路径 |
| `/stdd:graph run` | 从指定 Skill 开始执行 |
| `/stdd:graph parallel` | 识别并执行可并行的 Skill |
| `/stdd:graph history` | 查看执行历史 |
| `/stdd:graph replay` | 回放历史执行 |
| `/stdd:graph recommend` | 智能推荐下一步 |
| **SDD 增强** | |
| `/stdd:api-spec` | API 规范先行 (OpenAPI/TypeScript) |
| `/stdd:schema` | 类型规范先行 (JSON Schema/Zod) |
| `/stdd:contract` | 契约测试 (消费者驱动契约) |
| `/stdd:validate` | 规范验证 (实现与规范一致性) |
| **TDD 增强** | |
| `/stdd:outside-in` | 外向内 TDD (E2E → 集成 → 单元) |
| `/stdd:mock` | 自动 Mock 生成 (服务/API) |
| `/stdd:factory` | 测试数据工厂 (Builder/Faker) |
| `/stdd:mutation` | 变异测试 (Stryker 风格) |
| **辅助功能** | |
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

## 项目结构

```
stdd-copilot/
├── .claude/
│   ├── commands/           # 命令定义 (统一命名空间)
│   │   └── stdd/           # /stdd:* 命令
│   │       ├── init.md
│   │       ├── new.md
│   │       ├── explore.md
│   │       ├── ff.md
│   │       ├── continue.md
│   │       ├── apply.md
│   │       ├── verify.md
│   │       ├── archive.md
│   │       └── graph.md
│   └── skills/             # 技能定义 (可被命令调用)
│       ├── stdd-init/
│       ├── stdd-spec/
│       ├── stdd-execute/
│       ├── stdd-guard/
│       └── ...
├── stdd/                   # 工作目录 (类似 OpenSpec 的 openspec/)
│   ├── changes/            # 变更管理
│   │   └── archive/        # 归档变更
│   ├── specs/              # BDD 规格文件
│   ├── memory/             # 持久化记忆
│   │   ├── foundation.md   # 项目基础约束
│   │   └── components.md   # 组件架构
│   └── config.yaml         # STDD 配置
├── README.md
├── ARCHITECTURE.md         # 系统架构
├── INSTALL.md              # 安装指南
└── USAGE.md                # 使用手册
```

## 变更管理流程

| 流程阶段 | 对应文件/操作 | 状态标识 |
|----------|---------------|----------|
| 创建提案 | `proposal.md` | 📝 待启动 |
| 生成规格 | `specs/*.feature` | 📋 规格中 |
| 设计方案 | `design.md` | 🎨 设计中 |
| 任务拆解 | `tasks.md` | 📝 任务就绪 |
| 实现变更 | `apply.md` | 🔧 实现中 |
| 归档完成 | `archive/` | 📦 已完成 |

## 技术栈

- **运行时**: Node.js >= 20.0.0
- **核心引擎**: Skill Graph 动态编排
- **TDD 框架**: 框架无关 (Jest/Vitest/Mocha 等)
- **AI 集成**: Claude Code / Qwen Code / OpenClaw 等

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

[MIT License](LICENSE)

---

<div align=”center”>

**STDD Copilot** — 让每个开发者都能拥有一个不跑偏、不产生”屎山”的超级 AI 结对编程专家

Made with ❤️ by [Marcher-lam](https://github.com/Marcher-lam)

</div>
