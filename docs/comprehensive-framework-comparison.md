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
| **Spec-First TDD** | donnieprakoso | Spec-First TDD (SFTDD) | 原子用例 + 人在环中 |
| **TDAID** | joedevon | Test-Driven AI Development | TDD + AI 代码生成 |
| **ATDD** | swingerman | Acceptance Test-Driven | Uncle Bob 验收测试 |
| **tdder** | t1 | Disciplined TDD | Clean Code + Baby Steps |
| **TDG** | - | TDD Generator | 测试代码生成器 |
| **Outside-In TDD** | tdd-starters | London School | Mockist-style |

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

### Spec-First TDD (donnieprakoso)

```
spec-first-tdd/
├── 00-sftdd-workflow.md         # 系统提示（AI 首先读取）
├── 00-use-case.md               # 功能开发跟踪器
├── 00-issues.md                 # 生产 Bug 跟踪器
└── README.md
```

**核心理念**:
- **原子用例（Atomic Use Cases）**: 以微小的"功能珠子"形式工作
- **人在环中（Human-in-the-Loop）**: 你是飞行员，而不只是旁观者
- **进化式规格（Evolutionary Specs）**: 规格因为你构建而变得严密

**SFTDD 工作流**:
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ 🔴 RED  │───►│🟢 GREEN │───►│Enhance- │───►│🔵REFACTOR│
│Fail Test│    │Min Impl │    │  ment   │    │ Clean Up│
└─────────┘    └─────────┘    │Edge Case│    └─────────┘
                              └─────────┘
```

**三种模式**:
1. Feature Development - 添加用例 → AI 创建测试和代码 → 你批准每个阶段
2. Issue Resolution - 添加问题 → AI 分类和修复 → 同样的 TDD 循环
3. Brainstorming - "不要改变任何东西" → AI 分析和建议 → 无代码更改

### ATDD (swingerman)

```
atdd/
├── CLAUDE.md                    # Claude Code 插件文档
├── .claude/
│   ├── skills/
│   │   ├── atdd/                # 7 步 ATDD 工作流
│   │   ├── atdd-team/           # 团队编排技能
│   │   └── atdd-mutate/         # 变异测试技能
│   ├── agents/
│   │   ├── spec-guardian/       # 捕获实现泄漏
│   │   └── pipeline-builder/    # 生成测试管道
│   └── commands/
│       ├── atdd.md              # 启动 ATDD 工作流
│       ├── spec-check.md        # 审计规格泄漏
│       ├── mutate.md            # 运行变异测试
│       └── kill-mutants.md      # 杀灭存活变异
└── specs/                       # Given/When/Then 规格
```

**核心理念**（Inspired by Uncle Bob's empire-2025）:
- **双测试流约束开发**: 验收测试定义 WHAT，单元测试定义 HOW
- **规格只描述外部可观察行为**: 无类名、API 端点、数据库表
- **人类最终批准**: AI 提议规格，你批准

**ATDD 工作流**:
```
1. Write Given/When/Then specs (domain language only)
                    ↓
2. Generate test pipeline (parser → IR → test generator)
                    ↓
3. Run acceptance tests → they FAIL (red)
                    ↓
4. Implement with TDD until BOTH streams pass
                    ↓
5. Review specs for implementation leakage
                    ↓
6. Mutation testing → verify tests catch bugs
                    ↓
7. Iterate
```

**GWT 规格格式**:
```
;===============================================================
; Description of the behavior being specified.
;===============================================================
GIVEN [precondition in domain language].

WHEN [action the user/system takes].

