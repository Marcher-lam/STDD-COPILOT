# CHANGELOG

All notable changes to STDD Copilot will be documented in this file.

## [1.1.1] - 2026-11-06 — Skill Graph 引擎增强与缺口清偿

### Added
- Layered parallel execution in graph run: Kahn topological layering; same-layer independent nodes run concurrently (bounded by graph.max_parallel, default 4); --sequential forces the previous linear behavior; per-node options snapshots prevent rigor-injection races between concurrent verify/archive nodes.
- Project-defined intents: stdd/graph/intents.yaml adds or overrides intent pathways; malformed files are ignored, built-ins unaffected.
- Retry safety: --retry now applies only to read-only nodes (verify/fix-packet/type-check/explore/brainstorm); side-effect nodes fail fast instead of re-running blind.
- Error propagation wired: node failures run through ErrorPropagator to locate the upstream re-planning decision point, recorded on the failed step and printed as guidance — the previously unwired runtime module now has its first consumer.
- clarify actions implemented (questions / edge-cases / constraints) matching the documented help; supervisor carries the legacy notice like roles/runtime.
- plan derives task CONTENT from the proposal's In-Scope items (each becomes an implement-with-TDD task; support tasks backfill) instead of a fixed 6-template list; scope extraction is line-scanned (extractField's multiline `$` truncated sections to their first line).
- docs/known-gaps.md: managed inventory of every declared-vs-real / depth / scope gap with status and evidence.

