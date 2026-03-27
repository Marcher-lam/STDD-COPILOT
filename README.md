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
| **动态 Skill Graph 调度** | 自动扫描并注册已安装的 AI 插件，根据当前需求关键字自动拼装执行图谱，按需加载外部 AI 能力 |
| **Spec-First 需求驱动** | 通过多轮智能澄清与确认门 (Confirm Gate)，将模糊语言转化为严谨的 BDD 规范 |
| **Ralph Loop 自动化 TDD** | 红灯 (生成测试) ➡️ 绿灯 (实现代码) ➡️ 重构，全由 AI 插件自动完成 |
| **5级防跑偏防御体系** | 人机确认门 · 微任务隔离 · 连续失败回滚 · 静态质检门 · 伪变异审查 |
| **代码即文档** | Documenter Agent 自动追踪变更，生成 `FINAL_REQUIREMENT.md` |
| **TDD 守护钩子** | `/stdd-guard` 强制执行测试先行原则，防止跳过测试 |
| **PRP 结构化规划** | `/stdd-prp` What/Why/How/Success 四要素规划模式 |
| **多 Agent 协调器** | `/stdd-supervisor` Supervisor 层级模式协调多专业 Agent |
| **三层文档架构** | `/stdd-context` Foundation/Component/Feature 渐进式上下文加载 |

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
# 1. 初始化环境
/stdd-init

# 2. 提出需求
/stdd-propose 实现一个支持 Markdown 导出的 todo-list

# 3. 自动澄清 & 确认 (系统会主动提问)

# 4. 生成规格 & 执行
/stdd-spec
/stdd-plan
/stdd-execute

# 5. 提交代码
/stdd-commit
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
| `/stdd-init` | 初始化环境与插件记忆库 |
| `/stdd-propose` | 提出原始需求草案 |
| `/stdd-clarify` | 系统主动交互澄清 |
| `/stdd-confirm` | 人类确认需求 |
| `/stdd-spec` | 生成 BDD 规格 |
| `/stdd-plan` | 极细微任务拆解 |
| `/stdd-execute` | 动态组装 Skill Graph，执行 TDD 循环 |
| `/stdd-apply` | 开始实现 |
| `/stdd-final-doc` | 生成最终需求文档 |
| `/stdd-commit` | 原子化打包与提交 |
| `/stdd-turbo` | 一键通扫模式 (跳过确认) |
| `/stdd-guard` | TDD 守护钩子 (强制测试先行) ⭐ 新增 |
| `/stdd-prp` | PRP 结构化规划 (What/Why/How/Success) ⭐ 新增 |
| `/stdd-supervisor` | 多 Agent 协调器 (Supervisor 模式) ⭐ 新增 |
| `/stdd-context` | 三层文档架构 (渐进式加载) ⭐ 新增 |
| `/stdd-iterate` | 自主迭代循环 (Plan-Execute-Reflect) ⭐ 新增 |
| `/stdd-memory` | 向量数据库记忆 (语义搜索) ⭐ 新增 |
| `/stdd-parallel` | 并行执行模式 (DAG 调度) ⭐ 新增 |
| `/stdd-roles` | 多角色协作 (PO/Dev/Tester/Reviewer) ⭐ 新增 |
| `/stdd-metrics` | 质量指标仪表板 ⭐ 新增 |
| `/stdd-learn` | 自适应学习系统 ⭐ 新增 |

## 项目结构

```
stdd-copilot/
├── .agents/
│   └── skills/             # 核心 Skill 工作流定义
│       ├── stdd-init/SKILL.md
│       ├── stdd-propose/SKILL.md
│       ├── stdd-spec/SKILL.md
│       ├── stdd-plan/SKILL.md
│       ├── stdd-execute/SKILL.md
│       └── ...
├── .stdd/
│   └── memory/             # 持久化记忆库
│       ├── foundation.md   # 项目基础约束
│       └── components.md   # 组件架构
├── README.md
├── INSTALL.md              # 安装指南
└── USAGE.md                # 使用手册
```

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
