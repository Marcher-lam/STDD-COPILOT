# 全面框架对比：12 个参考框架 vs STDD Copilot

本文档详细对比 SDD/TDD 领域的 12 个参考框架与 STDD Copilot 的架构设计。

---

## 📊 框架总览

### SDD (Spec-Driven Development) 框架

| 框架 | 来源 | 核心理念 | 命令前缀 |
|------|------|----------|----------|
| **SpecKit** | GitHub | Specification-Driven Development | `/speckit.*` |
| **OpenSpec** | Fission-AI | Fluid Spec Workflow | `/opsx:*` |
| **BMAD-METHOD** | bmad-code-org | Behavior-First Method | `bmad-*` |

### TDD (Test-Driven Development) 框架

| 框架 | 来源 | 核心理念 | 特点 |
|------|------|----------|------|
| **AIDD** | paralleldrive | AI-Driven Development | AI + TDD 规则引擎 |
| **TDD Guard** | nizos | Hook-based Enforcement | Claude Code 钩子 |
| **Claude Pilot** | changoo89 | Plugin Architecture | Ralph Loop TDD |
| **Spec-First TDD** | donnieprakoso | Spec → Test → Code | 规格驱动测试 |
| **TDAD** | zd8899 | Test-Driven Agile Development | 敏捷 TDD |
| **ATDD** | swingerman | Acceptance Test-Driven | 验收测试驱动 |
| **tdder** | t1 | TDD Utilities | TDD 工具集 |
| **TDG** | chanwit | TDD Generator | TDD 生成器 |
| **Outside-In TDD** | JoeGaebel | London School TDD | 外向内测试 |

### STDD Copilot 融合框架

| 框架 | 核心理念 | 命令前缀 |
|------|----------|----------|
| **STDD Copilot** | Spec + Test Driven Development | `/stdd:*` |

---

## 🏗️ 架构对比总览

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              Framework Architecture Comparison                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  SDD Frameworks                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                                 │
│  │   SpecKit    │   │   OpenSpec   │   │     BMAD     │                                 │
│  │   (GitHub)   │   │ (Fission-AI) │   │  (bmad-org)  │                                 │
│  ├──────────────┤   ├──────────────┤   ├──────────────┤                                 │
│  │ Constitution │   │ Delta Specs  │   │ 4-Phase Org  │                                 │
│  │ 9 Articles   │   │ Artifact     │   │ AGENTS.md    │                                 │
│  │ Templates    │   │   Graph      │   │ Skills by    │                                 │
│  │ Multi-Agent  │   │ Workflows    │   │   Phase      │                                 │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                                 │
│         │                  │                  │                                          │
│         └──────────────────┼──────────────────┘                                          │
│                            ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐│
│  │                           STDD Copilot Fusion Layer                                  ││
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               ││
│  │   │ Delta Specs │  │ 5-Phase Org │  │ AGENTS.md   │  │ Templates   │               ││
│  │   │ (OpenSpec)  │  │ (BMAD++)    │  │ (Both)      │  │ (SpecKit)   │               ││
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               ││
│  └─────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                          │
│  TDD Frameworks                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐             │
│  │     AIDD     │   │  TDD Guard   │   │ Claude Pilot │   │ Outside-In   │             │
│  ├──────────────┤   ├──────────────┤   ├──────────────┤   ├──────────────┤             │
│  │ TDD Rules    │   │ Hook-Based   │   │ Ralph Loop   │   │ London Style │             │
│  │ AI Guidelines│   │ Enforcement  │   │ 5-Step Cycle │   │ Mock-First   │             │
│  │ Vision Doc   │   │ Multi-Lang   │   │ E2E Verify   │   │ Contract     │             │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘             │
│         │                  │                  │                  │                      │
│         └──────────────────┼──────────────────┼──────────────────┘                      │
│                            ▼                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐│
│  │                           STDD Copilot TDD Innovation                               ││
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    ││
│  │   │   Ralph Loop    │  │  5-Level Defense│  │  Graph Engine   │                    ││
│  │   │ (Claude Pilot++)│  │ (TDD Guard++)   │  │ (STDD Original) │                    ││
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘                    ││
│  └─────────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 目录结构对比

