# STDD Copilot 系统架构

version: "1.0"
last_updated: "2026-03-27"

## 概述

STDD Copilot 是一套基于 **Skill Graph（技能图谱）** 的全链路自动化开发框架，将 **Spec-First (需求规范优先)** 与 **TDD (测试驱动开发)** 深度融合。

---

## 系统架构图

```mermaid
graph TB
    subgraph UserLayer["👤 用户层"]
        U[用户]
        CLI[CLI 命令行]
        IDE[IDE 集成]
    end

    subgraph SkillGraphEngine["🚀 Skill Graph 引擎"]
        VIS[Visualizer<br/>可视化引擎]
        ANA[Analyzer<br/>分析引擎]
        SCHED[Scheduler<br/>调度引擎]
        TRACK[Tracker<br/>追踪引擎]
        COND[Condition Engine<br/>条件引擎]
        PARA[Parallel Executor<br/>并行执行器]
        REC[Recommender<br/>推荐器]
    end

    subgraph CoreSkills["⚙️ 核心 Skills"]
        INIT[stdd-init<br/>初始化]
        PROP[stdd-propose<br/>需求提案]
        CLAR[stdd-clarify<br/>需求澄清]
        CONF[stdd-confirm<br/>需求确认]
        SPEC[stdd-spec<br/>生成规格]
        PLAN[stdd-plan<br/>任务拆解]
        EXEC[stdd-execute<br/>TDD执行]
        DOC[stdd-final-doc<br/>生成文档]
        COMMIT[stdd-commit<br/>代码提交]
    end

    subgraph SDDSkills["📋 SDD 增强"]
        API[stdd-api-spec<br/>API规范]
        SCH[stdd-schema<br/>类型规范]
        CONT[stdd-contract<br/>契约测试]
        VAL[stdd-validate<br/>规范验证]
    end

    subgraph TDDSkills["🧪 TDD 增强"]
        OI[stdd-outside-in<br/>外向内TDD]
        MOCK[stdd-mock<br/>Mock生成]
        FACT[stdd-factory<br/>数据工厂]
        MUT[stdd-mutation<br/>变异测试]
    end

    subgraph AssistantSkills["🤖 辅助 Skills"]
        GUARD[stdd-guard<br/>TDD守护]
        PRP[stdd-prp<br/>PRP规划]
        SUP[stdd-supervisor<br/>多Agent协调]
        CTX[stdd-context<br/>三层文档]
        ITER[stdd-iterate<br/>自主迭代]
        MEM[stdd-memory<br/>向量记忆]
        PAR[stdd-parallel<br/>并行执行]
        ROLE[stdd-roles<br/>多角色协作]
        MET[stdd-metrics<br/>质量指标]
        LRN[stdd-learn<br/>自适应学习]
    end

    subgraph Storage["💾 存储层"]
        MEMORY[stdd/memory/<br/>记忆库]
        GRAPH[stdd/graph/<br/>Graph配置]
        HISTORY[stdd/history/<br/>执行历史]
        DRAFTS[stdd/drafts/<br/>草案文件]
        SPECS[stdd/specs/<br/>规格文件]
        PLANS[stdd/plans/<br/>任务计划]
        REPORTS[stdd/reports/<br/>报告文件]
    end

    subgraph ExternalAI["🤖 外部 AI 引擎"]
        CLAUDE[Claude Code]
        QWEN[Qwen Code]
        OPENCLAW[OpenClaw]
    end

    %% 用户交互
    U --> CLI
    CLI -->|"stdd-*"|cmd|
    IDE --> CLI

    %% Skill Graph 调度
    cmd -->|VIS|ANA|SCHED|TRACK

    TRACK --> COND
    SCHED --> PARA
    ANA --> REC

    %% 核心流程
    INIT --> PROP
    PROP --> CLAR
    CLAR --> CONF
    CONF --> SPEC
    SPEC --> PLAN
    PLAN --> EXEC
    EXEC --> DOC
    DOC --> COMMIT

    %% SDD 增强 (并行)
    SPEC -.-> API
    SPEC -.-> SCH
    EXEC -.-> CONT
    EXEC -.-> VAL

    %% TDD 增强 (并行)
    EXEC -.-> OI
    EXEC -.-> MOCK
    EXEC -.-> FACT
    EXEC -.-> MUT

    %% 辅助 Skills
    GUARD -.-> EXEC
    PRP -.-> PLAN
    SUP -.-> EXEC
    CTX -.-> ALL
    ITER -.-> EXEC
    MEM -.-> ALL
    PAR -.-> EXEC
    ROLE -.-> ALL
    MET -.-> VERIFY
    LRN -.-> ALL

    %% 存储
    VIS --> GRAPH
    ANA --> HISTORY
    TRACK --> HISTORY
    EXEC --> MEMORY

    %% 外部 AI
    EXEC --> CLAUDE
    EXEC --> QWEN
    EXEC --> OPENCLAW

    style VIS fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style ANA fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style SCHED fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style TRACK fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style COND fill:#fff3e0,stroke:#01579b,stroke-width:2px
    style PARA fill:#fff3e0,stroke:#01579b,stroke-width:2px
    style REC fill:#fff3e0,stroke:#01579b,stroke-width:2px
```

