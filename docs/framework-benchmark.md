# 框架对标：superpowers + BMAD + OpenSpec

> Version: 1.0 | Last Updated: 2026-11-05
>
> 本文档记录 STDD Copilot 与三个主流 AI 开发方法论的对照分析、本轮已落地的优化、以及后续采纳路线图。

---

## 为什么对标这三个框架

| 框架 | 定位 | 对 STDD 最有价值的部分 |
|------|------|----------------------|
| [superpowers](https://github.com/superpowers-extra/superpowers) | 技能库（discipline skills） | TDD 铁律、验证先于断言、plan 工件格式（Interfaces / Run+Expected）、subagent 协作协议、systematic debugging |
| [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 敏捷多 Agent 方法论 | Story 即完备上下文包、DoD 复选框门禁、triage 制代码审查、memlog 决策日志、deferred-work 台账、稳定 ID 族 |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | 轻量规格驱动框架 | `### Requirement:` / `#### Scenario:` 结构化规格、delta 规格（ADDED/MODIFIED/REMOVED/RENAMED）归档语义、`validate --strict`、幂等冲突检测 |

三者的共性原则：**工件先行（artifact-first）、行为优先（behavior-first）、证据门禁（evidence gates）、幂等可重放**。STDD 的定位（流程控制层）与 OpenSpec 最接近，与 superpowers/BMAD 互补。

---

## 本轮已落地的优化（v1.0.8）

### 1. Delta 规格引擎：OpenSpec 归档语义（核心）

**差距**：原 `archive.js` 的 `mergeDeltaSpec` 只是把 `MODIFIED`/`REMOVED` 段落用注释标记追加到主规格末尾——**修改不会真正替换、删除不会真正移除**，重复归档会累积重复块，且无任何冲突检测。

**优化**（新增 `src/utils/delta-spec.js`，接入 `archive.js`）：

- 以 `### Requirement: [Name]` 头部为唯一标识，按 OpenSpec 归档顺序执行：**RENAMED → REMOVED → MODIFIED → ADDED**；
- MODIFIED 原地替换需求块（保持位置），REMOVED 真正删除，RENAMED 真正改名；
- **冲突阻断归档**：MODIFIED/REMOVED/RENAMED 目标缺失、ADDED 与主规格内容冲突、大小写/空白近失配、同 delta 内 RENAMED+REMOVED 冲突、段内重复头部 → 写入 `spec-merge-report.json`（含每条冲突与修复指引）、退出码 1、**变更不归档、主规格保持原样**；
- **幂等**：重复归档相同 ADDED（内容一致）→ `already-synced` 警告并跳过；RENAMED 源已不存在但目标存在 → 同样识别为已同步；
- **向后兼容**：主规格不存在时（新建能力规格）保留原 marker 创建路径；旧格式 delta（`## ADDED` 短格式、纯文本追加）全部兼容。

### 2. `stdd validate --strict`：delta 结构校验

**差距**：原 `validate` 只做泄漏规则（Spec Guardian）与 GWT 存在性检查，不校验 delta 的结构合法性——目标缺失、重复头部、ADDED 与主规格冲突等只有在归档时才会暴露（原来甚至不会暴露）。

**优化**（`validate.js` 新增 strict 模式）：

- 阻塞级：需求无 `#### Scenario:`、delta 内重复 `### Requirement:` 头部、MODIFIED/REMOVED/RENAMED 目标在主规格缺失、ADDED 与主规格冲突；
- 警告级：需求缺 SHALL/MUST 语句（RFC 2119）、ADDED 已同步、delta 无任何标准段；
- 仓库模式（不带 change 参数）下同样检查主规格的重复头部与场景完整性；
- `--strict` 可与 `--spec-guardian` 叠加（mode: `strict+spec-guardian`）；不开启时行为与旧版完全一致。

### 3. GWT 步骤解析兼容 OpenSpec 加粗格式

**差距**：`GWT_PATTERN` 只识别 Gherkin 风格（`When ...` / `- When ...`），不识别 OpenSpec 的 `- **WHEN** ...` 加粗关键字步骤，导致合法场景被误报 `missing-gwt`（阻塞级）。

**优化**：正则兼容加粗前缀，两种格式均通过校验。

### 4. tasks 模板升级（superpowers writing-plans + BMAD story 借鉴）

每个任务块新增三个字段：

- **Verification**（superpowers）：`Run: <命令>` + `Expected: <期望输出>`——任务完成的判定标准从"感觉写完了"变为可执行证据；
- **Sources**（BMAD）：`[Source: proposal.md#Scope]` 溯源——每个任务可追溯到提案/规格条目，防止任务与需求脱节；
- **Interfaces**（superpowers）：`Produces/Consumes` 签名——单任务上下文自足，是委派执行（subagent 化）的前提。

### 5. delta 模板补 RENAMED 段

`schemas/spec-driven/schema.yaml` 与引擎对齐，模板示例补 `## RENAMED Requirements`（FROM/TO）格式。

### 6. 归档前 strict 门禁（P1 落地）

`stdd archive` 在合并任何规格文件**之前**自动运行 strict delta 校验：阻塞级问题（无 Scenario、重复头部、目标缺失、ADDED 冲突）→ 拒绝归档（exit 1）、给出逐条定位（`file:line rule`）与修复指引，保证主规格零污染。逃生口：`--skip-strict`。

### 7. baseline_commit 捕获（P1 落地，BMAD baseline_revision）

`stdd apply` 首次执行时把当前 `git rev-parse HEAD` 记录到 `stdd/changes/<name>/.state.yaml` 的 `baseline_commit` 字段（幂等：已存在则永不覆盖，非 git 仓库静默跳过）。验证与审查从此可以对照"实现前"的 diff 取证，而非依赖自述。

### 8. deferred-work 台账（P1 落地，BMAD deferred-work / loop-sweep）

"暂缓"不再是丢弃：

- `stdd verify <change> --defer "<发现>"` → 追加到 `stdd/changes/<name>/deferred-work.md`（自动编号 + 日期 + 来源）
- `stdd verify <change> --resolve <n>` → 勾选关闭第 n 条
- 每次 verify 运行在报告中显示 `Deferred: N open / M total`（进入 evidence）
- `stdd archive` 归档时对未决条目给出黄色警告（不阻断），台账随变更目录进入归档，供后续 sweep 对码验证

### 9. 红灯证据门禁（P2 落地，superpowers "watch the test fail"）

`stdd verify` 解析 `apply.log`：走 TDD 相位状态机的任务必须有**绿灯通过之前的一次红灯通过记录**（亲眼看到测试失败），否则 verify 判 FAIL——防止"测试从未红过"的假绿灯进入归档。legacy 模式任务（无相位日志）计数提示但不阻断。报告新增 `TDD: PASS/FAIL (RED evidence N/M)`。

### 10. 3 次连续失败熔断升级（P2 落地，superpowers systematic-debugging）

`stdd apply` 追踪每个任务在 `apply.log` 中的连续失败次数（任何一次通过即重置）。第 3 次起输出熔断指引：**"连续 3 次失败是架构问题而非症状"**——停止修补，回到 `stdd plan` 重新设计或携证据委托新引擎；同时写入 `escalation-*.json` 证据供 fix-packet/交接使用。legacy 与 GREEN/REFACTOR 失败路径均覆盖。

### 11. 前置变更情报回灌（P2 落地，BMAD "PREVIOUS STORY INTELLIGENCE"）

`stdd plan` 生成 tasks.md 时读取**最近归档变更**的 deferred-work 台账，把未决暂缓项以 `## Previous Change Intelligence` 段落（含 Source 指针）回灌进新任务清单——归档里的 deferred 事项循环回来，而不是烂在档案里。无归档/无未决项时不生成该段。

### 12. 裁决制审查协议（P2 落地，BMAD triage review）

`stdd roles review <target> --triage`：审查发现**不再自动按 pattern 严重度判死**（不自动 exit 1），而是标记 `verdict: untriaged` + `bucket: null`，并生成 Triage Worksheet（`stdd/reports/review-triage-*.md`）：

- 裁决五值：`high / medium / low / false / maybe-false`（先对码验证再裁决）
- 路由四桶：`intent-gap`（意图错，停下对齐）/ `plan-defect`（计划错，先重规划）/ `patch`（就地修）/ `defer`（经 `stdd verify <change> --defer` 入台账）
- 不带 `--triage` 时保持原有自动判级行为（向后兼容）

### 13. AD-n 稳定决策 ID（P3 部分落地，BMAD 稳定 ID 族）

`schemas/spec-driven/schema.yaml` 的 design 模板决策格式升级为 `### AD-n: [决策名]`：ID 一经发布永不重排/复用，推翻旧决策用更高编号 + `Supersedes: AD-x` 标注；每条决策新增 **Binds**（约束什么）/ **Prevents**（禁止什么）两个字段——"Record decisions, not rationale"。

---

## 对标确认：STDD 已具备的能力（无需改动）

| 最佳实践 | 来源 | STDD 对应实现 |
|---------|------|--------------|
| TDD 铁律：RED 阶段必须亲眼看到测试失败 | superpowers | `apply.js` `_executeRedPhase`：测试不全失败 → "RED Phase Violation"，拒绝进入 GREEN |
| "旁观失败"防假测试 | superpowers | 同上；另有 `mutation`（Quick 启发式 + Stryker 委托）防假绿灯 |
| 失败降级：换更强模型/fresh eyes | superpowers / BMAD | `delegationPlan`：测试失败自动产出委托证据（fresh model/role 建议） |
| 失败上下文打包交接 | superpowers / BMAD | `fix-packet`（Golden Packet 风格失败上下文） |
| 断点续传 / 进度持久化 | superpowers ledger | `progress.jsonl`（JSONL 实时进度 + SIGINT/SIGTERM 捕获 + resume） |
| 行为优先边界（规格禁实现细节） | OpenSpec | Spec Guardian 泄漏规则（code-path/database/api-detail 等五类） |
| 豁免机制（带时效与理由） | BMAD | Constitution waivers（`waive --reason --days` + lock 文件） |
| 连续失败熔断 + 回滚 | superpowers 3 次规则 | Ralph Loop 4 阶段容错（策略调整→降级→熔断→回滚） |
| 双路径确认门（HITL） | 三者共性 | `confirm` / `archive` 两个人机确认门 |

---

## 未采纳 backlog（按优先级）

### P1 / P2 — 已全部落地（见上文 6-12）

> 说明：P2 中的"回归验证（revert-fix-must-fail）"最终以**红灯证据门禁**（第 9 条）的形式落地——用 apply.log 中已记录的 RED 相位证据实现"必须亲眼见过测试失败"，比 git 还原式验证更安全（无破坏性操作）且无需额外配置。

### P3（理念采纳、从长计议；AD-n 稳定 ID 已部分落地见第 13 条）

| 条目 | 来源 | 说明 |
|------|------|------|
| memlog 决策日志 | BMAD | append-only 决策日志，工件从日志蒸馏，天然支持 resume（与 progress.jsonl 职责有重叠，需先做整合设计） |
| ruling ledger | superpowers executing-plans | 执行中的裁决记录（`决定—理由—出错了的代价`），抗上下文压缩 |
| AD-n 稳定 ID 的 CLI 强制校验 | BMAD architecture spine | 模板已落地（第 13 条）；后续可在 validate 中校验 AD 编号连续性与 Supersedes 引用有效性 |
| review 用不同 LLM | BMAD | heterogeneous-adapter 已有 Tier 降级链，可扩展为审查强制异构引擎 |
| retrospective 验收判定 | BMAD | 复盘产出带 `accepted / accepted-with-open-items / rejected` 判定 |

### 明确不采纳

| 条目 | 来源 | 理由 |
|------|------|------|
| git worktrees 强制隔离 | superpowers | 属于执行器/用户环境层职责；STDD 是流程控制层，`parallel` 已做文件冲突检测 |
| ceremony 随 stakes 缩放的三路径分级 | superpowers brainstorming | STDD 已有 ff（快速）/turbo（一键）/标准流 三条路径，语义等价 |
| Stores 跨仓库规划 | OpenSpec | workspace/Monorepo 支持已覆盖单仓库多包场景；跨仓库规划超出当前定位 |

---

## 测试证据

- 新增 `__tests__/delta-spec.test.js`（25 用例）：解析、真实合并、冲突、幂等、遗留兼容；
- 新增 `__tests__/archive-delta-merge.test.js`（10 用例，端到端 CLI）：真实 MODIFIED/REMOVED/RENAMED 应用、冲突阻断归档、幂等重归档、legacy 创建路径、strict 门禁拦截与 `--skip-strict`；
- 新增 `__tests__/validate-strict.test.js`（15 用例）：strict 全规则 + 非 strict 向后兼容；
- 新增 `__tests__/apply-baseline.test.js`（3 用例，端到端 CLI）：baseline 捕获、幂等不覆盖、非 git 跳过；
- 新增 `__tests__/apply-three-strikes.test.js`（4 用例，端到端 CLI）：1/2 次不升级、第 3 次熔断 + escalation 证据、持续失败继续升级、通过后重置；
- 新增 `__tests__/verify-red-evidence.test.js`（4 用例，端到端 CLI）：RED→GREEN 通过、缺 RED 阻断、legacy 计数不阻断、无日志跳过；
- 新增 `__tests__/plan-previous-intelligence.test.js`（3 用例，端到端 CLI）：最近归档未决项回灌、已解决项不回流、无归档省略；
- 新增 `__tests__/roles-triage.test.js`（3 用例，端到端 CLI）：triage 不自动判死、worksheet 五值四桶、非 triage 行为不变；
- 新增 `__tests__/deferred-work.test.js`（10 用例）：台账读写/编号/解决 + verify/archive CLI 集成；
- 存量 archive/validate/apply/verify/roles 测试全部保持绿色（无行为破坏）。

运行：`npm test`（见根目录 CONTRIBUTING.md 的基线说明）。
