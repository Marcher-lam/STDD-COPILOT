# 框架对比：OpenSpec vs BMAD-METHOD vs STDD Copilot

本文档详细对比三个参考框架的结构和 STDD Copilot 的实现。

---

## 📊 总览对比

| 维度 | OpenSpec | BMAD-METHOD | STDD Copilot |
|------|----------|-------------|--------------|
| **核心理念** | Spec-Driven | Behavior-First Method | Spec + Test Driven |
| **命令前缀** | `/opsx:*` | `bmad-*` | `/stdd:*` |
| **AI 指令文件** | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` |
| **工作目录** | `openspec/` | - | `stdd/` |
| **技能组织** | - | 按阶段 (1-4) | 按阶段 (1-5) |
| **TDD 支持** | 基础 apply | 中等 | Ralph Loop (5步) |
| **Graph 引擎** | ❌ | ❌ | ✅ |
| **变更管理** | ✅ Delta Specs | ❌ | ✅ Delta Specs |
| **记忆系统** | ❌ | ❌ | ✅ 向量数据库 |

---

## 📁 目录结构对比

### OpenSpec 结构

```
OpenSpec/
├── AGENTS.md                    # AI 代理指令
├── README.md
├── docs/
│   ├── getting-started.md
│   ├── concepts.md
│   ├── workflows.md
│   ├── commands.md
│   ├── customization.md
│   └── supported-tools.md
├── openspec/
│   ├── changes/               # 变更管理
│   │   ├── IMPLEMENTATION_ORDER.md
│   │   ├── add-xxx/           # 活跃变更
│   │   └── archive/           # 归档
│   ├── specs/                 # Source of Truth
│   │   └── {domain}/spec.md
│   ├── explorations/          # 探索文档
│   └── config.yaml            # 项目配置
├── schemas/
│   └── spec-driven/
│       ├── schema.yaml
│       └── templates/
├── src/
│   ├── cli/
│   ├── commands/
│   ├── core/
│   └── utils/
└── test/
```

### BMAD-METHOD 结构

```
BMAD-METHOD/
├── AGENTS.md                   # AI 代理指令
├── README.md
├── CHANGELOG.md
├── docs/
│   ├── index.md
│   ├── tutorials/
│   │   └── getting-started.md
│   ├── how-to/
│   │   ├── install-bmad.md
│   │   ├── customize-bmad.md
│   │   └── upgrade-to-v6.md
│   ├── explanation/
│   │   ├── advanced-elicitation.md
│   │   ├── brainstorming.md
│   │   └── party-mode.md
│   └── reference/
│       ├── agents.md
│       ├── commands.md
│       ├── modules.md
│       └── workflow-map.md
├── src/
│   ├── bmm-skills/            # 按阶段组织
│   │   ├── 1-analysis/
│   │   ├── 2-plan-workflows/
│   │   ├── 3-solutioning/
│   │   ├── 4-implementation/
│   │   ├── module.yaml
│   │   └── module-help.csv
│   └── core-skills/           # 核心技能
│       ├── bmad-init/
│       ├── bmad-help/
│       ├── bmad-brainstorming/
│       ├── bmad-party-mode/
│       ├── module.yaml
│       └── module-help.csv
├── tools/
│   └── cli/
├── test/
└── website/                   # Astro 文档站点
```

### STDD Copilot 结构

```
STDD-COPILOT/
├── AGENTS.md                   # AI 代理指令
├── README.md
├── USAGE.md
├── ARCHITECTURE.md
├── INSTALL.md
├── EXAMPLES.md
├── docs/
│   ├── getting-started.md
│   ├── concepts.md
│   ├── workflows.md
│   ├── commands.md
│   ├── tutorials/             # (待创建)
│   ├── explanation/           # (待创建)
│   └── reference/             # (待创建)
├── src/
│   ├── stdd-skills/           # 按阶段组织 (类似 BMAD)
│   │   ├── 1-proposal/
│   │   ├── 2-specification/
│   │   ├── 3-design/
│   │   ├── 4-implementation/
│   │   ├── 5-verification/
│   │   └── module.yaml
│   └── core-skills/           # 核心技能
│       └── module.yaml
├── stdd/                      # 工作目录 (类似 OpenSpec)
│   ├── specs/                 # Source of Truth
│   ├── changes/               # 变更管理
│   │   └── archive/
│   ├── memory/                # 记忆库
│   ├── graph/                 # Graph 配置
│   └── config.yaml
├── schemas/
│   └── spec-driven/
│       ├── schema.yaml
│       └── templates/
├── .claude/
│   ├── commands/stdd/         # /stdd:* 命令
│   └── skills/                # 33 个技能
└── tools/                     # (待创建)
```

---

## 🔄 工作流对比

### OpenSpec 工作流

```
Core Profile (简单):
/opsx:propose → /opsx:apply → /opsx:archive

