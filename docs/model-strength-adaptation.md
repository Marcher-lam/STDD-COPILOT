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

## 待办（P2 backlog）

| 优先级 | 条目 | 说明 |
|---|---|---|
| P2 | legacy 标记 | 12 角色模拟、SudoLang、Party Mode 标注"弱模型时代补偿层，默认不推荐"，评估移入 extensions |
| P2 | 中断预算 | 四层暂停机制（confirm + certainty 检查点 + hitl 分阶段 + constitution）合并为单一"每变更 N 次暂停配额，风险消耗配额" |

## 判据

每一条保留的约束必须能回答："**强模型 + 无此约束**会失败在哪？"——答不出来的，就是开销。