### SpecKit (GitHub)

```
spec-kit/
├── AGENTS.md                    # AI 代理指令（多代理支持）
├── spec-driven.md               # SDD 方法论文档
├── templates/
│   ├── spec-template.md         # 规格模板
│   ├── plan-template.md         # 计划模板
│   ├── tasks-template.md        # 任务模板
│   └── commands/                # 命令模板
├── scripts/
│   ├── bash/                    # Bash 脚本
│   └── powershell/              # PowerShell 脚本
├── presets/                     # 预设配置
└── extensions/                  # 扩展系统
```

**特点**:
- 支持 20+ AI 代理（Claude, Gemini, Cursor 等）
- 宪法机制（9 篇开发条例）
- 扩展系统支持自定义

### OpenSpec (Fission-AI)

```
OpenSpec/
├── AGENTS.md                    # AI 代理指令
├── openspec/                    # 工作目录
│   ├── changes/                 # 变更管理
│   │   ├── IMPLEMENTATION_ORDER.md
│   │   └── archive/
│   ├── specs/                   # Source of Truth
│   ├── explorations/            # 探索文档
│   └── config.yaml
├── schemas/
│   └── spec-driven/
│       ├── schema.yaml
│       └── templates/
└── src/                         # CLI 源码
```

**特点**:
- Delta Specs 变更管理
- Artifact Graph 产物图
- 流式工作流（非瀑布）

### BMAD-METHOD

```
BMAD-METHOD/
├── AGENTS.md                    # AI 代理指令
├── src/
│   ├── bmm-skills/              # 按阶段组织
│   │   ├── 1-analysis/
│   │   ├── 2-plan-workflows/
│   │   ├── 3-solutioning/
│   │   └── 4-implementation/
│   └── core-skills/             # 核心技能
│       ├── bmad-init/
│       ├── bmad-brainstorming/
│       └── bmad-party-mode/
└── website/                     # Astro 文档站点
```

**特点**:
- 4 阶段组织（分析→计划→方案→实现）
- module.yaml 模块定义
- 多语言文档支持

### AIDD (paralleldrive)

```
aidd/
├── AGENTS.md                    # AI 代理指令
├── vision.md                    # 愿景文档（必需）
├── ai/
│   ├── commands/                # 命令定义
│   └── rules/
│       ├── tdd.mdc              # TDD 规则
│       ├── review.mdc           # 评审规则
│       └── frameworks/          # 框架规则
├── tasks/                       # 任务管理
│   └── archive/
└── docs/
    └── vision-document.md
```

**特点**:
- Vision Document 强制前置
- TDD 规则引擎
- 渐进式发现模式

### TDD Guard (nizos)

```
tdd-guard/
├── CLAUDE.md                    # Claude Code 指令
├── docs/
│   ├── enforcement.md           # 强制执行
│   ├── validation-model.md      # 验证模型
│   └── custom-instructions.md   # 自定义规则
├── src/
│   ├── hooks/                   # Hook 处理
│   ├── validation/              # TDD 验证
│   └── providers/               # 模型提供者
└── reporters/                   # 多语言报告器
    ├── jest/
    ├── vitest/
    ├── pytest/
    ├── phpunit/
    ├── go/
    └── rust/
```

**特点**:
- Claude Code Hook 集成
- 多语言测试框架支持
- AI 模型验证 TDD 合规

### Claude Pilot (changoo89)

```
claude-pilot/
├── CLAUDE.md                    # 插件文档
├── docs/
│   └── ai-context/              # AI 上下文
├── .claude/
│   ├── commands/                # 11 个命令
│   ├── skills/                  # 技能系统
│   │   ├── tdd/                 # TDD 技能
│   │   ├── ralph-loop/          # Ralph Loop
│   │   └── spec-driven-workflow/
│   └── agents/                  # 12 个专用代理
└── examples/                    # 示例项目
```

**特点**:
- Ralph Loop 自动迭代
- E2E 验证框架
- 3-Tier 文档层次

