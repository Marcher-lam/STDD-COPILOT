# STDD Copilot 高阶实战：Agent 强化学习与进化遗传图谱

本文档弃用了简单的 Todo-List 示例，直接从 0 到 1 演示如何使用 STDD Copilot 框架落地一个极具工程复杂度的硬核项目：**包含进化遗传算法 (GA) 的 Agent 强化学习 (RL) 框架**。

这是 STDD Copilot 的**终极指北**——它端到端拉通了所有的斜杠指令，以大厂架构师的"顶层设计、抓手破局、数据闭环"视角，为你提供一份可以直接照做、降维打击的标准答案。

---

## 指令生命周期全景图

复杂系统开发决不能一蹴而就。我们将执行以下 8 大战役，覆盖全部技能卡：

1. **全局基线与愿景** (`init`, `vision`, `context`)
2. **战略破局与澄清** (`brainstorm`, `prp`, `propose`, `clarify`, `confirm`)
3. **标准化契约前置** (`spec`, `schema`, `api-spec`, `contract`)
4. **架构调度与委派** (`plan`, `supervisor`, `roles`, `parallel`)
5. **Graph 引擎编排与自愈调度** (`graph visualize`, `graph analyze`, `graph run`, `graph parallel`, `graph recommend`)
6. **硬核 TDD 落地** (`outside-in`, `mock`, `factory`, `apply`, `execute`)
7. **防腐化质量拦截** (`complexity`, `mutation`, `metrics`, `certainty`)
8. **验收闭环与归档** (`verify`, `validate`, `user-test`, `final-doc`, `commit`, `archive`, `learn`, `graph`, `help`)

---

## 战役 1：全局基线与愿景对齐 (The Foundation)

一切从建立信任与全局基线（Context）开始。不要写一行代码，先统一思想。

```bash
# 1. 建立具有 AI 工程偏好的 STDD 基础设施
/stdd:init

# 2. 注入顶层愿景，确保 Agent 的代码具有长期演进能力
/stdd:vision 目标是构建一个支持 PPO 与神经进化（Neuroevolution）混合驱动的 Agent 训练架构，能够在非平稳环境中保持优秀的遗传多样性。

# 3. 建立三层文档架构（Foundation/Component/Feature）防止后续上下文 Token 耗尽
/stdd:context
```

## 战役 2：提案破局与深度澄清 (战略层)

面对算法架构需求，必须先拆解底层逻辑。

```bash
# 1. 开启头脑风暴：评估多目标优化中，纯 RL 与进化遗传混合算法的理论边界
/stdd:brainstorm

# 2. 结构化立项（What/Why/How/Success）：确定框架的 MVP 范围
/stdd:prp 规划第一版进化遗传 RL 框架的边界和验收指标。

# 3. 发起正式变更提案
/stdd:propose 构建遗传变异与深度强化学习统一的框架，支持交叉 (Crossover)、变异 (Mutation) 及适应度 (Fitness) 评估。

# 4. 极致需求深挖（78 种结构化推导）
/stdd:clarify --elicitation=first-principles
# AI [系统] 诊断反问：
# - 基因组 (Genome) 是直接编码超参数，还是编码神经网络的 Topology？
# - 适应度评估 (Fitness) 生命周期是同步的还是异步分布式的？

# 5. 用户确认门（HitL）。双方签字画押，严防中途需求蔓延。
/stdd:confirm
```

## 战役 3：契约即真理 (Source of Truth)

需求明确后，强制进行规格前置。代码只是规格的翻译。

```bash
# 1. 将确认的需求转化为严谨的 BDD 规格行为树 (Given/When/Then)
/stdd:spec

# 2. 类型引擎前置：自动生成 Genome 矩阵和 State 观测空间的 Zod/JSON Schema 定义
/stdd:schema generate --format=zod --strict

# 3. API 契约：定义 Agent 节点与外部环境（如 OpenAI Gym）的 gRPC 或 REST 数据流规约
/stdd:api-spec

# 4. 消费者驱动契约：规定并发进程池间歇通信的 5 种边界模式
/stdd:contract
```

## 战役 4：架构微隔离与调度 (战术层)

复杂度需要被分解为原子级颗粒度，并分配给专业的微角色。