THEN [observable outcome].
```

**关键原则**:
- "Just enough specs for this sprint" - 不要预先写所有规格
- "Two test streams constrain development" - 验收 + 单元必须都通过
- "Specs describe only external observables" - 只有领域语言

### tdder (t1)

```
tdder/
├── CLAUDE.md                    # 插件文档
├── .claude/
│   ├── skills/
│   │   ├── tdd/                 # 核心 TDD 流程
│   │   │   │                    # Red-Green-Refactor + Baby Steps
│   │   ├── clean-code/          # Clean Code 原则
│   │   │   │                    # Naming, SOLID, Smells, Method Design
│   │   ├── app/                 # APP 质量计算
│   │   │   │                    # Absolute Priority Premise
│   │   ├── java/                # Java 特定约定
│   │   ├── maven/               # Maven 约定
│   │   ├── unfolding-architecture/  # 渐进式架构决策
│   │   ├── integration-architecture/  # 集成消息模式
│   │   └── nested-fixture-pattern/    # JUnit 嵌套 Fixture
│   └── agents/
│       └── clean-code-reviewer/  # 重构阶段自动代码审查
```

**核心特性**:
- **TDD Discipline**: 严格的 Red-Green-Refactor 循环 + Baby Steps + Guessing Game
- **Clean Code Review**: 重构阶段通过 subagent 自动代码审查
- **APP Mass Calculations**: 客观的代码复杂度测量
- **Language-agnostic Core**: TDD 和 Clean Code 原则适用于任何语言
- **Unfolding Architecture**: 渐进式架构决策 - 从简单开始，只在减少复杂度时添加复杂性

**Human-in-the-Loop 配置**:
```markdown
---
hitl: every-phase    # 每个 Red, Green, Refactor 阶段后停止
# or
hitl: end-of-cycle   # 每个完整 Red-Green-Refactor 循环后停止
# or
hitl: off            # 自主运行，最后报告
---
```

### TDAID (Test-Driven AI Development)

```
TDAID/
├── README.md                    # 方法论文档
├── examples/                    # 示例代码和测试
└── best-practices.md            # 最佳实践指南
```

**核心理念**:
- **TDD + AI 代码生成**: 用 TDD 原则改进 LLM 生成代码的质量和速度
- **模式教学**: 提供代码和测试作为 AI 的学习模式
- **示例驱动**: AI 从你的编码风格和测试模式中学习

**TDAID 工作流**:
```
1. Write initial code    → 开发部分功能
2. Write initial tests   → 为初始代码创建测试
3. Teach the AI          → 代码和测试作为模式示例
4. AI-assisted test      → AI 编写额外测试用例
5. AI-assisted impl      → AI 实现代码通过测试
6. Review and refine     → 评估并调整
```

**最佳实践**:
1. Start small - 从定义明确的功能开始
2. Provide clear examples - 包含代表性代码和测试示例
3. Be specific - 清晰传达要测试和实现的内容
4. Iterative approach - 审查和改进 AI 的工作
5. Maintain quality control - 始终审查 AI 生成代码的正确性

### TDD Starters (Outside-In TDD)

```
tdd-starters/
├── rust/                        # Rust TDD Starter
├── java/                        # Java TDD Starter
├── python/                      # Python TDD Starter
├── kotlin/                      # Kotlin TDD Starter
├── javascript/                  # JavaScript TDD Starter
├── typescript/                  # TypeScript TDD Starter
├── cpp/                         # C++ TDD Starter
├── csharp/                      # C# TDD Starter
└── go/                          # Go TDD Starter
```

**核心理念（London School / Mockist TDD）**:
- **Outside-In / Top-Down**: 从外部、特性级别开始，向内构建
- **Mock-First**: 使用 Mock 来隔离测试，强调对象间交互
- **测试驱动设计**: 测试驱动代码结构的设计

**London School vs Detroit School**:
| Aspect | Detroit (Classicist) | London (Mockist) |
|--------|---------------------|------------------|
| Focus | State verification | Interaction verification |
| Style | Inside-Out | Outside-In |
| Mocks | Sparingly | Extensively |
| Design | Emergent | Specified upfront |

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
│  Spec-First TDD (4-Step Enhanced)                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│  │  🔴 RED │───►│🟢 GREEN │───►│⚡Enhance│───►│🔵REFACTOR│                │
│  │Fail Test│    │Min Impl │    │Edge Case│    │ Clean Up│                │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘                │
│       │              │              │              │                       │
│       └──────────────┴──────────────┴──────────────┘                       │
│                     Human-in-the-Loop Approval                            │
│                                                                            │
│  ATDD (7-Step Acceptance)                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ GWT Specs │─►│ Pipeline  │─►│🔴Accept   │─►│  TDD      │              │
│  │(Given/When│  │ Generate  │  │  Tests    │  │Implement  │              │
│  │  /Then)   │  │           │  │   (Red)   │  │ (Green)   │              │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘              │
│        │              │              │              │                      │
│        ▼              ▼              ▼              ▼                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │  Spec     │─►│  Mutation │─►│  ✅ Both  │─►│  Archive  │              │
│  │  Review   │  │  Testing  │  │  Pass     │  │           │              │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘              │
│                                                                            │
│  tdder (Baby Steps + Clean Code Review)                                   │
│  ┌─────────┐    ┌─────────┐    ┌─────────────┐                           │
│  │  🔴 RED │───►│🟢 GREEN │───►│🔵 REFACTOR  │                           │
│  │Baby Step│    │ Min Imp │    │+ Code Review│                           │
│  └─────────┘    └─────────┘    │(subagent)   │                           │
│       │              │         └─────────────┘                           │
│       │              │               │                                   │
│       │              └───────────────┘                                   │
│       │                    │                                              │
│       └────────────────────┘                                              │
│            Hitl: every-phase | end-of-cycle | off                         │
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

| 特性 | AIDD | TDD Guard | Claude Pilot | Spec-First | ATDD | tdder | STDD Copilot |
|------|------|-----------|--------------|------------|------|-------|--------------|
| **测试先行** | ✅ 规则强制 | ✅ Hook 拦截 | ✅ Ralph Loop | ✅ 原子用例 | ✅ GWT Specs | ✅ Baby Steps | ✅ 5 步循环 |
| **最小实现** | ✅ 规则指导 | ✅ AI 验证 | ✅ 绿灯检查 | ✅ Enhancement | ✅ 双流约束 | ✅ Guessing Game | ✅ 检查门 |
| **重构阶段** | ✅ 规则指导 | ✅ Lint 集成 | ✅ 变异审查 | ✅ Clean Up | ✅ Spec Review | ✅ Code Review | ✅ 变异审查 |
| **自动迭代** | ❌ | ❌ | ✅ Ralph Loop | ❌ | ✅ Team Mode | ✅ 可配置 | ✅ Ralph Loop |
| **失败熔断** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 3 次熔断 |
| **变异测试** | ❌ | ❌ | ❌ | ❌ | ✅ Stryker | ❌ | ✅ 伪变异 |
| **E2E 验证** | ❌ | ❌ | ✅ Chrome 集成 | ❌ | ✅ Acceptance | ❌ | ✅ 可选 |
| **多语言** | JS/TS | 6 语言 | TS/JS | Any | Any | Java+ | TS/JS |
| **HITL** | ✅ Vision | ❌ | ✅ Certainty | ✅ Every Phase | ✅ Spec Approval | ✅ 可配置 | ✅ Confirm Gates |

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
| **Spec-First TDD** | 原子用例、人在环中、进化式规格、Enhancement 阶段 |
| **ATDD** | Given/When/Then 规格、双测试流约束、规格泄漏检测、变异测试集成 |
| **tdder** | Baby Steps、Clean Code Review、Unfolding Architecture、APP 质量计算 |
| **TDD Starters** | 多语言 Starter 模板、London School Mockist 风格 |

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
│  3. Constitution (9 Articles) - NEW!                                        │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │                                                                    │  │
│     │   Priority 1 (Blocking):                                          │  │
│     │   - Article 2: TDD (测试先行)                                     │  │
│     │   - Article 7: Security (安全优先)                                │  │
│     │   - Article 9: CI/CD (自动化流水线)                               │  │
│     │                                                                    │  │
│     │   Priority 2 (Warning):                                           │  │
│     │   - Article 1: Library-First (优先使用成熟库)                     │  │
│     │   - Article 3: Small Commits (原子提交)                           │  │
│     │   - Article 4: Code Style (统一风格)                              │  │
│     │                                                                    │  │
│     │   Priority 3 (Suggestion):                                        │  │
│     │   - Article 5: Documentation (文档即代码)                         │  │
│     │   - Article 6: Error Handling (显式错误处理)                      │  │
│     │   - Article 8: Performance (性能默认)                             │  │
│     │                                                                    │  │
│     │   Features: Waivers | Audit Trail | Team Approval                 │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  4. Hook Enforcement System - NEW!                                          │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │                                                                    │  │
│     │   PreToolUse Hook (Blocking):                                     │  │
│     │   - Article 2: TDD Check (测试文件存在性)                         │  │
│     │   - Article 4: Code Style Check (文件长度、TODO 数量)             │  │
│     │   - Article 7: Security Check (硬编码敏感信息)                    │  │
│     │                                                                    │  │
│     │   PostToolUse Hook (Suggestion):                                  │  │
│     │   - Article 5: Documentation Check (JSDoc 覆盖)                   │  │
│     │   - Article 6: Error Handling Check (空 catch 块)                 │  │
│     │   - Article 8: Performance Check (N+1 查询)                       │  │
│     │                                                                    │  │
│     │   Commands: stdd hooks install | verify | enable | disable        │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  5. Skill Graph Engine                                                      │
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
│  6. Vector Memory System                                                    │
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
│  7. 50+ Commands                                                            │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │ Core: 9 commands (init/new/explore/ff/continue/apply/verify/archive│  │
│     │       /graph)                                                      │  │
│     │ Graph: 7 commands (visualize/analyze/run/parallel/history/replay/  │  │
│     │        recommend)                                                  │  │
│     │ SDD: 4 commands (api-spec/schema/contract/validate)                │  │
│     │ TDD: 4 commands (outside-in/mock/factory/mutation)                 │  │
│     │ Constitution: 1 command (constitution) - NEW!                      │  │
│     │ Hooks: 5 commands (install/verify/enable/disable/status) - NEW!    │  │
│     │ Utils: 10+ commands (guard/prp/supervisor/context/etc.)            │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 融合来源 (更新版)

| 来源 | 借鉴内容 |
|------|----------|
| **SpecKit** | ✅ Constitution 机制 (9 篇开发条例)、模板系统、多代理支持理念 |
| **OpenSpec** | ✅ Delta Specs、变更管理、产物结构、工作目录 |
| **BMAD-METHOD** | ✅ 阶段组织、module.yaml、AGENTS.md |
| **AIDD** | ✅ Vision Document 理念、TDD 规则引擎思想 |
| **TDD Guard** | ✅ **Hook Enforcement System** (Claude Code Hooks 集成) |
| **Claude Pilot** | ✅ Ralph Loop、E2E 验证、Agent 团队 |
| **Spec-First TDD** | ✅ 原子用例、人在环中、进化式规格、Enhancement 阶段 |
| **ATDD** | ✅ Given/When/Then 规格、双测试流约束、规格泄漏检测、变异测试集成 |
| **tdder** | ✅ Baby Steps、Clean Code Review、Unfolding Architecture、APP 质量计算 |
| **TDD Starters** | ✅ 多语言 Starter 模板、London School Mockist 风格 |

### Constitution + Hooks 集成架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STDD Copilot Enforcement Architecture                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      STDD Constitution                                 │  │
│  │                    (9 篇开发条例)                                      │  │
│  │                                                                        │  │
│  │   定义: schemas/constitution/                                         │  │
│  │   ├── constitution.yaml      # 主配置                                 │  │
│  │   └── articles/              # 9 篇条例                               │  │
│  │       ├── 01-library-first.md                                        │  │
│  │       ├── 02-test-driven-development.md                              │  │
│  │       ├── 03-small-commits.md                                        │  │
│  │       ├── 04-code-style.md                                           │  │
│  │       ├── 05-documentation.md                                        │  │
│  │       ├── 06-error-handling.md                                       │  │
│  │       ├── 07-security-first.md                                       │  │
│  │       ├── 08-performance.md                                          │  │
│  │       └── 09-continuous-integration.md                               │  │
│  │                                                                        │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                           │
│                                  ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Hook Enforcement                                  │  │
│  │                    (执行层)                                            │  │
│  │                                                                        │  │
│  │   脚本: .claude/hooks/                                                │  │
│  │   ├── pre-file-write.js      # Article 2, 4, 7 (Blocking)            │  │
│  │   └── post-file-write.js     # Article 5, 6, 8 (Suggestion)          │  │
│  │                                                                        │  │
│  │   配置: ~/.claude/settings.json                                       │  │
│  │   {                                                                    │  │
│  │     "hooks": {                                                        │  │
│  │       "PreToolUse": [...],                                            │  │
│  │       "PostToolUse": [...]                                            │  │
│  │     }                                                                 │  │
│  │   }                                                                   │  │
│  │                                                                        │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                           │
│                                  ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Claude Code Integration                           │  │
│  │                    (运行时)                                            │  │
│  │                                                                        │  │
│  │   用户操作 ──► PreToolUse Hook ──► 验证 ──► 执行/阻断               │  │
│  │                                │                                       │  │
│  │                                ▼                                       │  │
│  │                          PostToolUse Hook ──► 建议                    │  │
│  │                                                                        │  │
│  │   CLI 管理:                                                            │  │
│  │   $ stdd hooks install      # 安装 hooks                              │  │
│  │   $ stdd hooks verify       # 验证配置                                │  │
│  │   $ stdd hooks disable      # 禁用 (紧急情况)                         │  │
│  │   $ stdd constitution       # 查看条例                                │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hook Enforcement vs TDD Guard 对比

| 特性 | TDD Guard | STDD Copilot Hooks |
|------|-----------|-------------------|
| **Hook 类型** | PreToolUse | PreToolUse + PostToolUse |
| **检查范围** | TDD 合规 | Constitution 9 篇条例 |
| **阻断级别** | Error only | Error + Warning + Suggestion |
| **豁免机制** | ❌ 无 | ✅ Waivers with expiration |
| **审计日志** | ❌ 无 | ✅ waiver.yaml 记录 |
| **多语言** | 6 语言 | 框架无关 (基于 Node.js) |
| **CLI 管理** | ❌ 无 | ✅ `stdd hooks` 命令组 |

### Constitution vs SpecKit Constitution 对比

| 特性 | SpecKit Constitution | STDD Copilot Constitution |
|------|---------------------|--------------------------|
| **条例数量** | 9 篇 | 9 篇 |
| **执行方式** | 文档指导 | Hook 自动执行 |
| **豁免管理** | ❌ 无 | ✅ 临时豁免 + 审批流程 |
| **优先级** | 全部相同 | Blocking/Warning/Suggestion |
| **命令支持** | 无 CLI | ✅ `/stdd:constitution` 命令 |
| **审计追踪** | ❌ 无 | ✅ waivers.yaml 记录 |

---

## 🔗 参考链接

### SDD 框架
- **SpecKit**: https://github.com/github/spec-kit
- **OpenSpec**: https://github.com/Fission-AI/OpenSpec
- **BMAD-METHOD**: https://github.com/bmad-code-org/BMAD-METHOD

### TDD 框架

**AI-Assisted TDD**:
- **AIDD**: https://github.com/paralleldrive/aidd
- **TDD Guard**: https://github.com/nizos/tdd-guard
- **Claude Pilot**: https://github.com/changoo89/claude-pilot
- **TDAID**: https://github.com/joedevon/TDAID (Test-Driven AI Development)

**Spec-First Approaches**:
- **Spec-First TDD**: https://github.com/donnieprakoso/spec-first-tdd
- **ATDD**: https://github.com/swingerman/atdd (Uncle Bob's Acceptance Test Driven)

**Disciplined TDD**:
- **tdder**: https://github.com/t1/tdder (Baby Steps + Clean Code Review)

**TDD Starters**:
- **TDD Starters**: https://github.com/tdd-starters (Multi-language TDD templates)

### STDD Copilot
- **STDD Copilot**: https://github.com/Marcher-lam/STDD-COPILOT

### 参考方法论
- **GOOS Book**: Growing Object-Oriented Software, Guided by Tests (London School)
- **Kent Beck's TDD**: Test-Driven Development: By Example (Detroit/Classicist)
- **Uncle Bob's empire-2025**: Spec-Driven Design + ATDD methodology

---

> Generated by STDD Copilot
> Document Version: 1.1
> Last Updated: 2026-03-27