### STDD Copilot

```
STDD-COPILOT/
├── AGENTS.md                    # AI 代理指令
├── src/
│   ├── stdd-skills/             # 按阶段组织（5 阶段）
│   │   ├── 1-proposal/
│   │   ├── 2-specification/
│   │   ├── 3-design/
│   │   ├── 4-implementation/
│   │   ├── 5-verification/
│   │   └── module.yaml
│   └── core-skills/
│       └── module.yaml
├── stdd/                        # 工作目录
│   ├── specs/                   # Source of Truth
│   ├── changes/                 # 变更管理
│   ├── memory/                  # 向量记忆
│   ├── graph/                   # Graph 配置
│   └── config.yaml
├── schemas/
│   └── spec-driven/
│       ├── schema.yaml
│       └── templates/
├── .claude/
│   ├── commands/stdd/           # 9 个核心命令
│   └── skills/                  # 33 个技能
└── docs/                        # 文档系统
```

**特点**:
- 5 阶段组织（提案→规格→设计→实现→验证）
- Ralph Loop TDD（5 步循环）
- Graph 引擎（可视化+调度）
- 5 级防跑偏机制
- 向量记忆系统

---

## 🔄 工作流对比

### SDD 工作流

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          SDD Workflow Comparison                           │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  SpecKit (Constitutional)                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│  │Specify  │───►│  Plan   │───►│  Tasks  │───►│Implement│                │
│  │/specify │    │ /plan   │    │ /tasks  │    │(TDD)    │                │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘                │
│       │              │              │              │                       │
│       └──────────────┴──────────────┴──────────────┘                       │
│                          Constitution Gates                                │
│                    (9 Articles: Library-First, TDD, etc.)                  │
│                                                                            │
│  OpenSpec (Delta-Based)                                                    │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│  │/opsx:new│───►│/opsx:ff │───►│/opsx:   │───►│/opsx:   │                │
│  │         │    │/continue│    │apply    │    │archive  │                │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘                │
│       │              │              │              │                       │
│       └──────────────┴──────────────┴──────────────┘                       │
│                          Delta Specs (ADDED/MODIFIED/REMOVED)              │
│                                                                            │
│  BMAD (4-Phase)                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ 1-Analysis  │─►│2-Plan Work- │─►│3-Solutioning│─►│4-Implement  │      │
│  │ Brainstorm  │  │  flows      │  │ Tech Design │  │ Coding      │      │
│  │ Distillator │  │ Task Plan   │  │ Architecture│  │ Testing     │      │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                                            │
│  STDD Copilot (5-Phase + Delta)                                           │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────┐  │
│  │/stdd:new│───►│/stdd:   │───►│/stdd:   │───►│/stdd:   │───►│/stdd:  │  │
│  │proposal │    │specify  │    │design   │    │apply    │    │archive │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └────────┘  │
│       │              │              │              │              │        │
│       ▼              ▼              ▼              ▼              ▼        │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    Delta Specs + Graph Engine                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