```

---

## 核心组件说明

### 1. Skill Graph 引擎
| 组件 | 职责 | 输入 | 输出 |
|------|------|------|------|
| **Visualizer** | 生成依赖图可视化 | YAML Graph 定义 | Mermaid/HTML 图 |
| **Analyzer** | 分析状态和路径 | 当前状态、Graph 定义 | 分析报告、路径列表 |
| **Scheduler** | 调度 Skill 执行 | 任务列表、依赖关系 | 执行计划 |
| **Tracker** | 追踪执行历史 | 执行事件 | 历史记录 |
| **Condition Engine** | 条件判断 | 条件表达式 | 布尔结果 |
| **Parallel Executor** | 并行执行无依赖任务 | 任务列表 | 并行执行结果 |
| **Recommender** | 智能推荐 | 上下文、历史 | 推荐列表 |

### 2. 核心 Skills (工作流)
| 阶段 | Skill | 职责 |
|------|------|------|
| **Init** | `/stdd-init` | 初始化环境和记忆库 |
| **Propose** | `/stdd-propose` | 提出需求草案 |
| **Clarify** | `/stdd-clarify` | 多轮需求澄清 |
| **Confirm** | `/stdd-confirm` | 人类确认门 |
| **Spec** | `/stdd-spec` | 生成 BDD 规格 |
| **Plan** | `/stdd-plan` | 任务微隔离拆解 |
| **Execute** | `/stdd-execute` | Ralph Loop TDD 执行 |
| **Document** | `/stdd-final-doc` | 生成最终文档 |
| **Commit** | `/stdd-commit` | 原子化提交 |

### 3. SDD 增强 Skills
| Skill | 职责 | 触发条件 |
|------|------|----------|
| `/stdd-api-spec` | OpenAPI/TypeScript 规范生成 | 有 API 需求 |
| `/stdd-schema` | JSON Schema/Zod 类型生成 | 有类型定义需求 |
| `/stdd-contract` | 消费者驱动契约测试 | 有 API 契约 |
| `/stdd-validate` | 规范一致性验证 | 规格完成后 |

### 4. TDD 增强 Skills
| Skill | 职责 | 与核心流程集成 |
|------|------|------------------|
| `/stdd-outside-in` | E2E→集成→单元 层层推进 | Execute 阶段可选 |
| `/stdd-mock` | 自动 Mock 生成 | Execute 阶段并行 |
| `/stdd-factory` | 测试数据工厂 | Execute 阶段并行 |
| `/stdd-mutation` | 变异测试 | Verify 阶段执行 |

### 5. 辅助 Skills
| Skill | 类型 | 职责 |
|------|------|------|
| `/stdd-guard` | Hook | TDD 守护钩子 |
| `/stdd-prp` | 规划 | What/Why/How/Success 规划 |
| `/stdd-supervisor` | 协调 | Supervisor 多 Agent 协调 |
| `/stdd-context` | 上下文 | 三层文档架构加载 |
| `/stdd-iterate` | 迭代 | Plan-Execute-Reflect 循环 |
| `/stdd-memory` | 记忆 | 向量数据库语义搜索 |
| `/stdd-parallel` | 执行 | DAG 并行执行 |
| `/stdd-roles` | 协作 | PO/Dev/Tester/Reviewer 角色 |
| `/stdd-metrics` | 指标 | 质量指标仪表板 |
| `/stdd-learn` | 学习 | 自适应学习系统 |

---

## 存储架构

```
stdd/
├── memory/                    # 持久化记忆
│   ├── foundation.md         # 项目基础约束
│   └── components.md         # 组件架构
├── graph/                     # Skill Graph 配置
│   ├── skills.yaml           # Graph 节点定义
│   ├── config.json           # 引擎配置
│   └── conditions.json       # 条件引擎配置
├── history/                  # 执行历史
│   └── exec-*.json            # 执行记录
├── drafts/                   # 草案文件
│   ├── proposal.md           # 需求提案
│   └── clarification.json    # 澄清记录
├── specs/                    # 规格文件
│   ├── features/             # Feature 定义
│   └── scenarios/             # Scenario 定义
├── plans/                    # 任务计划
│   ├── tasks.md              # 任务列表
│   └── dependencies.json     # 依赖关系
└── reports/                  # 报告文件
    ├── mutation.html          # 变异测试报告
    ├── validation.json         # 验证报告
    └── contract.json           # 契约测试报告
```

---

## Ralph Loop (TDD 循环)
```
┌──────────────────────────────────────────────────────────┐
│                    Ralph Loop                               │
│                                                            │
│  🔴 红灯       →    🔍 静态检查    →    🟢 绿灯           │
│  生成失败测试        语法/类型检查       最简实现           │
│                                                            │
│       →    🧪 伪变异审查    →    🔵 重构    →    ✅ 完成   │
│           检测骗绿灯断言       优化代码                         │
│                                                            │
│  ⚠️ 连续失败 3 次 → 自动熔断 (/stdd-revert)               │
└──────────────────────────────────────────────────────────┘
```
```
**5级防跑偏防御体系**:
1. **人机确认门** - 关键决策需人类确认
2. **微任务隔离** - 5~6 个原子任务，降低上下文迷失
3. **连续失败回滚** - 3 次失败自动熔断
4. **静态质检门** - 语法/类型检查在测试前执行
5. **伪变异审查** - 检测骗绿灯断言
```