```bash
# 1. 架构师拆卡：将大系统拆为"种群管理"、"选择算子"、"PPO Actor-Critic"等 15 个原子任务
/stdd:plan

# 2. 委派执行制：使用 Supervisor 协调多个分层代理（负责调度底层模型工作）
/stdd:supervisor

# 3. 约束 Agent 角色身份：为不同任务挂载专属专家人设（如算法专家、性能工程师）
/stdd:roles

# 4. DAG 无依赖任务并行编排（并发计算变异率和环境封装代码）
/stdd:parallel
```

## 战役 5：Graph 引擎编排与自愈调度 (引擎层)

STDD Copilot 的 Graph 引擎是整个框架的调度核心。它将 28 个 Skill 以 DAG 形式组织，支持拓扑可视化、意图路由、分层并行执行和反向自愈。

### 5.1 可视化与路径分析

```bash
# 生成当前项目的 Mermaid 依赖图
/stdd:graph visualize

# 生成 HTML 可交互图（支持缩放、节点点击、实时状态）
/stdd:graph visualize --format=html

# 分析当前执行状态、阻塞节点、可并行路径
/stdd:graph analyze

# 分析特定 Skill 的上下游依赖链
/stdd:graph analyze --skill=stdd-execute

# 列出从当前位置的所有可执行路径
/stdd:graph analyze --paths
```

### 5.2 意图路由与动态拓扑

Graph 引擎内置 DynamicGraphRouter，根据任务意图自动裁剪 DAG 依赖树：

```bash
# 意图路由：hotfix 快通道（跳过 spec/plan，直接 apply）
/stdd:graph run stdd-apply --intent=hotfix
# 路径: stdd-propose → stdd-apply → stdd-verify → stdd-commit

# 意图路由：feature 标准瀑布流（全 5 阶段）
/stdd:graph run stdd-commit --intent=feature
# 路径: stdd-propose → stdd-spec → stdd-plan → stdd-apply → stdd-verify

# 意图路由：research 探索模式（跳过执行，只出文档）
/stdd:graph run stdd-final-doc --intent=research
# 路径: stdd-explore → stdd-brainstorm → stdd-final-doc

# 干运行模式：只显示计划不执行
/stdd:graph run stdd-plan --dry-run

# 跳过已完成的步骤（利用断点缓存）
/stdd:graph run stdd-execute --skip-completed
```

### 5.3 异构算力横向拓扑

22 个 AI 引擎（Claude Code / Cursor / Copilot / Windsurf 等）按 4 Tier 分层，ParallelExecutor 将 DAG 拓扑分层后，同层节点可分配不同引擎并行执行：

```bash
# 识别当前 DAG 中可并行的 Skill 组
/stdd:graph parallel --detect
# 输出:
#   组 1: specification (可立即执行)
#     ├── stdd-api-spec  → Claude Code (Tier 1)
#     └── stdd-schema    → Cursor (Tier 1)
#   组 2: verification (等待 stdd-execute)
#     ├── stdd-mutation  → Claude Code (Tier 1)
#     ├── stdd-validate  → Copilot (Tier 2)
#     └── stdd-contract  → Windsurf (Tier 1)

# 执行全部可并行的 Skill 组
/stdd:graph parallel --execute

# 执行特定并行组（all 策略：全部成功才算通过）
/stdd:graph parallel --execute --group=verification

# 设置最大并行度
/stdd:graph parallel --max-workers=4

# 并行组策略选择
# all  - 全部成功才算通过（默认，用于 verification 组）
# any  - 任一成功即通过（用于 testing 辅助组）
# race - 第一个成功即停止（用于竞速场景）
```

**引擎 Tier 降级链**：当指定引擎失败时，自动沿 Tier 链降级：
```
Tier 1 (Claude Code) → Tier 2 (Copilot/Aider) → Tier 3 (Qwen/Doubao)
```

### 5.4 反向自愈引擎

当 DAG 节点执行失败时，不再简单回退一步，而是沿依赖链向上多跳传播，找到真正的"决策点"回炉重造：