### TDD 工作流

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          TDD Workflow Comparison                           │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Classic TDD (Red-Green-Refactor)                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                               │
│  │  🔴 RED │───►│🟢 GREEN │───►│🔵REFACTOR│──┐                            │
│  │Fail Test│    │Min Impl │    │ Clean Up│  │                            │
│  └─────────┘    └─────────┘    └─────────┘  │                            │
│       ▲                                        │                            │
│       └────────────────────────────────────────┘                            │
│                                                                            │
│  AIDD (Vision-First TDD)                                                   │
│  ┌──────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐                  │
│  │ Vision.md│──►│  Plan   │──►│   TDD   │──►│ Review  │                  │
│  │ Required │   │         │   │  Cycle  │   │         │                  │
│  └──────────┘   └─────────┘   └─────────┘   └─────────┘                  │
│                                                                            │
│  TDD Guard (Hook-Enforced)                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                               │
│  │ AI Write│───►│  Hook   │───►│Validate │                               │
│  │  Code   │    │Intercept│    │  TDD    │                               │
│  └─────────┘    └─────────┘    └─────────┘                               │
│                      │              │                                      │
│                      ▼              ▼                                      │
│               ┌──────────────────────────┐                                 │
│               │ Block if:                │                                 │
│               │ - No test first          │                                 │
│               │ - Over-implementation    │                                 │
│               │ - Skip refactor          │                                 │
│               └──────────────────────────┘                                 │
│                                                                            │
│  Claude Pilot Ralph Loop (5-Step)                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────┐  │
│  │  🔴 RED │───►│🔍 VERIFY│───►│🟢 GREEN │───►│🧪 MUTATE│───►│✅ PASS │  │
│  │Fail Test│    │  E2E    │    │Min Impl │    │ Review  │    │        │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └────────┘  │
│                                                                            │
│  STDD Copilot Ralph Loop (Enhanced 5-Step)                                │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────┐  │
│  │  🔴 RED │───►│🔍 CHECK │───►│🟢 GREEN │───►│🧪MUTATION│───►│🔵REFACT│  │
│  │Fail Test│    │Static QA│    │Min Impl │    │ Review  │    │ Clean  │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └────────┘  │
│       │              │              │              │              │        │
│       └──────────────┴──────────────┴──────────────┴──────────────┘        │
│                          3-Failure Circuit Breaker                         │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ 防跑偏机制对比

