# STDD Copilot

Specification & Test-Driven Development Copilot - 基于 Skill Graph 的全链路自动化开发框架。

## 规则

- 使用 Conventional Commits 规范提交代码 (支持 red:/green:/refactor: TDD 前缀)
- 提交前确保 Constitution 合规 (`stdd constitution check`)
- 所有技能定义遵循 `.claude/skills/` 目录结构
- 变更管理使用 `stdd/changes/` 目录
- Hook 强制执行 Article 2 (TDD) 和 Article 7 (Security)

## 项目结构

```
stdd-copilot/
├── .<engine_name>/             # 动态引擎适配层 (如 .claude, .qwen, .cursor 等)
│   ├── commands/stdd/           # 19 个 /stdd:* 斜杠命令
│   ├── hooks/                   # Hook 脚本 (多引擎防穿透)
│   └── skills/                  # 38 个技能定义 (全量深拷贝)
├── src/                         # 源代码
│   ├── stdd-skills/             # STDD 专用技能 (按阶段组织)
│   │   ├── 1-proposal/          # 提案阶段
│   │   ├── 2-specification/     # 规格阶段
│   │   ├── 3-design/            # 设计阶段
│   │   ├── 4-implementation/    # 实现阶段
│   │   └── 5-verification/      # 验证阶段
│   ├── cli/                     # CLI 工具 (Commander.js)
│   │   └── commands/            # init, new, status, update, list
│   └── utils/                   # 工具函数
├── stdd/                        # 工作目录
│   ├── specs/                   # Source of Truth (BDD 规格)
│   ├── changes/                 # 变更管理 (含 archive/)
│   ├── explorations/            # 探索文档
│   ├── memory/                  # 记忆库
│   ├── graph/                   # Graph 配置
│   ├── config/                  # 引擎配置
│   │   └── engines.yaml         # 22 个 AI 引擎注册
│   ├── templates/               # 模板系统
│   │   ├── starters/            # 5 种语言 Starter
│   │   ├── docs-site/           # 文档站点模板
│   │   └── devcontainer/        # DevContainer 配置
│   ├── presets/                 # 预设配置 (react/express/fastapi)
│   ├── extensions/              # 扩展系统 + Marketplace
│   ├── reporters/               # 测试报告器 (6 种语言)
│   ├── constitution/            # 豁免管理 (waivers.yaml)
│   └── config.yaml              # 项目配置
├── schemas/                     # JSON/YAML Schema
│   ├── spec-driven/             # 规格模板 (proposal/spec/plan/tasks)
│   ├── constitution/            # 9 篇开发条例
│   │   └── articles/            # Article 1-9
│   ├── hooks/                   # Hooks 配置
│   └── shared/                  # 共享 Schema
├── docs/                        # 文档
│   ├── getting-started.md
│   ├── concepts.md
│   ├── workflows.md
│   ├── commands.md
│   ├── cli-guide.md
│   └── en/                      # 英文文档
├── AGENTS.md                    # 本文件 - AI 代理指令
├── README.md                    # 项目介绍
├── USAGE.md                     # 使用手册
├── ARCHITECTURE.md              # 架构文档
├── INSTALL.md                   # 安装指南
├── EXAMPLES.md                  # 社区示例
└── CLAUDE_CODE_GUIDE.md         # Claude Code 使用指南
```

## 工作流程

```
/stdd:init ──► /stdd:new ──► /stdd:ff ──► /stdd:apply ──► /stdd:archive
    │              │              │              │              │
    ▼              ▼              ▼              ▼              ▼
  初始化        创建变更       生成产物       TDD实现        归档
```

## 核心概念

### 1. Specs (规格)
- 位于 `stdd/specs/`
- 描述系统当前行为的 Source of Truth
- 使用 BDD 格式 (Given/When/Then)

### 2. Changes (变更)
- 位于 `stdd/changes/`
- 每个变更是独立的文件夹
- 包含 proposal → specs → design → tasks
- 支持持久计划状态 (.state.yaml) 跨 session 恢复

### 3. Delta Specs (增量规格)
- 描述相对于当前规格的变更
- 使用 ADDED/MODIFIED/REMOVED 章节
- 归档时合并到主规格

### 4. Ralph Loop (TDD 循环)
- 🔴 红灯: 生成失败测试
- 🔍 静态检查: 语法/类型验证
- 🟢 绿灯: 最小实现
- 🧪 变异审查: 检测骗绿灯 (Quick AI + Deep Stryker)
- 🔵 重构: 优化代码
- 容错: 策略调整 → 跨模型降级 → 熔断 → 回滚

### 5. Constitution (开发条例)
- 9 篇条例，3 级优先级 (Blocking/Warning/Suggestion)
- Pre Hook 阻断: Article 2 (TDD), 7 (Security)
- Warning Hook 检查: Article 4 (Style)
- Post Hook 建议: Article 5 (Docs), 6 (Errors), 8 (Performance)
- 豁免机制: waivers.yaml + 审计追踪

## 5 级防跑偏

1. 人机确认门 - 关键决策需确认 (HITL 可配置)
2. 微任务隔离 - 5~6 个原子任务
3. 连续失败回滚 - 4 阶段容错机制
4. 静态质检门 - 语法/类型检查
5. 伪变异审查 - 检测骗绿灯断言

## 全部 Skills (38 个)

### 核心流程 (12)
init, propose, clarify, confirm, spec, plan, apply, execute,
final-doc, commit, graph, turbo

### 快捷入口 (4，仅有 Command 文件，无独立 Skill 目录)
new, ff, continue, explore

### SDD 增强 (4)
api-spec, schema, contract, validate

### TDD 增强 (4)
outside-in, mock, factory, mutation

### 辅助功能 (11)
guard, prp, supervisor, context, iterate, memory, parallel, roles,
metrics, learn, help

### 质量评估 (3)
certainty, complexity, vision

### 专用流程 (3)
brainstorm, issue, user-test

## 更多信息

- [快速开始](docs/getting-started.md)
- [核心概念](docs/concepts.md)
- [命令参考](docs/commands.md)
- [工作流程](docs/workflows.md)
- [CLI 指南](docs/cli-guide.md)