```
场景：stdd-execute 节点在 TDD 循环中反复失败

自动执行流程：
  1. EvidenceCapture 截取结构化错误快照
     ├── 错误类型、堆栈、输入快照、阶段信息
     └── SHA256 指纹去重，防止重复证据膨胀

  2. ErrorPropagator 多跳向上传播
     stdd-execute → stdd-plan → stdd-spec
     ├── stdd-plan (category: planning) = 决策点！
     └── 沿途累积 2 跳传播证据

  3. 定位到决策点 stdd-plan，注入完整证据链
     ├── 证据报告：失败节点、传播路径、指令摘要
     └── 部分缓存清理（只清理受影响节点）

  4. stdd-plan 回炉重造，基于证据调整任务拆解
     └── 重新执行下游 stdd-execute → 成功
```

**决策点识别规则**：
- `category: planning` 的节点（如 stdd-plan）
- 带 `gate: human_approval` 的节点（如 stdd-confirm）
- 扇出点（有 2+ 个后继依赖的节点）

**熔断机制**：传播到根节点仍无法自愈时，输出结构化失败报告终止执行。

### 5.5 幂等断点缓存

GraphCacheManager 通过 SHA256 指纹化节点输入，实现 DAG 执行的断点续传：

```bash
# 已执行的节点输出会被缓存，下次运行自动跳过
/stdd:graph run stdd-execute --skip-completed

# 查看执行历史
/stdd:graph history --last=10

# 回放特定执行（含证据链）
/stdd:graph replay exec-20260403-001

# 回放并重新执行
/stdd:graph replay exec-20260403-001 --re-execute
```

### 5.6 智能推荐

```bash
# 获取下一步推荐
/stdd:graph recommend

# 基于当前上下文推荐
/stdd:graph recommend --context=current

# 基于目标推荐
/stdd:graph recommend --goal="完成遗传算法选择算子"
```

## 战役 6：极限 TDD 落地 (执行层)

这是 Ralph Loop 运转的战场，不允许**没过测试就交付**的伪动作。

```bash
# 1. 外向内驱动：从环境与种群交互的 E2E 测试开始向下推导集成和单元测试
/stdd:outside-in --start=e2e

# 2. 隔离业务依赖：自动模拟 (Mock) 外部的渲染沙盒环境
/stdd:mock generate --api=/env/step

# 3. 造数据闭环：通过工厂模式生成边界异常的初代种群数据供测试使用
/stdd:factory

# 4. 领取微任务卡片，进入局部编码上下文
/stdd:apply

# 5. 核心：启动 The Ralph Loop 执行循环（红灯 → 静检 → 绿灯 → 变异 → 重构）
/stdd:execute
```

## 战役 7：质量拦截与防腐化门禁 (质管层)

完成代码不等于质量合格，必须通过量化数据反逼代码精简。

```bash
# 1. APP Mass 结构化复杂度扫描，防止计算图写成"屎山"
/stdd:complexity src/core/genetic/

# 2. 伪变异审查：主动修改遗传变异概率的核心随机数逻辑，看看测试会不会绿（防骗绿灯拦截）
/stdd:mutation run --mode=deep --file=src/core/genetic/MutationOp.ts

# 3. 多元数据仪表盘汇总（代码行数、认知复杂度、分支覆盖）
/stdd:metrics trend

# 4. 架构师信心评估：大语言模型进行 5 维度置信度推理，达标才允许推进
/stdd:certainty
```

## 战役 8：全域验收与永久闭环 (交付层)

最后一步，拉通文档与代码一致性，完成架构沉淀。

```bash
# 1. 规范防溢露校对：验证最终交付的代码与 Phase 3 写的 BDD 是否 100% 映射
/stdd:validate --review

# 2. BDD 双向验证执行
/stdd:verify

# 3. 客户用例模拟：产出给 QA 团队/AI 测试代理的验收剧本
/stdd:user-test --agent --human

# 4. 生成最终架构白皮书（ADR、时序图聚合）
/stdd:final-doc

# 5. 原子化带上下文的 GIT 提交
/stdd:commit

# 6. 一切落定，进入归档区作为审计日志和知识库
/stdd:archive

# 7. 闭环学习系统：提取本次 RL 项目架构风格，形成 Pattern，给后续其它算法开发使用
/stdd:learn analyze-patterns
```

---

## 特殊操作场景

除了上述的从 0 到 1 稳妥流程，日常也存在以下需求：