```
┌───────────────────────────────────────────────────────────────────────────┐
│                     Anti-Drift Defense Mechanisms                          │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                    Level 1          Level 2          Level 3              │
│                    ─────────        ─────────        ─────────             │
│  SpecKit           Constitution    Template         Checklist             │
│                    Gates            Constraints      Validation            │
│                                                                            │
│  OpenSpec          Human Confirm   Artifact         Change                │
│                    Gates            Validation       Isolation             │
│                                                                            │
│  BMAD              Elicitation     Module           Workflow              │
│                    Questions       Boundaries       Gates                  │
│                                                                            │
│  AIDD              Vision Doc      TDD Rules        Review                │
│                    Required        Engine           Process                │
│                                                                            │
│  TDD Guard         Hook            AI Validation    Multi-Lang            │
│                    Enforcement     Model            Reporters              │
│                                                                            │
│  Claude Pilot      Certainty       E2E Verify       Agent Teams           │
│                    Protocol        Framework        Coordination           │
│                                                                            │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                            │
│  STDD Copilot (5-Level Defense)                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  Level 1: Confirm Gates     │  人机确认门 - 关键决策人工审批        │  │
│  │  Level 2: Micro Tasks       │  微任务隔离 - 每任务 ≤30 分钟         │  │
│  │  Level 3: Failure Rollback  │  失败熔断 - 连续 3 次自动回滚        │  │
│  │  Level 4: Static QA         │  静态质检 - 语法/类型/Lint 检查      │  │
│  │  Level 5: Mutation Review   │  变异审查 - 检测骗绿灯               │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Comparison Matrix:                                                        │
│  ┌────────────────┬────────┬────────┬────────┬────────┬────────┐         │
│  │ Mechanism      │SpecKit │OpenSpec│TDDGuard│Claude  │ STDD   │         │
│  │                │        │        │        │Pilot   │Copilot │         │
│  ├────────────────┼────────┼────────┼────────┼────────┼────────┤         │
│  │ Human Confirm  │   ✅   │   ✅   │   ❌   │   ✅   │   ✅   │         │
│  │ Micro Tasks    │   ✅   │   ✅   │   ❌   │   ✅   │   ✅   │         │
│  │ Failure Rollbk │   ❌   │   ❌   │   ❌   │   ❌   │   ✅   │         │
│  │ Static QA      │   ❌   │   ❌   │   ✅   │   ❌   │   ✅   │         │
│  │ Mutation Test  │   ❌   │   ❌   │   ❌   │   ❌   │   ✅   │         │
│  │ Hook Enforcement│  ❌   │   ❌   │   ✅   │   ❌   │   ❌   │         │
│  │ Constitution   │   ✅   │   ❌   │   ❌   │   ❌   │   ❌   │         │
│  └────────────────┴────────┴────────┴────────┴────────┴────────┘         │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 TDD 支持详细对比

| 特性 | AIDD | TDD Guard | Claude Pilot | Outside-In | STDD Copilot |
|------|------|-----------|--------------|------------|--------------|
| **测试先行** | ✅ 规则强制 | ✅ Hook 拦截 | ✅ Ralph Loop | ✅ Mock-First | ✅ 5 步循环 |
| **最小实现** | ✅ 规则指导 | ✅ AI 验证 | ✅ 绿灯检查 | ✅ 契约驱动 | ✅ 检查门 |
| **重构阶段** | ✅ 规则指导 | ✅ Lint 集成 | ✅ 变异审查 | ✅ 契约验证 | ✅ 变异审查 |
| **自动迭代** | ❌ | ❌ | ✅ Ralph Loop | ❌ | ✅ Ralph Loop |
| **失败熔断** | ❌ | ❌ | ❌ | ❌ | ✅ 3 次熔断 |
| **变异测试** | ❌ | ❌ | ❌ | ❌ | ✅ 伪变异 |
| **E2E 验证** | ❌ | ❌ | ✅ Chrome 集成 | ✅ 集成测试 | ✅ 可选 |
| **多语言** | JS/TS | 6 语言 | TS/JS | TS/JS | TS/JS |

### Ralph Loop 对比

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Ralph Loop TDD Evolution                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Claude Pilot Ralph Loop (Original)                                         │
│  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐           │
│  │ 🔴 RED │──►│🔍VERIFY│──►│🟢GREEN │──►│🧪REVIEW│──►│✅ PASS │           │
│  │        │   │  E2E   │   │        │   │        │   │        │           │
│  └────────┘   └────────┘   └────────┘   └────────┘   └────────┘           │
│                                                                              │
│  STDD Copilot Ralph Loop (Enhanced)                                         │
│  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐           │
│  │ 🔴 RED │──►│🔍CHECK │──►│🟢GREEN │──►│🧪MUTATE│──►│🔵REFACT│           │
│  │        │   │Static  │   │        │   │Review  │   │        │           │
│  └────────┘   └────────┘   └────────┘   └────────┘   └────────┘           │
│       │            │            │            │            │                 │
│       │            │            │            │            │                 │
│       ▼            ▼            ▼            ▼            ▼                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Circuit Breaker                                 │   │
│  │                                                                      │   │
│  │   Failure Count: [1] [2] [3] ─────────► FUSE (Auto Rollback)       │   │
│  │                                                                      │   │
│  │   Recovery: Manual reset or auto-retry with backoff                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Key Differences:                                                           │
│  ┌─────────────────┬──────────────────┬────────────────────────────────┐  │
│  │ Aspect          │ Claude Pilot     │ STDD Copilot                   │  │
│  ├─────────────────┼──────────────────┼────────────────────────────────┤  │
│  │ Check Phase     │ E2E Verification │ Static QA (Syntax/Type/Lint)   │  │
│  │ Mutation        │ Manual Review    │ Automated Pseudo-Mutation      │  │
│  │ Failure Handler │ Retry Loop       │ Circuit Breaker + Auto Rollback│  │
│  │ Recovery        │ Manual           │ Auto-retry with backoff        │  │
│  └─────────────────┴──────────────────┴────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Graph 引擎对比

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        Graph Engine Capabilities                           │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────────┬────────┬────────┬────────┬────────┬────────┐         │
│  │ Feature        │SpecKit │OpenSpec│  BMAD  │Claude  │ STDD   │         │
│  │                │        │        │        │Pilot   │Copilot │         │
│  ├────────────────┼────────┼────────┼────────┼────────┼────────┤         │
│  │ Visualization  │   ❌   │   ❌   │   ❌   │   ❌   │   ✅   │         │
│  │ Analysis       │   ❌   │   ❌   │   ❌   │   ❌   │   ✅   │         │
│  │ Scheduling     │   ❌   │   ❌   │   ❌   │   ❌   │   ✅   │         │
│  │ Tracking       │   ❌   │   ❌   │   ❌   │   ✅   │   ✅   │         │
│  │ Parallel       │   ❌   │   ❌   │   ❌   │   ✅   │   ✅   │         │
│  │ History/Replay │   ❌   │   ❌   │   ❌   │   ❌   │   ✅   │         │
│  │ Recommendation │   ❌   │   ❌   │   ❌   │   ❌   │   ✅   │         │
│  └────────────────┴────────┴────────┴────────┴────────┴────────┘         │
│                                                                            │
│  STDD Copilot Graph Commands:                                              │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                                                                    │   │
│  │  /stdd:graph visualize   → Mermaid + HTML 可视化                  │   │
│  │  /stdd:graph analyze     → 状态/路径/瓶颈分析                      │   │
│  │  /stdd:graph run         → DAG 调度执行                            │   │
│  │  /stdd:graph parallel    → 自动识别并行任务                        │   │
│  │  /stdd:graph history     → 完整执行历史                            │   │
│  │  /stdd:graph replay      → 历史 replay                            │   │
│  │  /stdd:graph recommend   → 智能推荐下一步                          │   │
│  │                                                                    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 命令系统对比

### 核心命令对照表

| 功能 | SpecKit | OpenSpec | BMAD | Claude Pilot | STDD Copilot |
|------|---------|----------|------|--------------|--------------|
| **初始化** | `speckit init` | `openspec init` | `bmad init` | `/pilot:setup` | `/stdd:init` |
| **创建变更** | `/speckit.specify` | `/opsx:new` | `bmad propose` | `/00_plan` | `/stdd:new` |
| **探索** | - | `/opsx:explore` | `bmad explore` | - | `/stdd:explore` |
| **快速生成** | - | `/opsx:ff` | - | - | `/stdd:ff` |
| **继续** | - | `/opsx:continue` | - | - | `/stdd:continue` |
| **实现** | `/speckit.implement` | `/opsx:apply` | `bmad implement` | `/02_execute` | `/stdd:apply` |
| **验证** | - | `/opsx:verify` | - | `/review` | `/stdd:verify` |
| **归档** | - | `/opsx:archive` | - | `/03_close` | `/stdd:archive` |
| **计划** | `/speckit.plan` | - | - | `/01_confirm` | - |
| **任务** | `/speckit.tasks` | - | - | - | - |

### STDD Copilot 独有命令

| 类别 | 命令 | 说明 |
|------|------|------|
| **Graph 引擎** | `/stdd:graph visualize` | 可视化 Skill Graph |
| | `/stdd:graph analyze` | 分析执行瓶颈 |
| | `/stdd:graph run` | DAG 调度执行 |
| | `/stdd:graph parallel` | 并行任务识别 |
| | `/stdd:graph history` | 执行历史追踪 |
| | `/stdd:graph replay` | 历史 replay |
| | `/stdd:graph recommend` | 智能推荐 |
| **SDD 增强** | `/stdd:api-spec` | API 规格生成 |
| | `/stdd:schema` | Schema 生成 |
| | `/stdd:contract` | 契约测试 |
| | `/stdd:validate` | 规格验证 |
| **TDD 增强** | `/stdd:outside-in` | Outside-In TDD |
| | `/stdd:mock` | Mock 生成 |
| | `/stdd:factory` | 测试工厂 |
| | `/stdd:mutation` | 变异测试 |
| **辅助功能** | `/stdd:guard` | 防跑偏守卫 |
| | `/stdd:prp` | PRP 文档生成 |
| | `/stdd:supervisor` | 超级监督者 |
| | `/stdd:context` | 上下文管理 |
| | `/stdd:iterate` | 迭代执行 |
| | `/stdd:memory` | 记忆系统 |
| | `/stdd:parallel` | 并行执行 |
| | `/stdd:roles` | 角色切换 |
| | `/stdd:metrics` | 质量指标 |
| | `/stdd:learn` | 学习改进 |

---

## 📈 总结：STDD Copilot 融合创新

### 融合来源

| 来源 | 借鉴内容 |
|------|----------|
| **SpecKit** | 宪法机制思想、模板系统、多代理支持理念 |
| **OpenSpec** | Delta Specs、变更管理、产物结构、工作目录 |
| **BMAD-METHOD** | 阶段组织、module.yaml、AGENTS.md |
| **AIDD** | Vision Document 理念、TDD 规则引擎思想 |
| **TDD Guard** | Hook 强制理念、多语言支持 |
| **Claude Pilot** | Ralph Loop、E2E 验证、Agent 团队 |

### STDD Copilot 独创特性

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STDD Copilot Unique Features                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Ralph Loop TDD (Enhanced)                                               │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │ 🔴RED → 🔍CHECK → 🟢GREEN → 🧪MUTATION → 🔵REFACTOR → ✅          │  │
│     │      ↑                                              │               │  │
│     │      └────────── 3-Failure Circuit Breaker ─────────┘               │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  2. 5-Level Anti-Drift Defense                                              │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │ Level 1: Confirm Gates    │ Human approval at key decisions       │  │
│     │ Level 2: Micro Tasks      │ Task isolation ≤30 min each           │  │
│     │ Level 3: Failure Rollback │ Auto rollback after 3 consecutive fails│  │
│     │ Level 4: Static QA        │ Syntax/Type/Lint checks before test   │  │
│     │ Level 5: Mutation Review  │ Pseudo-mutation to detect fake green  │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  3. Skill Graph Engine                                                      │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │                                                                    │  │
│     │   ┌───────┐     ┌───────┐     ┌───────┐     ┌───────┐            │  │
│     │   │Proposal├────►│ Spec  ├────►│Design ├────►│ Apply │            │  │
│     │   └───────┘     └───┬───┘     └───────┘     └───────┘            │  │
│     │                     │                                          │  │
│     │   ┌───────┐         │         ┌───────┐                        │  │
│     │   │Explore├─────────┘         │Archive│                        │  │
│     │   └───────┘                   └───────┘                        │  │
│     │                                                                    │  │
│     │   Features: Visualize | Analyze | Schedule | Track | Recommend   │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  4. Vector Memory System                                                    │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │                                                                    │  │
│     │   stdd/memory/                                                     │  │
│     │   ├── foundation.md    → Core principles                          │  │
│     │   ├── components.md    → Component patterns                       │  │
│     │   └── contracts.md     → API contracts                            │  │
│     │                                                                    │  │
│     │   Features: Semantic Search | Cross-Session Context | Learning    │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  5. 40+ Commands                                                            │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │ Core: 9 commands (init/new/explore/ff/continue/apply/verify/archive│  │
│     │       /graph)                                                      │  │
│     │ Graph: 7 commands (visualize/analyze/run/parallel/history/replay/  │  │
│     │        recommend)                                                  │  │
│     │ SDD: 4 commands (api-spec/schema/contract/validate)                │  │
│     │ TDD: 4 commands (outside-in/mock/factory/mutation)                 │  │
│     │ Utils: 10+ commands (guard/prp/supervisor/context/etc.)            │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 参考链接

### SDD 框架
- **SpecKit**: https://github.com/github/spec-kit
- **OpenSpec**: https://github.com/Fission-AI/OpenSpec
- **BMAD-METHOD**: https://github.com/bmad-code-org/BMAD-METHOD

### TDD 框架
- **AIDD**: https://github.com/paralleldrive/aidd
- **TDD Guard**: https://github.com/nizos/tdd-guard
- **Claude Pilot**: https://github.com/changoo89/claude-pilot
- **Spec-First TDD**: https://github.com/donnieprakoso/spec-first-tdd
- **TDAD**: https://github.com/zd8899/TDAD
- **ATDD**: https://github.com/swingerman/atdd
- **tdder**: https://github.com/t1/tdder
- **TDG**: https://github.com/chanwit/tdg
- **Outside-In TDD**: https://github.com/JoeGaebel/outside-in-tdd-starter

### STDD Copilot
- **STDD Copilot**: https://github.com/Marcher-lam/STDD-COPILOT

---

> Generated by STDD Copilot
> Document Version: 1.0
> Last Updated: 2026-03-27
