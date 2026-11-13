# STDD Copilot 边际优化追踪

> Last Updated: 2026-11-14 | Round 48 完成（验收报告 D01-D12 清偿）

### Round 48 — v1.2.11 后：终测验收报告 D01-D12 全面清偿（2026-11-14）

D01（execute 假完成）：execute 五阶段函数只打印提示即 return success，
失败测试脚本也宣告全过——整命令重写为真实门禁：RED 要求套件真实失败
（CHECK 按 lint 存在性执行或显式标注 skip，GREEN/MUTATION/REFACTOR 全部
以命令结果判定，MUTATION 调用真实 quick 门禁），阶段通过写 apply.log
证据（red/green/refactor 与 verify TDD 门共享账本），全循环对已有证据
阶段自动续跑（修掉"实现后重跑 RED 又违规"的死锁），失败设 exitCode=1。
D04（--phase 越阶）：executeStage 前置校验早前阶段均有 recorded pass，
直接 `--phase green` 被拒。D02（归档证据缺口）：archive 三道新门禁——
必须存在 status=pass 的 verify 证据（此前只拒已存在的 fail）、空/缺失
任务列表拒绝（total=0 独立判定，修掉嵌在 !allDone 下的死代码路径——
checkTasksCompletion 对空任务返回 allDone=true）、证据必须新鲜
（mtime 晚于 change 工件）且 verify 现记录 project-fingerprint
（package.json/config/测试目录/*.test.* 哈希，archive 重算比对），
E013"verify 后改测试脚本为失败"场景被指纹拦截；--force 逃生口保留。
D03（基础设施失败≠RED）：command-runner 新增 isInfraFailure（spawn
error/npm ENOENT/Missing script/Could not read package.json/ERR_MODULE_
NOT_FOUND/缺失 test 入口），RED 阶段遇 infra 失败阻断且写 error:
infrastructure-failure（_hasRedEvidence 的 !entry.error 守卫天然排除），
legacy 路径同样标注；真实断言失败的 RED 不受影响（复验双向证明）。
D05（契约假成功）：contract verify 有 violation 时 process.exitCode=1。
D06（生成器与门禁口径不一）：spec-generator 移除通用占位三句，fallback
步骤携带任务描述语义（strict validate 对新生成物直接通过）；archive
runStrictGate 补跑 lineDiagnostics（此前 .feature 完全绕过泄漏/占位
规则），与 `validate --strict` 同口径，E020 占位 spec 归档被拦截。
D07（parallel 崩溃）：parallel.js 解构不存在的 DynamicRouter、以
{(adapter,options)} 调 ParallelExecutor 默认导出且调用不存在的
execute/plan/buildLayers——全部改为 graph.js 同款正确 API（含
HeterogeneousAdapter 默认导出陷阱），run 重定义为诚实 PLANNING 入口并
指向 graph run。D08（mock 参数映射）：MockCommand.execute 按 commander
(action,target,options) 展开归一（旧代码把 target 字符串当 args 数组，
args[0] 取到首字符）；修复 this.cwd 从未赋值（父类无构造器——"path
argument Received undefined"真根因）、嵌套路径目标建目录、--methods
逗号串拆分。D09（模板/CLI 口径）：ff 补 --include-design/--skip-design
（design.md 默认生成骨架）/--output（change id 别名）并生成含
Scenario+SHALL 的 delta spec 骨架与 [phase:red] 任务标记（D12 同步：
plan 任务同样带 phase 标记进入 TDD 状态机默认路径）；plan 实现
show/estimate/dependencies 三动作（修复 fs.promises 无 existsSync 的
命名空间错误）；execute 实现 status/evidence 动作；story convert/to-bdd
别名；ci 新增 gitlab(.gitlab-ci.yml)/jenkins(Jenkinsfile) 真实生成器；
starters 修复 commander 尾参含 Command 实例的 options 识别并注册
--type；start 向导建议命令改为 `stdd new change <name>`（含 HELP_TEXT）。
D10（--json 假入口）：start --json 输出纯 JSON 不再进 inquirer；
depcheck 修复 [path] 位置参数吞掉 options 对象的问题（--json 真正生效
且退出码与文本模式一致）、node: 前缀内建模块不再误报缺失、安全清单补
stdd/@marcher-lam/stdd-copilot。D11（progress 丢参数）：cli.js parse
包装器解析真实 argv（位置参数+旗标值）写入 args.positionals/opts，
progress 恢复提示跨旗标名与位置参数回退定位 change/workspace/intent。
测试：受新门禁影响的旧测试按新验收更新（archive 家族补 verify 证据
夹具/零任务用例翻转为拒绝/占位步骤夹具换真实语义，ci gitlab 改用
travis 作为不支持示例），全量 233 套件 4500 测试通过，lint 0/0、
docs 9/9；报告原始场景复现 19 组全部通过（execute 假完成/越阶、
归档无证据/过期指纹/空任务、npm ENOENT 与缺失执行器不算 RED、契约
violation 退出码、parallel layers、mock generate、ff 旗标、plan 三
动作、story convert、ci 三平台、starters --type、start/depcheck JSON、
progress 参数）。

### Round 47 — v1.2.11：终测复验新发现 F1 插值接线（2026-11-13）

### Round 47 — v1.2.11：终测复验新发现 F1 插值接线（2026-11-13）

v1.2.10 复验（RE-REPORT）发现的 P1：init 在技术栈探测失败时写入声明式
${VAR:-default} 占位符（TEST_COMMAND/LANGUAGE/PROJECT_TYPE 同族三处），
框架已有 env-interpolate.js（engines.yaml 路径在用）但 config.yaml 的
消费方从未接线——verify/apply 把字面 '${TEST_COMMAND:-npm test}' 直接
spawn（ENOENT），新项目首次 verify 的 Tests 项误判失败需手工修正。
修复：getConfigTestCommand（verify/apply 共用咽喉）读取后
interpolateString，存量带占位符 config 就地治愈，模板环境覆盖语义保留；
同族 product-proposal 对 config 整体 interpolateObject（project.type/
language 不再字面泄漏进生成文档，config 缺失仍 null 保 coverage 语义，
蓝军自查发现的回归已修）。F2 备注归档：grep 证实框架零产出
'node --test <目录>'，系本机 Node 22.23(Homebrew) 构建差异，项目侧
glob 规避即可。+6 回归测试（含 init→verify 开箱 e2e：占位符落盘零
手工修正、Tests: PASS 无 ENOENT），4494→4500；lint 0/0、docs 9/9、
全量 233 套件通过；v1.2.11 tgz 隔离复跑 F1 场景通过（见复验目录
f1-recheck-v1.2.11.log）。

### Round 46 — v1.2.10：终测报告剩余 N 类缺陷 + propose 动作补全（2026-11-13）

### Round 46 — v1.2.10：终测报告剩余 N 类缺陷 + propose 动作补全（2026-11-13）

Round 45 后报告遗留项清偿：N-graph graph-run 证据状态恒 unknown（
_determineStatus 无 graph-run 分支，所有 run 皆中招）→ 按 steps/failedAt
推导 fail/skipped/pass（--skip-apply 记 skipped，与 PASS 审计语义区分）；
N-design design reverse 扫不到 public/style.css 且强制语义前缀 → 目录加
public/ static/，捕获全部自定义属性按名称分类、展示名剥前缀，role 增补
border/shadow；N-confirm 非 TTY 自动确认（不构成人工确认证据）→ 无旗标
拒绝 exit 1 不写状态，--yes 显式非交互确认并照 risk-triggered 先例写
confirm-decision.json（--skip 同样记录），另修 confirm extractSection
下划线节名捕获组遮蔽（success_criteria 永远提取为空——正是报告"提示缺少
success_criteria"的根源）与 H1 标题识别（消除框架自身模板的永久 missing
title 噪声）；propose 四动作补全——draft 加 --force 覆盖保护（修复
propose show <name> 静默覆盖 proposal.md 的破坏性 bug）、show 只读打印、
validate 复用 ConfirmCommand.validateProposal（缺节 exit 1）、refine 按
提案现状确定性重生成澄清问题、split 将 scope 条目 ≤3 切分为
split-plan.md + 子变更脚手架（--dry-run 不写）；mapper 照 clarify 先例
透传 action。+17 回归测试，4477→4494；lint 0/0、docs 9/9、全量 232
套件通过。已知边界：propose refine/split 为确定性清单/计划生成器（非 AI
改写）；confirm --json 为注册但未实现的死旗标（未在本次范围内）。

### Round 45 — v1.2.9：终测实测报告修复 4×P0 + 2×P1（2026-11-13）

### Round 45 — v1.2.9：终测实测报告修复 4×P0 + 2×P1（2026-11-13）

第三方终测（v1.2.8 源码快照 + 隔离安装 CLI + 真实任务看板项目）判 FAIL，
4 项交付阻断全部修复：D01 verify TDD 证据门按 apply.log 全文 task 分组，
apply 每阶段把 [phase:*] 写回任务行使 7 任务裂成 21 键 → 现按稳定 TASK-ID
关联（change-utils 新增 stripPhaseMarkers/taskKey，无 ID 任务退化为去
marker 文本匹配），同族修复 3-strikes 连败计数与 continue 任务匹配；
D02 最新 verify 失败仍可普通归档 → archive 新增验证门禁（仅认
verify-*.json，fail 即 exit 1；--force 显式归档且摘要如实记 rejected；
throwOnFailure 契约对齐 graph-run）；D03 new/plan 生成的任务行与 spec
解析器不兼容（无冒号 / **bold** vs 仅认 TASK-NNN:）→ 写入方统一规范
冒号格式，解析器容错 bold/无冒号/前导 phase marker 并剥离描述 marker，
new→spec、plan→spec 端到端打通；D04 终测 lint 门禁 no-regex-spaces
（588e81e 自引入）。另修报告 N 类缺陷：N03 空工作区 list --json 输出
普通文本 → 输出 []（--archived 空对象；空 specs 同修）；N17 propose
文档双位置形式创建名为 action 关键字的变更且旗标全丢 → 注册 mapper
（双位置形式变更名取第二参数、需求取 --description，单位置形式不变）。
+25 回归测试，4452→4477；lint 0 错误 0 警告、docs 9/9、全量 232 套件
通过。已知边界：taskKey 对无 TASK-ID 且跨阶段改写的任务文本按去 marker
文本匹配；propose 的 show/refine/validate/split 动作仍未实现
（helpText 宣传项，超出本次范围）。

### Round 44 — v1.2.8：真实项目实测报告修复 3×P0 + 5×P1（2026-11-10）

第二轮外部实测（stdd-evaluation-demo 订单阶梯折扣）11 项发现中的 8 项代码级
修复：P0-1 apply 假绿灯（legacy 全绿即勾任务 → 现要求 apply.log 内有该任务
RED 证据，`--allow-no-tests` 为非代码任务记录豁免，continue 转发该旗标）；
P0-2 validate 零规格返回 pass（新增 no-specs blocking + `--json` 退出码对齐 +
evidence validate 分支）；P0-3 中文任务规格生成率为零（toSafeFilename 保留
CJK）+ 占位 Gherkin 三连句进 blocking 泄漏规则；P1-3 `--no-constitution`
记 pass → SKIPPED 全链路（终端/evidence/归档摘要）；P1-4 规格探测统一
spec-discovery（递归 .feature/.md，status/recommend 共用）；P1-2 Article 2
支持顶层 test/ tests/ __tests__/；P1-1 quick 模式改打 Heuristic Score +
scoreKind 字段。另修蓝军发现的独立缺陷：validate --json 永不设非零退出码。
+29 回归测试，4414→4443；端到端重放报告 13 场景全部翻转。
发布前 AI 评审（OCR 23 条发现）当日清偿 8 条关键项：apply 配置错误条目
冒充 RED 证据（high，假绿灯借尸还魂路径）、evidence 漏 TDD 门、
graph-history 二元渲染 SKIPPED 成 FAIL、占位规则未锚定误伤近邻句、
verify skip 归因（rigor 降级 vs 显式旗标）、spec-discovery 误剪
build/reports 域目录、toSafeFilename 长度上限+CJK 扩展 A、lockfile
版本 4 个版本未同步。+9 测试，4443→4452。

### Round 43 — v1.2.7：实战测试报告缺陷修复（2026-11-09）

外部实战报告（todo-md 全流程 + 路径 A/B 宿主集成）两项工具缺陷落地修复：
F2 quick mutation 把 stdd init 自装的 agent hooks（.claude/ 等 engines.json 全部
6 目录）计入源文件，覆盖比结构性失真、小项目门禁不可达（同项目 77 FAIL → 修复后
100 PASS，名单由 engines.json 派生，未来引擎自动覆盖）；F1 round24 guard-audit
lint 用例 mock 双重失效（spy 晚于模块加载期解构 + eslint 误配到命令名而非 args），
静默真实执行 npx eslint 导致负载相关 flaky，改文件级 jest.mock（metrics-lint
模式）。+2 回归测试，4412→4414 全绿。

### Round 42 — v1.2.6：OCR 评审第二轮全量修复（2026-11-06）

11 high（RTL 骨架 import / schema-rules 双正则 / pipeline 嵌套 / clarify 单参 / update
root / viewport 数值 / delta-spec 幂等+配对 / archive 原子化+throwOnFailure）+ 25 medium
（dashboard 安全绑定+权威 reader / graph-run cache 生命周期+环检测+TRANSIENT 收窄 /
validate .feature+替换惯用法 / design-reverse 多块+表对齐 / version-check semver+Windows 等）。

### Round 40-41 — v1.2.2~v1.2.5（2026-11-06）

模板真全量同步（P0 轮脚本 bug 修复后复扫 ALL SYNCED）；schema DSL 执行器化（--schema-driven）；
engines env 插值；issue --change-name + workspace 双命令 + graph 全局 timeout；配置段
接线/诚实化六段；update --check-version 联网；Docker 端到端验证（含 2 个 Dockerfile bug 修复）；
en 文档 12 篇全译（撤销精简版决策）。测试 4394→4412。

### Round 39 — v1.2.x：前端五项 + 全量修复（2026-11-06）

v1.2.0 前端五项落地（design reverse / browser baseline-diff / outside-in --code /
ui generate / dashboard，命令 75→77）；v1.2.1 全量修复（零依赖 PNG 像素比对补
`--threshold`、验证盲区补测 27 例、`--implemented-by` 动态异构排除、known-gaps
自身腐化修复）。测试 4335→4412。

## v1.1.0 基线（Round 35-38，2026-11-05）

```
Test Suites: 214 passed
Tests:       4412 passed (100%)
Coverage:    83.9% lines | 76.00% branch（premerge 阈值全过）
```

### Round 35 — 框架对标（superpowers + BMAD + OpenSpec，18 项落地）

OpenSpec 语义 delta 引擎（真实合并/RENAMED/冲突阻断/幂等）+ validate --strict +
归档 strict 门禁 + tasks 模板（Verification/Sources/Interfaces）；BMAD（deferred-work
台账 / baseline_commit / 前置情报回灌 / triage 审查 / AD-n / 复盘判定）；superpowers
（红灯证据门禁 / 3-strikes 熔断 / ruling ledger / 审查异构）。详见
docs/framework-benchmark.md（全部 18 条含代码位置）。

### Round 36 — DAG 引擎增强

graph-cache 接线（此前从未接线、且写入包根跨项目污染）、progressive rigor、
节点重试 + 委托证据、断点续跑。见 benchmark 第 18 条。

### Round 37 — 模型强度适配（P0-P2 全落地）

任务预算自适应（废除硬编码 6）、confirm 风险触发（certainty + 不可逆信号）、
变更级 rigor 贯穿主工作流、clarify 对话式、中断预算、legacy 标记、配置诚实化。
战略文档 docs/model-strength-adaptation.md。**累计修复 6 个潜伏 bug**
（confirm 正则崩溃 / clarify 选项丢弃 / cache 未接线 / 死配置 / certainty 层级 /
planning 劫持）。

### Round 38 — open-code-review 全量修复（55 条清零）

critical 1（TASK_PATTERN 污染）+ high 5 + medium ~12 + low 全部；含安全修复
（--change-name 路径穿越拒绝）与门禁互锁类修复（strict 结构化裁剪、rename 感知、
exitCode 检测）。测试 +160；npm audit fix（js-yaml 链，3 high→0）。

## 历史基线（v1.0.7 及之前）

## 当前质量基线

```
Test Suites: 191 passed
Tests:       4158 passed (100%)
Coverage:    ~97%+ Stmts | ~93%+ Branch | ~97%+ Funcs | ~97%+ Lines
```

## 28-34 轮优化累计改动

| 类别 | 数量 |
|------|------|
| 新增测试用例 | +1623 (2535→4158) |
| 新增测试套件 | +63 (128→191) |
| 空 catch 块修复 | 52 |
| process.exit → exitCode | 14 |
| TODO → 数据驱动实现 | 6 |
| console.error → logger 迁移 | 92 |
| 未使用导出清理 | 13 |
| var → const/let | 9 |
| 结构化 logger 基础设施 | 1 (src/utils/logger.js) |
| Jest 覆盖率阈值更新 | 7 个模块 |
| cli.js 拆分（Round 31） | 3 个新 helper 模块 |
| 分支覆盖率提升测试（Round 31-34） | 20 个新测试文件，211 个用例 |
| 零覆盖命令测试补全（Round 32-33） | 23 个命令从 0% → ~85%+ |
| design.js 修复（Round 33） | detectTechStack 导入回退 |

## Round 31-32 专项优化（2026-05-24）

### cli.js 拆分
- 提取 `createSpinner`、`safeAction`、`CONSTITUTION_ARTICLES` 到 `src/cli/helpers/` 下三个独立模块
- cli.js 从 555 行减至 ~515 行，功能零变更

### 覆盖率提升
12 个新测试文件，103 个用例：
- status-coverage-boost.test.js → status.js
- shell-executor-coverage.test.js → shell-executor.js
- update-coverage-boost.test.js → update.js
- tdd-init-coverage-boost.test.js → tdd-init.js
- commit-msg-coverage-boost.test.js → commit-msg.js
- coverage-parser-coverage-boost.test.js → coverage-parser.js
- ff-coverage-boost.test.js → ff.js
- explore-coverage-boost.test.js → explore.js
- doctor-coverage-boost.test.js → doctor.js
- guard-coverage-boost.test.js → guard.js
- validate-coverage-boost.test.js → validate.js
- skills-coverage-boost.test.js → skills.js

结果：175→183 套件，3845→3948 测试。

## Round 33 专项优化（2026-05-24）

### 23 个零覆盖率命令测试补全
修复并完成 4 个批量测试文件（zero-coverage-batch1~4.test.js）：
- 修复 batch2/batch4：async execute() 在同步 try/finally 下未捕获 Promise 拒绝
- 修复 batch3：cap() 错误定义为 async () => 导致 c.r() 为 undefined
- ConstitutionCommand 构造函数依赖缺失 → try/catch 包裹

### 3 个低覆盖率文件补充
- cli-utils-coverage.test.js（14 tests）：createSpinner + safeAction
- change-helpers-coverage.test.js（22 tests）：5 个导出函数全分支
- api-spec-coverage.test.js（78 tests）：20+ 个纯函数分支覆盖

结果：187→190 套件，3948→4150 测试。

## Round 34 专项优化（2026-05-24）

### 目标模块冲刺
- commit-msg.js：87.75% → 94.89%
- constitution-status.js：88.13% → 93.22%
- 另外 4 个目标已在前序轮次达标（ff.js 96.55%, explore.js 98.76%, doctor.js 91.01%, bdd-scenario-parser.js 100%）

### README 全量重写
- 中英文 README 全量重写，内容覆盖：双模式/双场景/工作流/80 命令全景/Constitution/架构/文档导航
- AGENTS.md → docs/agent-protocol.md，CLAUDE.md 删除（冗余）
- 同步更新 docs-taxonomy-consistency.test.js 和 docs-cli-examples-consistency.test.js

结果：190→191 套件，4150→4158 测试。

## 前端/UI 能力现状（2026-05-24）

当前 STDD 在前端方向的定位是：**awesome-design-md 风格设计规范 + 预览目录 + 测试支撑 + 浏览器辅助 + Agent 协议** 已具备；**可视化 Web Dashboard、页面/组件生成器、视觉回归闭环、现有 UI 自动反推设计系统** 尚未实现。

### awesome-design-md 对齐增强

已仔细阅读 VoltAgent/awesome-design-md，提炼并落地以下能力：
- DESIGN.md 采用更接近 Stitch/awesome-design-md 的扩展结构：Visual Theme & Atmosphere、Color Palette & Roles、Typography Rules、Component Stylings、Layout Principles、Depth & Elevation、Do's and Don'ts、Responsive Behavior、Agent Prompt Guide。
- `stdd design create/update` 默认同时生成 `preview.html` 与 `preview-dark.html`，用于可视化查看色板、按钮、卡片、表单等基础组件。
- 新增 `--no-preview` 选项，允许只生成 DESIGN.md，不生成预览 HTML。
- `stdd design check` 增强检查：支持 Color Palette & Roles、Component Stylings、Depth & Elevation、Agent Prompt Guide 等新版章节。
- `stdd design list` 补齐为可用动作，支持普通输出和 JSON 输出。

### 已具备能力

| 能力 | 当前状态 | 说明 |
|------|----------|------|
| DESIGN.md 设计系统生成 | 已增强 | `stdd design create/show/check/update/list`，支持 modern/dark/minimal 三套预设 |
| 前端设计规范 | 已增强 | 生成颜色角色、字体规则、布局原则、组件状态、深度/阴影、设计 guardrails、响应式策略、Agent Prompt Guide |
| 设计预览目录 | 已实现 | 默认生成 `preview.html` 与 `preview-dark.html`，可用 `--no-preview` 跳过 |
| 前端技术栈识别 | 部分实现 | `design.js` 调用 `detectTechStack`，并 fallback 到 `TechStackDetector.analyze` |
| Brownfield 前端流程 | 协议层实现 | `docs/agent-protocol.md` 定义 React/Vue/HTML 项目检测、缺失 DESIGN.md 提示、理解报告流程 |
| 浏览器辅助 | 已实现 | `stdd browser snapshot/inspect/doctor`，依赖 Playwright，用于截图、页面检查、浏览器环境诊断 |
| 用户测试脚本 | 已实现 | `stdd user-test` 从 BDD 规格生成 `user-test-human.md` 与 `user-test-agent.json` |
| 前端 API 支撑 | 已实现 | `stdd api-spec` 可生成 OpenAPI、TypeScript 类型、MSW handlers、Zod validators |

### 前端能力（2026-11-06 五项全部落地）

| 能力 | 状态 | 实现 |
|------|------|------|
| DESIGN.md 反推 | ✅ | `stdd design reverse`：从 Tailwind 配置/CSS 变量/组件库依赖提取真实 token（文本解析不执行用户代码），带 Source 标注 |
| 视觉回归闭环 | ✅ | `stdd browser baseline/diff`：命名基线 + 严格哈希比对 + diff evidence 归档 + `--allow-changed` 更新基线（需 playwright；无则优雅降级） |
| 前端组件测试闭环 | ✅ | `stdd outside-in scaffold --code rtl\|playwright\|storybook\|all`：BDD 场景驱动的可运行测试骨架（RTL 含 a11y/axe 钩子） |
| UI 页面/组件生成器 | ✅ | `stdd ui generate/page <Name>`：DESIGN.md token 驱动的 React/Vue/HTML 骨架 + 配套 RTL 测试 |
| Web UI Dashboard | ✅ | `stdd dashboard [generate|serve]`：零依赖单文件 HTML（内嵌 JSON + 原生 JS），`--serve` 内置 http 服务 |

注：视觉回归的像素级比对（百分比阈值）需 PNG 解码依赖，当前为严格哈希门（CI 安全）；见 known-gaps。

## 各模块覆盖率详情

### 100% 全覆盖的模块
command-runner.js, command-registry.js, dynamic-router.js, file-walker.js,
heterogeneous-adapter.js, index.js (commands), normalizer.js, path-resolver.js,
reporter-injector.js, security.js, sudolang-executor.js, tech-stack-detector.js,
test-command-resolver.js, baby-steps.js, commands.js, pipeline.js, new.js,
workspace.js, list.js, executor-interface.js, noop-executor.js, agents/index.js,
bdd-scenario-parser.js (Round 34: 100%)

### >90% 分支覆盖的模块
workspace-detector.js, logger.js, fix-packet.js, session-progress.js,
graph-cache.js, change-utils.js, hooks.js, continue.js, graph-history.js,
constitution-fix.js, error-propagator.js, mutation/normalizer.js, verify.js,
waiver-manager.js, commit-msg.js (94.89%), constitution-status.js (93.22%),
ff.js (96.55%), explore.js (98.76%), doctor.js (91.01%), cli-utils.js,
change-helpers.js, api-spec.js (74.9→~85%+)

### 85-90% 分支覆盖的模块（剩余优化空间）
apply.js, audit.js, constitution-checker.js, context.js, evidence-capture.js,
guard.js, init.js, learn.js, memory-scan.js, metrics.js, mock-gen.js, mutation.js,
outside-in.js, parallel-executor.js, product-proposal.js, progress.js,
recommend.js, roles.js, schema.js, shell-executor.js, skills.js, spec-generator.js,
starters.js, status.js, story.js, tdd-init.js, update.js, user-test.js, validate.js,
workspace-scope.js, elicitation-engine.js, coverage-parser.js

## 已验证结论（不需要再做的项）

1. **console.log 迁移** — 28 个命令文件全部审计，确认只有用户可见的 CLI 输出
2. **JSON.parse 安全** — 15 处全部审计，有 try/catch 或上层保护
3. **var 声明** — 全部清理完毕
4. **空 catch 块** — 仅剩合理保留项
5. **Registry 对齐** — 50 registry + 7 inline = 57 命令文件
6. **Skill 模板** — 47 个全部有效
7. **Math.random** — 仅 1 处，无安全风险
8. **cli.js 入口测试** — 33 个测试用例
9. **process.exit** — 残留均为 signal handler 或 hook 脚本，合法用途

## 继续优化的建议入口

```bash
# 低难度（< 30min 每项）
# coverage-parser.js: ~87% → 90%+
# update.js: ~89% → 90%+
# status.js: ~84% → 90%+

# 中等难度（~30min 每项）
# bdd-scenario-parser.js: 100% ✓
# elicitation-engine.js: ~88% → 90%+

# 高难度
# cli.js: ~82% → 85%+
```

当前状态已可交付。191 套件 / 4158 测试全绿，90%+ 分支覆盖里程碑已达成。