**场景 A：一键极速流（高确定性任务）**
如果只需要写一个小评估函数作为框架补充，无需过多会议：
```bash
/stdd:turbo 实现一个基于轮盘赌法则 (Roulette Wheel) 的选择算子
```

**场景 B：带防御性的修 Bug 闭环（生产事故支援）**
如果 RL Agent 在训练后期出现梯度爆炸问题：
```bash
# 自动通过 TDD 补充失败的用例复现 Bug → 验证修复 → 加入回归
/stdd:issue "PPO_Clip 超过阈值导致 Loss 变 NAN"
```

**场景 C：陷入无尽重试泥潭**
当一个复杂依赖报错无法通过测试，不要手动乱改，直接托管给机器死磕：
```bash
# 自动 Plan-Execute-Reflect 递归试错
/stdd:iterate
```

**场景 D：跨大项的语义记忆检索**
如果你在另一个新项里面需要回忆当前项目如何定义 Crossover 算子：
```bash
/stdd:memory "搜索遗传算子里交叉策略的最佳实践类型"
```

**场景 E：被条例拦截与强制豁免**
如果你为了快速验证，故意违反了 Article 2 (TDD)，触发了红线被 Hook 拒绝写入。如果有充足的架构理由：
```bash
/stdd:constitution waiver --article=2 --reason="当前算法探索期，只需快速验证收敛性，后续补齐测试"
```

**场景 F：Graph 反向自愈实战**
当 `stdd-execute` 在 TDD 循环中连续失败 3 次，Graph 引擎自动触发反向自愈：
```bash
# 自愈引擎会自动执行以下流程，无需手动干预：
# 1. 截取错误证据（EvidenceCapture）
# 2. 多跳传播到策划节点（ErrorPropagator）
# 3. 策划节点基于证据重新规划
# 4. 重新执行下游节点
#
# 你可以通过 history 查看自愈过程：
/stdd:graph history --failures
/stdd:graph replay <execution-id>
```

**场景 G：异构引擎混合编排**
在大型项目中，不同阶段使用不同的 AI 引擎获得最佳效果：
```bash
# 查看当前可用的引擎和 Tier 分层
/stdd:graph analyze

# 并行执行验证组，自动分配不同引擎
/stdd:graph parallel --execute --group=verification
# stdd-mutation  → Claude Code（变异测试需要深度推理，Tier 1）
# stdd-validate  → Copilot（规范验证规则明确，Tier 2 足够）
# stdd-contract  → Windsurf（契约测试需要完整 Skill，Tier 1）

# 如果某引擎失败，自动 Tier 降级重试
# Tier 1 失败 → 尝试 Tier 2 → 尝试 Tier 3 → 无可用引擎则报错
```

**场景 H：Graph 可视化与架构审查**
```bash
# 生成全项目 Skill 依赖的 Mermaid 图，用于架构评审
/stdd:graph visualize

# 分析瓶颈：哪些节点阻塞了后续流程
/stdd:graph analyze --bottlenecks

# 查看完整的执行历史和自愈记录
/stdd:graph history --last=20

# 回放某次失败的执行，查看证据链
/stdd:graph replay exec-20260403-001 --from=3 --to=5

# 智能推荐下一步最优操作
/stdd:graph recommend --context=current
```

---

## Graph 引擎组件速查

| 组件 | 源文件 | 职责 |
|------|--------|------|
| DynamicGraphRouter | `src/utils/dynamic-router.js` | 意图自适应拓扑裁剪（hotfix/feature/research） |
| GraphExecutor | `src/utils/graph-executor.js` | 生命周期执行 + 反向自愈 + 异构并行集成 |
| GraphCacheManager | `src/utils/graph-cache.js` | SHA256 指纹化断点缓存 |
| EvidenceCapture | `src/utils/evidence-capture.js` | 结构化错误证据采集与链累积 |
| ErrorPropagator | `src/utils/error-propagator.js` | 多跳向上传播与智能决策点定位 |
| HeterogeneousAdapter | `src/utils/heterogeneous-adapter.js` | 22 引擎 Tier 分层适配与降级链 |
| ParallelExecutor | `src/utils/parallel-executor.js` | Kahn's 拓扑分层并行执行 |

---

> 因为信任，所以简单。看懂这套流程，你就不再是个在 Copilot 对话框里盲人摸象的代码工，而是端到端对结果负责的 AI 架构师。