Expanded Profile (复杂):
/opsx:new → /opsx:ff/continue → /opsx:apply → /opsx:verify → /opsx:archive
```

**产物顺序**:
```
proposal.md → specs/ → design.md → tasks.md → implement
```

### BMAD-METHOD 工作流

```
Phase 1: Analysis
├── bmad-brainstorming
├── bmad-distillator
└── bmad-advanced-elicitation

Phase 2: Plan Workflows
├── workflow planning
└── task breakdown

Phase 3: Solutioning
├── technical design
└── architecture decisions

Phase 4: Implementation
├── coding
└── testing
```

### STDD Copilot 工作流

```
Core (简单需求):
/stdd:new → /stdd:apply → /stdd:archive

Expanded (复杂需求):
/stdd:new → /stdd:ff/continue → /stdd:apply → /stdd:verify → /stdd:archive

Explore-First (模糊需求):
/stdd:explore → /stdd:new → /stdd:continue → /stdd:apply → /stdd:archive
```

**Ralph Loop TDD**:
```
🔴 RED → 🔍 CHECK → 🟢 GREEN → 🧪 MUTATION → 🔵 REFACTOR → ✅
```

---

## 📝 产物对比

| 产物 | OpenSpec | BMAD-METHOD | STDD Copilot |
|------|----------|-------------|--------------|
| **需求提案** | `proposal.md` | PRP Document | `proposal.md` |
| **规格文件** | `specs/*.md` | Behavior Spec | `specs/*.md` |
| **设计文档** | `design.md` | Technical Design | `design.md` |
| **任务列表** | `tasks.md` | Task Breakdown | `tasks.md` |
| **探索文档** | `explorations/` | Analysis | `explorations/` |
| **归档摘要** | `archive.md` | - | `archive.md` |

---

## 🎯 Delta Specs 对比

### OpenSpec Delta 格式

```markdown
# Delta for Auth

## ADDED Requirements
### Requirement: Two-Factor Authentication
The system MUST support TOTP-based 2FA.

## MODIFIED Requirements
### Requirement: Session Expiration
The system MUST expire sessions after 30 minutes.
(Previously: 60 minutes)

## REMOVED Requirements
### Requirement: Remember Me
(Deprecated in favor of 2FA)
```

### STDD Copilot Delta 格式

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST support TOTP-based two-factor authentication.

#### Scenario: 2FA enrollment
- GIVEN a user without 2FA enabled
- WHEN the user enables 2FA in settings
- THEN a QR code is displayed for authenticator app setup

## MODIFIED Requirements

### Requirement: Session Expiration
The system MUST expire sessions after 30 minutes of inactivity.
(Previously: 60 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA. Users should re-authenticate each session.)
```

**差异**: STDD 增加了 Scenario 级别的 Given/When/Then 描述。

---

## 🛠️ 命令对比

### 核心命令

| 功能 | OpenSpec | BMAD-METHOD | STDD Copilot |
|------|----------|-------------|--------------|
| **初始化** | `openspec init` | `bmad init` | `/stdd:init` |
| **创建变更** | `/opsx:new` | `bmad propose` | `/stdd:new` |
| **探索** | `/opsx:explore` | `bmad explore` | `/stdd:explore` |
| **快速生成** | `/opsx:ff` | - | `/stdd:ff` |
| **继续** | `/opsx:continue` | - | `/stdd:continue` |
| **实现** | `/opsx:apply` | `bmad implement` | `/stdd:apply` |
| **验证** | `/opsx:verify` | - | `/stdd:verify` |
| **归档** | `/opsx:archive` | - | `/stdd:archive` |

### STDD Copilot 独有命令

| 类别 | 命令 |
|------|------|
| **Graph 引擎** | `/stdd:graph visualize/analyze/run/parallel/history/replay/recommend` |
| **SDD 增强** | `/stdd:api-spec`, `/stdd:schema`, `/stdd:contract`, `/stdd:validate` |
| **TDD 增强** | `/stdd:outside-in`, `/stdd:mock`, `/stdd:factory`, `/stdd:mutation` |
| **辅助功能** | `/stdd:guard`, `/stdd:prp`, `/stdd:supervisor`, `/stdd:context`, `/stdd:iterate`, `/stdd:memory`, `/stdd:parallel`, `/stdd:roles`, `/stdd:metrics`, `/stdd:learn` |

---

## 🧪 TDD 支持对比

### OpenSpec TDD

```
/opsx:apply
    │
    └──► 执行 tasks.md 中的任务
            │
            └──► AI 直接实现
```

**特点**: 基础实现，无强制 TDD 流程。

### BMAD-METHOD TDD

```
Phase 4: Implementation
    │
    ├──► 编写测试
    │
    └──► 实现代码
```

**特点**: 中等支持，鼓励测试但非强制。

### STDD Copilot Ralph Loop

```
┌──────────────────────────────────────────────────────────────┐
│                       Ralph Loop                              │
│                                                               │
│  🔴 RED        🔍 CHECK       🟢 GREEN       🧪 MUTATION    │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐    │
│  │生成失败 │   │语法检查 │   │最小实现 │   │变异审查 │    │
│  │测试用例 │   │类型检查 │   │         │   │         │    │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘    │
│       │                                          │          │
│       │              ┌─────────┐                 │          │
│       │              │ 🔵 REFACTOR│                 │          │
│       └─────────────►│ 重构优化 │◄────────────────┘          │
│                      └─────────┘                            │
│                                                               │
│  ⚠️ 连续失败 3 次 → 自动熔断                                   │
└──────────────────────────────────────────────────────────────┘
```

**特点**:
- 5 步严格 TDD 循环
- 静态检查门在测试前
- 变异测试检测骗绿灯
- 连续失败熔断机制

---

## 🛡️ 防跑偏机制对比

| 机制 | OpenSpec | BMAD-METHOD | STDD Copilot |
|------|----------|-------------|--------------|
| **人机确认** | ✅ 确认门 | ✅ Elicitation | ✅ 确认门 |
| **微任务隔离** | ✅ tasks.md | ✅ 微任务 | ✅ 5~6 任务 |
| **失败回滚** | ❌ | ❌ | ✅ 3 次熔断 |
| **静态质检** | ❌ | ❌ | ✅ 语法/类型 |
| **变异审查** | ❌ | ❌ | ✅ 伪变异 |

---

## 📊 Graph 引擎对比

| 功能 | OpenSpec | BMAD-METHOD | STDD Copilot |
|------|----------|-------------|--------------|
| **可视化** | ❌ | ❌ | ✅ Mermaid/HTML |
| **分析** | ❌ | ❌ | ✅ 状态/路径/瓶颈 |
| **调度** | ❌ | ❌ | ✅ DAG 调度 |
| **追踪** | ❌ | ❌ | ✅ 完整历史 |
| **并行** | ❌ | ❌ | ✅ 自动识别 |
| **回放** | ❌ | ❌ | ✅ 历史 replay |
| **推荐** | ❌ | ❌ | ✅ 智能推荐 |

---

## 🔧 配置文件对比

### OpenSpec config.yaml

```yaml
schema: spec-driven
context: |
  Tech stack: TypeScript, Node.js (≥20.19.0), ESM modules
  Package manager: pnpm
rules:
  specs:
  - Include scenarios for Windows path handling
  tasks:
  - Add Windows CI verification as a task
```

### STDD Copilot config.yaml

```yaml
version: "1.0"
name: "STDD Copilot"

project:
  type: "${PROJECT_TYPE:-node}"
  language: "${LANGUAGE:-typescript}"

graph:
  max_parallel: 4
  timeout: 3600

tdd:
  ralph_loop:
    max_iterations: 10
    failure_threshold: 3
    auto_rollback: true

  mutation:
    enabled: true
    threshold: 80

defense:
  confirm_gate:
    enabled: true
  micro_task:
    max_tasks: 6
  failure_rollback:
    threshold: 3
```

---

## 📈 总结

### STDD Copilot 融合优势

| 来源 | 借鉴内容 |
|------|----------|
| **OpenSpec** | Delta Specs、变更管理、产物结构、工作目录 |
| **BMAD-METHOD** | 阶段组织、module.yaml、AGENTS.md |
| **STDD 独创** | Ralph Loop、5级防跑偏、Graph 引擎、向量记忆 |

### STDD Copilot 独有特性

1. **Ralph Loop TDD** - 5 步严格循环 + 变异审查
2. **5 级防跑偏** - 确认门 + 微任务 + 熔断 + 质检 + 变异
3. **Skill Graph 引擎** - 可视化 + 分析 + 调度 + 追踪 + 并行
4. **向量记忆** - 语义搜索 + 跨会话上下文
5. **40+ 命令** - 核心流程 + Graph + SDD + TDD + 辅助

---

## 🔗 参考链接

- **OpenSpec**: https://github.com/Fission-AI/OpenSpec
- **BMAD-METHOD**: https://github.com/bmad-code-org/BMAD-METHOD
- **STDD Copilot**: https://github.com/Marcher-lam/STDD-COPILOT