### Changed
- turbo claims aligned with its actual boundary (ff + spec generation; implementation is the apply-stage AI executor's job) across README / agent-protocol / USAGE.
- ARCHITECTURE.md engine section updated to match reality.

## [1.1.0] - 2026-11-05 — 框架对标与模型强度适配

### Fixed (open-code-review round 10 — low/maintainability sweep)
- Fail-fast ordering: ff/issue validate --rigor BEFORE any filesystem writes (no more orphan half-created changes on a typo'd flag).
- roles --triage persists the report AFTER the triage mutations — the on-disk artifact now matches the console/JSON state (status 'untriaged', verdicts on findings).
- Ruling ledger sanitizes newlines (a multi-line --ruling can no longer inject a forged ledger entry).
- verify's TDD gate prints an honest NOTE ("ran phases but recorded no RED pass (--allow-no-tests?)") instead of a green "✓ RED evidence present for 0/N".
- The design schema's validation block now requires the AD-n template's binds/prevents fields instead of the removed rationale.
- clarify: every area keeps one gentle probe question in conversational mode (signal-less constraint areas are the unknown-unknowns — never dropped entirely; signal hits replace the probe to stay bounded); the question catalog is single-sourced (FULL_QUESTIONS) so conversational output is always a subset of --exhaustive.
- cli.js: runtime-agent start block restored to its original indentation; the legacy notice is suppressed under --json.
- Deduplication/maintainability: shared readApplyLog util (apply + verify), DELEGATION_ENGINES in its own module (apply + graph-run), confirm uses one config reader and budgetState() instead of reimplementing, archive extracts writeMergeReport, validate drops dead `file` params, extracts shared checkRequirementShape/checkRequirementDuplicate, replaces the nested mode ternary, and fixes the misleading JSDoc.

Tests: +1 suite, +8 cases (review-low-fixes); clarify exhaustive count updated 20→23; full suite green; lint clean.

### Fixed (open-code-review round 9)

Critical & high (from the open-code-review pass over this changeset):
- plan: fed-back deferred items were written as `- [ ]` checkboxes matching TASK_PATTERN — verify/archive treated intelligence findings as real tasks and failed forever; now a suspended-marker bullet that no task parser matches. Archive "latest" is picked by the trailing timestamp, not lexicographic name order.
- confirm: risk-triggered pending-human now has an exit — `--skip` records an explicit manual-override decision and confirms. Non-numeric certainty thresholds fail closed (defaults + warning) instead of NaN fail-open. Certainty history matching tolerates corrupt JSONL lines and path-style contexts. The risk-signal regex is narrowed and shared with rigor (common words like auth/security no longer force the human gate for names like add-user-auth). Warning-band output no longer claims certainty ≥ auto when it wasn't.
- graph-run: nodes that report failure via exit code 1 (verify/archive) are treated as failed and never checkpointed (previously cached as success and skipped on every resume). --change-name is validated (path traversal rejected before any write). Negative --retry clamped. Cache key includes skipApply/workspace; skipped nodes are not checkpoints; corrupt cache entries fall through to re-execution. Resume hint names the concrete --change-name; a failing run no longer materializes a phantom active change.
- validate/archive: strict checks resolve renames the same way the merge engine does (RENAMED + MODIFIED-by-new-name no longer refused). The pre-archive gate is structure-only — stateful delta-vs-main rules no longer block the idempotent re-run after a conflict-aborted partial merge; gate scope now matches merge scope (contracts/api-spec skipped).
- delta-spec: headerless legacy MODIFIED/REMOVED sections emit a warning instead of being silently dropped; the legacy ADDED marker block is idempotent across re-archives; ADDED near-miss (case/whitespace) is flagged as a conflict.

Medium hardening: verify gains --no-lint as the explicit escape from a strict change's lint default; clarify strips the appended Clarification section before signal tests (no self-perpetuation, no cross-contamination of confirm's risk scan); interruption accounting never throws into the gate; rigor/baseline appends are newline-safe; apply skips baseline capture in dry-run; graph --retry parses at the option level; runtime agent legacy notice suppressed under --json.

Tests: +1 suite, +17 cases (review-fixes); rigor/dag assertions updated for the narrowed signals and archive-strict semantics; full suite 213/213, 4327/4327 passing; lint clean.

### Added (model-strength adaptation round 8 — P2)
- Interruption budget (new src/utils/interruption.js): every real human pause — confirm pending-human, apply 3-strikes escalation — is counted on the change (.state.yaml interruptions_used) against interruption.budget (default 3). Exceeding the budget flags the decision file (budgetExceeded) and warns to split the change or tighten thresholds; it never blocks a genuinely human decision, it makes the cost observable. The unified pause policy lands in docs/agent-protocol.md: pause only on (a) gate pending-human, (b) circuit-breaker, (c) irreversible actions.
- Legacy notices: single-model role simulation (roles list/party) and the multi-agent state machine (runtime agent) now carry a dim "legacy (optional)" line — weak-model-era compensation, optional analysis tool under strong base models; evidence-based review goes through roles review --triage.
- Config honesty: audit found certainty check_points / auto_skip_when / phases_requiring_confirm had ZERO consumers (declarative theater) and certainty thresholds lived at tdd.certainty while confirm read top-level certainty (never found; defaults coincided) — both now marked deprecated in-template, and confirm accepts either nesting. Also fixed the planning section that had been inserted mid-defense (kidnapping failure_rollback/static_quality/mutation_review keys).

### Added (model-strength adaptation round 7 — P1)
- Change-level rigor across the main workflow: ff/issue/turbo record a rigor level into .state.yaml at change creation (auto-escalating to strict on irreversible signals — migration/auth/payment/breaking — or high issue severity; --rigor overrides). verify (light: constitution skipped, strict: lint added) and archive (light: strict gate relaxed) honor the recorded level unless explicitly overridden per invocation. graph run now shares the same semantics via the new src/utils/rigor.js.
- Conversational clarify: the default is no longer a 20-question boilerplate dump — a core set (input boundaries, empty/null, failure scenarios) plus questions selected by proposal signals (API/performance/security/data); irrelevant areas are omitted entirely. --exhaustive restores the full checklist.
- Fixed: clarify's "[action] [change]" positional signature silently dropped the entire commander options object into an unused third parameter — every flag (--exhaustive, --focus, --rounds) had never reached the command. A registry mapper now aligns the arguments.

### Added (model-strength adaptation round 6)
- Adaptive task budget in plan: the hardcoded 6-task cap (a weak-model compensation) is replaced by a scale function (base 4; +1/+2 by scope items; +1 for 600+ word proposals; +1 for multiple cross-cutting risk signals; clamped to [3,10]). `planning.max_tasks: auto|<n>` in stdd/config.yaml pins it; oversized proposals get an Epic-split hint instead of silent truncation. See docs/model-strength-adaptation.md.
- Risk-triggered confirm gate: `hitl.mode: "risk-triggered"` lets the gate itself decide — auto-approve when the latest certainty assessment is at/above auto_threshold AND no irreversible/high-risk signal is present (decision + basis persisted to confirm-decision.json); otherwise the change is left unconfirmed with a pending-human decision recording the exact reasons. Other modes keep legacy behavior.
- New strategy doc `docs/model-strength-adaptation.md`: constraint taxonomy (decays / survives / grows in value with model strength), the four design principles (evidence-based, risk-triggered, scale-proportional, freedom-by-default), and the P1/P2 backlog.

### Fixed (model-strength adaptation round 6)
- `stdd confirm` crashed on every project with "Invalid regular expression: /**title**/..." — the bold-heading pattern in extractSection never escaped `**`. The command is usable again.

### Added (DAG round 5)
- Progressive rigor for graph run (OpenSpec): `--rigor light|standard|strict` with intent-based defaults (hotfix/research=light, feature/repair=standard). light loosens ceremony for routine changes (verify skips constitution, archive skips the strict gate); strict tightens it (verify also lints); explicit user node options always win.
- Node retry + delegation evidence (superpowers fix-loop): `--retry <n>` bounded retries per node; final failure records a delegation suggestion (fresh engine + fix packet) and persists the full run result to stdd/changes/<n>/graph-run-result.json.
- Checkpoint cache wired into graph run: successful nodes are fingerprinted per change+intent+rigor into the PROJECT-LOCAL stdd/graph/cache (fixing the package-root cross-project pollution); re-running the same command resumes from the last failed node; --no-cache re-executes everything. The GraphCacheManager constructor now accepts an optional cacheRoot.

### Added (P3 round 4)
- Ruling ledger: `stdd apply <change> --ruling "决定 — 理由 — 出错了的代价"` records execution-time decisions in `rulings.md` (numbered, dated, persisted through archive); `stdd plan` feeds the latest archived change's 3 most recent rulings back into the new task list. Closes the memlog backlog item by mapping its role onto rulings.md / apply.log / progress.jsonl instead of adding a fourth log engine.
- AD-n decision validation: `stdd validate <change> --strict` checks design.md for duplicate AD numbers (blocking), Supersedes references to missing decisions (blocking), and legacy `### Decision:` headings without stable IDs (warning). design.md is deliberately excluded from spec leakage rules.
- Retrospective verdict: archive summaries now carry `Verdict: accepted | accepted-with-open-items | rejected` computed from evidence (failed verification => rejected; open deferred items => accepted-with-open-items; else accepted).
- Engine-diverse review protocol: triage worksheets gain Implemented-by / Triaged-by fields with a "different engine than the implementation" rule; docs/agent-protocol.md gains a five-rule cross-framework review & adjudication section.

### Added (P2 round 3)
- Stable decision IDs: the design template in schemas/spec-driven/schema.yaml now uses `### AD-n: [name]` with never-renumber/never-reuse rules (supersede via higher number + `Supersedes: AD-x`) and Binds/Prevents fields (BMAD stable ID family).
- RED-phase evidence gate in verify: parses apply.log and fails verification for TDD-phase tasks that reached GREEN without a recorded RED pass ("watch the test fail"); legacy-mode tasks are counted but not blocked; report gains a `TDD: PASS/FAIL (RED evidence N/M)` line.
- 3-strikes escalation in apply: tracks consecutive per-task failures in apply.log (reset by any pass); from the third failure on, prints a circuit-breaker ("three failed fixes is an architecture problem, stop patching — re-plan or delegate with the evidence") and writes `escalation-*.json` evidence. Covers legacy, GREEN, and REFACTOR failure paths.
- Previous Change Intelligence in plan: tasks.md generation feeds still-open deferred-work items from the most recently archived change back into the new task list (with Source pointers), so deferred findings loop instead of rotting in the archive.
- Triage-mode adversarial review: `stdd roles review <target> --triage` marks findings `verdict: untriaged` (no auto-fail), and writes a Triage Worksheet (verdict scale high/medium/low/false/maybe-false; routing buckets intent-gap/plan-defect/patch/defer with deferred-work ledger integration). Non-triage behavior unchanged.

### Added (P1 round 2)
- Pre-archive strict gate: `stdd archive` now runs strict delta validation before touching any spec file; blocking issues refuse the archive with per-item `file:line rule` output and guidance. Escape hatch: `--skip-strict`.
- Baseline commit capture: the first `stdd apply` on a change records `git rev-parse HEAD` into `stdd/changes/<name>/.state.yaml` as `baseline_commit` (idempotent, never overwritten; silently skipped outside git repos) so reviews can diff against the pre-implementation state (BMAD baseline_revision).
- Deferred-work ledger: `stdd verify <change> --defer "<finding>"` records numbered, dated entries in `deferred-work.md`; `--resolve <n>` closes them; verify reports `Deferred: N open / M total` (captured in evidence); archive warns about open items and carries the ledger into the archive (BMAD deferred-work / loop-sweep).

### Added
- New delta spec engine (`src/utils/delta-spec.js`) implementing OpenSpec archive semantics: header-based requirement matching (`### Requirement:`), apply order RENAMED → REMOVED → MODIFIED → ADDED, conflict detection (target missing, added-conflict, case/whitespace near-miss, renamed+removed conflicts, duplicate headers), and idempotent re-archive (already-synced / already-removed detection).
- `stdd validate --strict`: OpenSpec-style delta structure validation — requirement/scenario completeness, duplicate headers, MODIFIED/REMOVED/RENAMED target checks against the main spec, SHALL/MUST statement warnings; composable with `--spec-guardian`; repo mode checks main specs too.
- `docs/framework-benchmark.md`: gap analysis against superpowers / BMAD / OpenSpec with adoption decisions and a prioritized backlog.
- Tasks template (`schemas/spec-driven/templates/tasks.md`) now includes per-task Verification (Run + Expected), Sources traceability (`[Source: file#section]`), and Interfaces (Produces/Consumes) blocks.

### Changed
- `stdd archive` now performs a real delta merge when the target spec exists: MODIFIED replaces the requirement block in place, REMOVED deletes it, RENAMED renames it. Delta conflicts abort the archive (exit code 1), write a detailed `spec-merge-report.json`, leave the change active and the main spec untouched. The legacy marker-based path remains for brand-new specs.
- Delta spec template in `schemas/spec-driven/schema.yaml` now documents the `## RENAMED Requirements` section.

### Fixed
- `GWT_PATTERN` in `validate.js` now recognizes OpenSpec-style bold steps (`- **WHEN** ...`) in addition to Gherkin steps, so valid scenarios are no longer flagged as `missing-gwt`.

### Tests
- +3 suites, +46 tests: `delta-spec.test.js` (25), `archive-delta-merge.test.js` (6, end-to-end CLI), `validate-strict.test.js` (15). All existing archive/validate suites stay green (backward compatible).

## [1.0.7] - 2026-05-24

### Added
- Fixed and completed 4 zero-coverage batch test suites (batch1-4) — 88 tests covering all 23 previously 0%-coverage command modules (brainstorm, certainty, commit-tdd, complexity, design, execute, factory, final-doc, help, iterate, memory, mock, parallel, plan, propose, prp, spec, supervisor, vision, waiver-manager-command, constitution, clarify, confirm).
- Added 3 targeted coverage test suites for low-branch-coverage modules:
  - `cli-utils-coverage.test.js` (14 tests) — createSpinner + safeAction
  - `change-helpers-coverage.test.js` (22 tests) — generateChangeName, toSafeFilename, toTitleCase, workspaceContext, resolveWorkspaceContext
  - `api-spec-coverage.test.js` (78 tests) — 20+ standalone utility methods
- `round34-coverage.test.js` (8 tests) — commit-msg (94.89%, +7pp) and constitution-status (93.22%, +5pp) branch coverage boost.
- Test count: 4158 (+210), suites: 191 (+8).

### Fixed
- Fixed async `execute()` calls in batch test files using synchronous `try/finally` (missing `await` + `catch`) causing unhandled Promise rejections and process crashes.
- Fixed `cap()` being erroneously defined as `async () =>` in batch3, breaking `c.r()` calls.
- Fixed ConstitutionCommand constructor dependency failures in test environment with try/catch guards.

## [1.0.6] - 2026-05-24

### Changed
- Extracted `createSpinner`, `safeAction`, and `CONSTITUTION_ARTICLES` from cli.js into `src/cli/helpers/` modules, reducing the CLI entry point from 555 to ~515 lines.
- Audited all remaining `process.exit` calls in `src/` — confirmed all are legitimate (signal handlers and hook scripts).
- Updated `fix.md` optimization tracker to reflect Round 31-32 progress.

### Added
- Added 12 targeted coverage test suites (`status-coverage-boost`, `shell-executor-coverage`, `update-coverage-boost`, `tdd-init-coverage-boost`, `commit-msg-coverage-boost`, `coverage-parser-coverage-boost`, `ff-coverage-boost`, `explore-coverage-boost`, `doctor-coverage-boost`, `guard-coverage-boost`, `validate-coverage-boost`, `skills-coverage-boost`) with 103 new test cases.
- Test count grew from 3845 to 3948 (171 → 183 suites, 0 failures).
- Created `src/cli/helpers/` directory with `cli-utils.js`, `constitution-data.js`, and `command-factories.js` modules.

## [1.0.5] - 2026-05-23

### Added
- Added project-local BDD template override coverage for `stdd/templates/bdd-templates.yaml`.
- Added regression coverage for hotfix graph runs using generated and explicit change names.
- Added the missing `/stdd:commit` command template backed by the existing `stdd commit` CLI.

### Changed
- Externalized BDD generation templates to `stdd/templates/bdd-templates.yaml` with project-local override support.
- Clarified mutation quick mode as a heuristic score rather than real mutation testing.
- Updated package metadata and documentation for the v1.0.5 release.
- Updated slash command taxonomy from 75 to 76 command templates.

### Fixed
- Fixed `stdd graph run --intent hotfix` so the generated change name is passed through to `stdd issue`, `apply`, `verify`, and `archive` consistently.
- Removed the last production `execSync` usage in hooks Git initialization and replaced it with `spawnSync('git', ['init'])`.
- Unified hooks settings backups on `.backup` so install, disable, and enable use the same recovery file.
- Removed failed `product-proposal` section-splitting dead code that was not wired into production.
- Removed stale documentation references to the non-existent `src/utils/graph-executor.js`.

### Security
- Hardened hook installation by avoiding shell command execution for `git init`.

## [1.0.4-preview] - 2026-05-22

### Added
- **STDD Skills 全量审查完成**: 47 个 STDD skills 全部审查并标记 ✅ 完成
- **api-spec skill 增强**: 添加框架原生 hooks (React Query, SWR, Vue Query, Svelte Query)
- **apply skill 增强**: 添加 Snapshot 测试、并行执行、智能重试、参数化测试支持

### Changed
- **SKILL.md 文档质量**: 所有 47 个 skill 文档覆盖外部工具最佳实践
- **多语言支持**: 确认所有 skills 支持语言无关设计
- **文档计数**: skill_method.md 中所有 skills 标记完成状态

### Fixed
- 文档与实际实现保持一致

## [1.0.3] - 2026-05-21

### Added
- **12 个新 Command 模板**: vision.md, supervisor.md, prp.md, parallel.md, mock.md, memory.md, iterate.md, help.md, factory.md, design.md, complexity.md, certainty.md
- **12 个新 CLI 命令实现**: vision, supervisor, prp, parallel, mock, memory, iterate, help, factory, design, complexity, certainty
- **commit-tdd 命令**: 原子化 TDD 前缀 Git 提交信息生成

### Changed
- **Command 模板数量**: 63 → 75
- **斜杠命令总数**: 110 → 122 (75 Command + 47 Skill)
- **CLI 命令实现**: 66 → 67
- **全面文档更新**: CHANGELOG.md, README.md, README_EN.md, USAGE.md, docs/command-reference.md, docs/EvoRL.md, docs/PRODUCT-PROPOSAL.md, docs/STDD-VERIFICATION-TEST.md, ARCHITECTURE.md
- **测试契约更新**: test-support/docs-contracts.js, __tests__/docs-taxonomy-consistency.test.js

### Fixed
- 修复所有文档中的命令数量不一致问题
- 所有 122 个斜杠命令和 67 个 CLI 命令已完全覆盖

## [1.0.2] - 2026-05-20

### Added
- **2 个新 Command 模板**: `fix-packet.md`, `product-proposal.md`
- **9 个新命令实现**: `brainstorm.js`, `clarify.js`, `confirm.js`, `constitution.js`, `execute.js`, `final-doc.js`, `plan.js`, `propose.js`, `spec.js`
- **43 个辅助命令模板**: api-spec, audit, baby-steps, browser, ci-generator, commands, commit-msg, context, contract, depcheck, doctor, elicitation, extensions, fix-packet, graph-history, graph-run, guard, hooks, learn, list, memory-scan, metrics, mock-gen, mutation, outside-in, pipeline, product-proposal, progress, recommend, roles, schema, skills, spec-generator, start, starters, status, story, tdd-init, update, user-test, validate, waiver-manager, workspace

### Changed
- **Command 模板数量**: 63 → 75
- **斜杠命令总数**: 110 → 122 (75 Command + 47 Skill)
- **CLI 命令实现**: 66 → 67
- **文档同步更新**: CLAUDE.md, AGENTS.md, CLAUDE_CODE_GUIDE.md, README.md, USAGE.md, docs/commands.md, docs/EvoRL.md, docs/STDD-VERIFICATION-TEST.md
- **测试更新**: docs-taxonomy-consistency.test.js, test-support/docs-contracts.js

### Fixed
- 修复文档中命令数量不一致的问题
- 所有 122 个斜杠命令和 67 个 CLI 命令已完全覆盖
## [1.0.1] - 2026-05-19

### Added
- **28 轮质量优化**: 测试套件从 77 增至 171，测试用例从 888 增至 3810（100% 通过）
- **覆盖率大幅提升**: Stmts 72% → 97.33%, Branch 72% → 91.03%, Funcs → 97.15%, Lines → 97.87%
- **171 个测试套件**: 覆盖全部 66 个命令文件和 21 个工具模块
- **新增 round 测试文件**: round24-round28 针对性覆盖低覆盖模块的边界分支
- **结构化 logger 迁移**: 92 处 console.error → logger 迁移，新增 `src/utils/logger.js`
- **process.exit 修复**: 14 处 process.exit → exitCode 改造，提升测试友好性
- **空 catch 块修复**: 52 处空 catch 块添加合理处理或注释
- **var → const/let**: 9 处遗留 var 声明全部清理
- **未使用导出清理**: 13 处未使用的导出项清理
- **Jest 覆盖率阈值**: 7 个核心模块配置覆盖率阈值

### Changed
- **CHANGELOG.md**: 补充 v1.0.1 版本完整变更记录
- **CONTRIBUTING.md**: 更新测试基线至 171 套件 / 3810 测试
- **CLAUDE_CODE_GUIDE.md**: 更新测试基线信息
- **README.md / README_EN.md**: 更新项目结构中的测试套件数量
- **ARCHITECTURE.md**: 核对命令数量和工具模块数量
- **AGENTS.md**: 更新版本至 2.3

### Fixed
- 52 个空 catch 块添加合理处理（JSON.parse fallback、signal handling 等）
- 6 处 TODO 注释替换为数据驱动实现
- 覆盖率报告从 `coverage-summary.json` 精确解析

## [1.0.0] - 2026-05-14

### Added
- **Skill Graph Engine**: Dynamic DAG orchestration with intent-adaptive topology (hotfix/feature/repair/research)
- **66 CLI Commands**: Full workflow automation (init, new, apply, verify, archive, mutation, start, doctor, etc.)
- **Constitution System**: 9 articles with Hook Enforcement and waiver tracking
- **Ralph Loop TDD**: Red → Green → Refactor cycle with phase enforcement
- **5-Level Defense System**: Human confirmation gates, micro-task isolation, failure rollback, static quality, mutation review
- **Graph Runtime Modules**: Dynamic router, graph cache, evidence capture, error propagator, heterogeneous adapter, parallel executor
- **Multi-Agent Runtime**: Party Mode state machine, SudoLang parser/executor
- **Browser Automation**: Built-in Playwright integration for E2E testing
- **Workspace/Monorepo Support**: Registry, scope detection, per-package commands
- **Mutation Testing**: Quick heuristic mode + Stryker delegation
- **Evidence Capture**: Structured error evidence with multi-hop propagation
- **22 AI Engine Adapters**: 4-Tier compatibility system
- **Integration Tests**: End-to-end workflow validation
- **Performance Benchmarks**: Baseline metrics for core operations
- **TypeScript Type Definitions**: JSDoc types for core interfaces
- **Command Registry**: Centralized command management for dynamic loading
- **CommandLoader Pattern**: CLI refactored from 1125 to ~400 lines via modular command loading
- **Shell Executor**: Allowlist-based shell command execution with audit logging
- **Session Progress Tracking** (`stdd progress`): Real-time JSONL progress log for all CLI commands, survives terminal close/crash, supports breakpoint resume via `--resume`, SIGINT/SIGTERM signal capture, automatic truncation at 5000 entries
- **Product Proposal Generator** (`stdd product-proposal`): Scans all `stdd/` artifacts (vision, proposals, specs, designs, tasks, evidence, progress) and generates a 15-section product proposal report (`PRODUCT-PROPOSAL.md`) with artifact coverage, quality metrics, PM capability matrix, and roadmap
- **Logging System**: Multi-level structured logging with rotation
- **`stdd start`**: Interactive quick-start wizard for new users
- **`stdd doctor`**: Project health diagnostics (10 checks: STDD dir, config, Node.js version, git hooks, etc.); `--deep` mode for extended audit
- **`file-walker.js`**: Shared directory traversal utility, unifies 7 duplicated implementations
- **Docker Multi-Stage Build**: `.dockerignore`, non-root user, minimal production image
- **Coverage Thresholds**: Enforced on 7 core modules via Jest configuration
- **CI Pipeline**: test + package + docker jobs matrix (Node.js 20/22); premerge gate covering audit + lint + docs + coverage + Jest
- **Smoke Tests**: Quick health checks for initialized projects and active changes
- **14 new test suites**: doctor, start, fix-packet, learn, roles, story, pipeline, user-test, validate, outside-in, baby-steps, elicitation, waiver-manager, file-walker (77 suites / 888 tests total)

### Changed
- **apply.js/verify.js**: Extracted `getConfigTestCommand()` to shared module (`test-command-resolver.js`)
- **Graph runtime docs**: Aligned graph runtime comments with actual fallback behavior
- **config.yaml**: Calibrated test framework defaults from `vitest` to `jest` (3 locations)
- **cli.js**: Removed duplicate base program configuration (`--version`, `--no-color`, help footer)
- **7 command files**: Replaced local `walk`/`walkFiles` with shared `file-walker.js` utility
- **CI/CD**: Added Node.js 18/20/22 matrix testing

### Fixed
- Graph runtime self-healing now preserves `_healingMeta` during rollback
- Integration tests aligned with actual CLI error messages
- `new change` now creates valid tasks.md with sample tasks
- **Progress tracking**: `stdd progress` no longer records itself in progress log (read-only observability)
- **Progress tracking**: Non-zero `process.exitCode` now recorded as `fail` instead of `complete`
- **Progress tracking**: `stdd progress --clear` no longer leaves dangling `complete` entry
- **Progress tracking**: `--resume` hints narrowed to resumable workflow commands only (apply/verify/archive/continue)
- **Verify test**: Renamed stale test name `'lint failure is a warning, not fatal'` → `'lint failure makes verification fail'`
- **security.js**: Fixed `redactSensitiveInfo` regex — non-capturing group `(?:...)` caused `$1` to output as literal text

### Removed
- `stdd/graph/cache/*` and `stdd/progress.jsonl` removed from git tracking; added to `.gitignore`
- `error-handler.js`: Removed dead code (never imported by any production file)
- `ora` dependency: Removed unused package
- `apply.js` local `TASK_PATTERN`: Removed unused duplicate of `change-utils.js` pattern
- `cli.js` dead `recommendEngine` function after `program.parse()`

### Security
- Path traversal protection in change name validation
- Directory traversal prevention in file operations
- Command injection prevention via `spawnSync`
- No hardcoded credentials or secrets

## [0.9.0] - 2026-05-13

### Added
- Initial public release
- Basic CLI commands (init, new, apply, verify, archive)
- Skill definitions for 5-phase workflow
- Constitution system foundation
- Graph engine foundation

## Version History Legend

- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements
