# 已知缺口（受管清单）

> Version: 1.2 | Last Updated: 2026-11-06
>
> 交付门槛（premerge/smoke）全绿 ≠ 无缺口。本清单受管所有"声明未对齐 / 深度不足 / 范围未做"的项，避免散落在对话中。每项含实证与处置。

## 状态图例：✅ 已解决（含提交）｜🔧 部分解决｜📋 未开始｜⛔ 显式不采纳（有理由）

## 一、声明 vs 现实

| 项 | 状态 | 说明 |
|---|---|---|
| turbo "一键全流程" | ✅ 文档对齐（2026-11-06） | 代码边界 = ff + spec 生成（apply 是 AI 执行器职责，CLI 无法写业务代码）。README/agent-protocol/USAGE 措辞已改为准确描述 |
| clarify actions（questions/edge-cases/constraints） | ✅ 已实现（2026-11-06） | `questions` 只列不写；`edge-cases`/`constraints` 聚焦单领域 |
| supervisor 缺 legacy 提示 | ✅ 已补（2026-11-06） | 与 roles/runtime 一致 |
| ARCHITECTURE 引擎声明 | ✅ 已对齐（2026-11-06） | 分层并行/自定义 intent/retry 白名单/propagator 接线全部落地后更新 |

## 二、引擎与运行时

| 项 | 状态 | 说明 |
|---|---|---|
| error-propagator 零接线 | ✅ 已接线（2026-11-06） | graph-run 节点失败时定位回炉决策点，写入失败条目与控制台 |
| retry 无错误分类 | ✅ 只读白名单（2026-11-06） | 副作用节点（propose/spec/apply/issue/archive/commit）不自动重试；只读节点（verify/fix-packet/type-check/explore/brainstorm）可重试。按错误内容分类（transient vs deterministic）仍未做——白名单是保守近似 |
| 同层并行 | ✅ 已实现（2026-11-06） | Kahn 分层 + max_parallel 限流 + `--sequential` 逃生口；per-node options 快照防竞态 |
| 项目自定义 intent | ✅ 已实现（2026-11-06） | `stdd/graph/intents.yaml` 增/覆盖 intent 路径，坏文件容错 |
| 节点级超时 | ✅ 已实现（2026-11-06 v1.1.2） | `graph run --node-timeout <seconds>`：超时节点失败并标 `timedOut`，不重试；默认关闭 |
| heterogeneous-adapter 强制异构审查 | 📋 | Tier 链存在；"审查必须异构引擎"仍是协议级（worksheet 字段），引擎调度未强制 |

## 三、功能深度

| 项 | 状态 | 说明 |
|---|---|---|
| plan 任务内容固定模板 | ✅ 已真实化（2026-11-06） | 任务从提案 In-Scope 项派生（含 TDD 描述），支撑任务（错误处理/变异）补位；无 scope 项时回退支撑模板 |
| certainty 证据半自动 | ✅ 提示已加（2026-11-06） | ff 创建变更后输出 certainty assess 提示（含示例 --scores）；评估本体仍由 AI/人工执行（设计边界） |
| spec-generator | ✅ 已审计+修复（2026-11-06） | 审计发现空描述任务生成无名 `.feature` 空文件——已修（跳过并记录 reason）；骨架为占位级（As a user...）属 AI 细化范畴，维持现状 |
| `stdd start` 向导 | ✅ 已补（2026-11-06） | 帮助文本加入 v1.1 特性速览（--rigor / graph run / --defer） |

## 四、文档

| 项 | 状态 | 说明 |
|---|---|---|
| en 文档 | ✅ 已补齐（2026-11-06） | en/cli-guide v1.1 选项节 + en/framework-benchmark.md + en/model-strength-adaptation.md（精简英文版，指回中文权威版） |
| fix.md 前端缺口表 | 📋 | Web UI Dashboard（P1）/ 视觉回归闭环（P1）/ DESIGN.md 反推（P2）/ UI 生成（P2）/ 前端测试闭环（P2）——整块未动 |

## 补充实证（2026-11-06 复查新增）

| 项 | 状态 | 说明 |
|---|---|---|
| README 引擎数 "24 种" | ✅ 已修正（2026-11-06） | 中英 README 统一为 22（与 engines.yaml/ARCHITECTURE 一致） |
| 并行层 exitCode 归因 | ✅ 已解决（2026-11-06 v1.1.2） | verify/archive 在被编排时接收 `throwOnFailure`（graph run 注入）——失败以异常精确归属本节点，消除并行 best-effort 误归因 |
| test:benchmark | ✅ 已验证（2026-11-06） | 全部基准通过（Graph Compile 0.4ms / Constitution 13.9ms 等，结果入 benchmark-results.json） |
| Docker 构建 | 🔧 本机受限 | Docker CLI 29.9.2 存在但 daemon 未运行，无法本机验证 build/up；Dockerfile/compose 未变更，维持"按 INSTALL.md 在有 daemon 的环境验证" |
| graph history 联动 | ✅ 已实现（2026-11-06 v1.1.2） | graph run 成功/失败均写 evidence（`graph-run-*.json` 入 change evidence 目录），`stdd graph history` 即刻可见 |

## 五、显式不采纳

memlog（三层日志映射替代）· git worktrees（执行器层职责）· 三路径分级（ff/turbo/标准流已语义等价）· Stores（超出定位）· deprecated 死配置键（已标注，未删除以保兼容）
