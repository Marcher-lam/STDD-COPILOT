# 模型强度适配：STDD 的约束预算化

> Version: 1.0 | Last Updated: 2026-11-05
>
> 基模越强，"给弱模型装矫正器"的约束越像开销。本文回答：STDD 哪些约束随模型增强而衰减、哪些不衰减、哪些反而更增值，以及落地了什么。

---

## 核心判断

强基模型（长上下文、强规划、自主长跑）改变了约束的性价比，但没有取消约束存在的理由：

- **意图对齐不是能力问题**——再强的模型也不知道人类想要什么；规格驱动（delta specs、stdd/specs）不随模型强度衰减（OpenSpec 在基模最强的时期反而增长最快，即为此证）。
- **验证不对称永恒存在**——"验证什么"是人类的意图；强模型的假绿灯带着自信来，**更**危险。证据门禁（红灯证据、mutation、冲突阻断）反而增值。
- **为弱模型设计的补偿层在起反效果**——微任务硬上限、仪式化澄清、角色模拟、多层暂停，在强模型下是 token 税和打断税。

**定位转变**：从"给弱模型装矫正器"→"**给强模型管信任边界**"。

## 约束分类学

| 类别 | 判断 | STDD 中的机制 |
|---|---|---|
| **不衰减** | 保留 | 规格/delta 事实源、scope 契约、审计工件（rulings/deferred/baseline）、证据链 |
| **反增值** | 强化 | 红灯证据门禁、mutation、delta 冲突阻断、风险触发暂停 |
| **衰减** | 预算化/降级为可选 | 微任务上限（→ 规模函数）、78 方法澄清（→ 可选工具箱）、12 角色模拟 / SudoLang（→ legacy 标记）、阶段触发确认门（→ 风险触发） |

## 四条设计原则

1. **证据型不仪式型**——门禁必须机器可自动判定，消灭"需要人盯着看"的仪式
2. **风险触发不阶段触发**——到站必停改为：低置信 / 不可逆 / 范围外才停
3. **规模成比例**——约束密度是变更规模的函数，不是全局常量
4. **默认给自由，异常给约束**——默认 light，检测到风险信号加严

## 已落地（P0）

### 1. 任务预算自适应（plan）

`plan.js` 硬编码 `maxTasks=6` 废除。预算 = 规模函数：基础 4；scope 项 ≥3/+1、≥5/+2；提案 ≥600 词 +1；跨切面风险信号（migration/auth/payment/api…）≥2 再 +1；范围 [3,10]。`stdd/config.yaml` `planning.max_tasks: auto|<n>` 可固定。超出预算时提示"提案通常已是 Epic，建议拆分"。

### 2. 确认门风险触发（confirm）

`hitl.mode: "risk-triggered"`：确认门自行判定——certainty 评估 ≥ auto_threshold（默认 0.95，中间带 0.7-0.95 通过但带警告）**且**无不可逆/高危信号（migration/删数据/auth/payment/breaking…）时自动通过，决策与依据落盘 `confirm-decision.json`（可审计）；否则状态置 `pending-human`，不写 confirmed，留给人工决策。其他模式保持原行为。

### 3. 顺手修复：confirm 命令正则崩溃

`extractSection` 的 `**title**` 正则未转义（"Nothing to repeat"）——`stdd confirm` 此前在任何项目都直接崩溃。约束层腐蚀无人发现的实证：门禁命令长期无覆盖。

### 4. DAG 渐进严谨度（前序已落地，见 framework-benchmark 第 18 条）

`graph run --rigor light|standard|strict` 按 intent 默认映射——"例行变更最小仪式、高风险按比例加严"已进入编排层。

### 5. 变更级 rigor 贯穿主工作流（P1 落地）

**rigor 成为变更属性而非命令参数**：`ff`/`issue`/`turbo` 创建变更时把 rigor 写入 `.state.yaml`（自动评估：描述含不可逆信号（migration/删数据/auth/payment/breaking…）或 issue 高严重度 → **自动升 strict**，否则 feature→standard、bug→light；`--rigor` 显式覆盖），下游 `verify`（light 免 constitution、strict 附 lint）与 `archive`（light 免 strict 门禁）自动遵循——除非用户在当次调用显式给旗标。graph run 与主工作流共用同一套语义（`src/utils/rigor.js`）。

### 6. clarify 对话式（P1 落地）

旧默认 = 每个提案倾倒 20 个固定问题（吞吐量/合规/可用性——对一个加按钮的提案全是噪音）。新默认 = **对话式**：核心三问（输入边界/空值/失败场景）+ 按提案信号精选的相关问题（提及 API→集成问、提及性能→响应时间…），简单提案 ≤6 问；`--exhaustive` 恢复全量清单。顺带修复：`clarify [action] [change]` 双位置参数导致 commander options 整体被丢弃的潜伏 bug（所有旗标从未生效过）。

### 7. legacy 标记（P2 落地）

单模型角色模拟（`roles list/party`）、多 Agent 状态机（`runtime agent`）在输出中标注 "legacy (optional)"——弱模型时代补偿层，强基模型下为可选分析工具（实证审查走 `roles review --triage`）。是否移入 extensions 留待后续评估（先标注、后迁移）。

### 8. 中断预算（P2 落地）

**审计发现**：config 的四层暂停机制大部分是剧场——`certainty.check_points`、`auto_skip_when`、`phases_requiring_confirm` **零消费者**（`hitl.mode` 在 P0 前也无人读取）。因此本轮不是"合并四层"，而是**建立真实的统一记账**（`src/utils/interruption.js`）：

- 每次真实人类暂停（confirm pending-human、3 次熔断）计入 `.state.yaml` 的 `interruptions_used`
- 预算 `interruption.budget`（默认 3）；超额时决策文件标 `budgetExceeded` 并告警"建议重拆变更/收紧阈值"——**不阻断决策本身**（人需要的决策不能被预算否决，但成本必须可见）
- 统一暂停策略写入 agent-protocol：暂停点仅三类（门禁 pending-human / 熔断 / 不可逆动作），其余一律不暂停
- 死配置就地标注 deprecated

顺带修复（第五个潜伏 bug）：certainty 阈值一直挂在 `tdd.certainty` 而 confirm 读顶层 `certainty`——从未读到过（默认值恰好相同所以无感知）；现两种层级都兼容。

## 本系列累计修复的潜伏 bug（约束层腐蚀实证）

| # | bug | 发现轮次 |
|---|-----|---------|
| 1 | `stdd confirm` 正则 `**` 未转义——命令在任何项目崩溃 | P0 |
| 2 | `clarify [action] [change]` 丢弃全部 commander 选项 | P1 |
| 3 | graph-cache 从未接线 + 缓存写入包根（跨项目污染） | DAG 轮 |
| 4 | certainty/hitl 检查点配置零消费者（声明性剧场） | P2 |
| 5 | certainty 阈值层级错位（tdd.certainty vs 顶层 certainty）从未被读到 | P2 |
| 6 | `planning:` 段误插 defense 中间劫持子键（P0 引入，本轮修复） | P2 |

**教训**：约束层一旦不被真实使用，就会无声腐化。每条约束都需要（a）端到端测试（b）真实冒烟（c）消费者审计。

## Backlog 状态：全部清零

P0 ✅ P1 ✅ P2 ✅。后续方向（新议题，非本轮 backlog）：模拟类能力是否移入 extensions 的评估、verify --strict 与 rigor 的矩阵细化。

## 判据

每一条保留的约束必须能回答："**强模型 + 无此约束**会失败在哪？"——答不出来的，就是开销。
