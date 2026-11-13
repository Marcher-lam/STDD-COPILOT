# CHANGELOG

All notable changes to STDD Copilot will be documented in this file.

## [1.2.10] - 2026-11-13 — 终测报告剩余 N 类缺陷 + propose 动作补全

### Fixed (P1)
- graph (N-graph): every graph-run evidence file persisted `status: "unknown"` because `_determineStatus` had no `graph-run` branch — `graph history` showed unknown even for fully successful runs. Status is now derived from the recorded steps: any failed step/`failedAt` → `fail`; any skipped step (`--skip-apply`) → `skipped` (SKIPPED and PASS carry different audit meanings); otherwise `pass`.
- design (N-design): `stdd design reverse` never scanned `public/` (or `static/`) and required `--(color|font|spacing|radius)-` prefixed custom properties, so a plain hand-written `public/style.css` with `--bg`/`--card` was rejected with exit 1. All custom properties are now captured and classified by name (fonts/radius/spacing/tokens), display tokens strip the semantic prefix, and `suggestRole` learned border/shadow roles.
- confirm (N-confirm): a piped (non-TTY) `stdd confirm` auto-confirmed — recorded `confirmed` indistinguishably from a human decision. Non-interactive runs without a flag now refuse (exit 1, nothing recorded); `--yes` records an explicit non-interactive confirmation and `--skip`/`--yes` both write a `confirm-decision.json` manual-override record (mirroring the risk-triggered gate) with `basis.interactive` for audits. Also fixed two `extractSection` defects: underscored section names (success_criteria) had their content shadowed by a capturing separator group (perpetual "missing success_criteria" hint), and the H1 `# Proposal:` line is now recognized as the title section (removes the framework template's permanent missing-title noise).
- propose (report boundary item): the advertised `show/refine/validate/split` actions are now implemented via a clarify-style action dispatch — and the pre-existing destructive bug is fixed: `stdd propose show <name>` used to run the draft flow and silently overwrite that change's proposal.md (and `propose show` created a junk change named "show"). `draft` now honors `--force` and refuses to overwrite without it; `show` prints read-only; `validate` reuses the proposal completeness check (exit 1 on missing sections); `refine` deterministically regenerates the Clarifying Questions section from the proposal's current state (checklist generator, not an AI rewrite); `split` chunks concrete scope items (≤3 per sub-change) into `split-plan.md` and scaffolds sub-change draft proposals (`--dry-run` prints only, existing sub-changes never overwritten).

### Tests
- +17 regression tests across evidence-capture, graph-run, design-reverse, confirm (legacy non-TTY auto-confirm test rewritten to the refuse+--yes contract), and propose action dispatch.

Gates: 232 suites / 4494 tests; lint clean (0 errors / 0 warnings); docs consistency 9/9.

## [1.2.9] - 2026-11-13 — 终测实测报告修复（4×P0 + 2×P1）

### Fixed (P0)
- verify (D01): the TDD RED-evidence gate grouped apply.log entries by the raw task text; apply rewrites tasks.md with `[phase:*]` markers per phase, so one task's RED/GREEN/REFACTOR evidence split into three grouping keys and every real TDD flow failed verify ("RED evidence 7/21"). Evidence is now correlated on the stable TASK-### id (`taskKey()` in change-utils; falls back to phase-stripped text for unnamed tasks). Same root cause hardened in apply's 3-strikes streak counter and continue's task matching.
- archive (D02): a change whose latest `stdd verify` evidence failed could still be archived with exit 0 (the summary honestly recorded "rejected" but nothing blocked the move). Archive now refuses (exit 1) when the newest `verify-*.json` has `status: 'fail'`; `--force` is the explicit escape hatch and still records `Verdict: rejected`. Honors the `throwOnFailure` orchestration contract used by graph-run.
- spec/tasks (D03): three task-line formats were written by different commands (`new` without colon, `plan` bold `**TASK-001**:`, ff/issue with colon) while the spec generator only parsed plain `TASK-NNN:` — so `stdd new` / `stdd plan` followed by `stdd spec` always failed with "No tasks found in tasks.md". Writers now emit the canonical `TASK-NNN: title`; the parser tolerates legacy bold / colon-less / `[phase:*]`-marked lines and strips residual markers from descriptions.
- lint (D04): `npm run lint` failed on `__tests__/mutation-command.test.js` (no-regex-spaces, introduced by the previous commit's new assertion) — the regex literal is rewritten to `/^ {2}Score:/m`.

### Fixed (P1)
- list (N03): `stdd list --json` on an empty workspace printed plain text ("No active changes found.") instead of JSON; now prints `[]` (or `{"active":[],"archived":[]}` with `--archived`); empty `--specs --json` likewise prints `[]`.
- propose (N17): the documented two-positional form `stdd propose draft <change> --description ...` created a change named after the action keyword and silently dropped every flag (Commander's second positional landed in the options slot). A registry mapper (same pattern as `clarify`) routes it to (description, { name }); the one-positional README form is unchanged.

### Tests
- +25 regression tests across 3 new suites (change-utils task-key, new/plan→spec chain, propose mapper) and 8 extended suites; two legacy archive-verdict tests rewritten to the new gate contract.

Gates: 232 suites / 4477 tests; lint clean (0 errors / 0 warnings); docs consistency 9/9.

## [1.2.8] - 2026-11-10 — 真实项目实测报告修复（3×P0 + 5×P1）

### Fixed (P0)
- apply (P0-1): legacy mode completed a task whenever the whole suite was green — old tests passing marked unimplemented work as done. A task may now only complete with RED evidence in the apply log (a prior failed run, or a RED-phase pass); green-without-RED is blocked (`blocked-no-red-evidence`), stays pending, exits 1. `--allow-no-tests` records an explicit waiver for non-code tasks; `continue` forwards the flag.
- validate (P0-2): zero spec files + zero covered tasks still returned `pass` with exit 0, and `--json` never set a non-zero exit at all. Now: tasks>0 with 0 specs → blocking `no-specs`; `--json` exit code agrees with report status; evidence `_determineStatus` gained a `validate` branch (top level was always `unknown`). Heuristic zero-coverage surfaces as a loud warning, not blocking (word-match can false-positive).
- spec (P0-3): `toSafeFilename` stripped all CJK, so pure-Chinese task descriptions sanitized to empty filenames and `stdd spec` silently skipped every task; CJK is now preserved. Placeholder-only Gherkin steps (the SpecGenerator default template's three generic lines) are a new blocking `generic-placeholder-steps` leakage rule.

### Fixed (P1)
- verify (P1-3): `--no-constitution` recorded `status: 'pass'`; now records `skipped` + reason through the whole chain (terminal SKIPPED, evidence, archive summary) — PASS/SKIPPED/FAIL stay distinct.
- status (P1-4): spec detection only matched top-level `.md`; now shared recursive `.feature`/`.md` discovery (`src/utils/spec-discovery.js`), also adopted by recommend — `hasSpecs` and phase agree with what `stdd spec` writes.
- constitution (P1-2, prior F3): Article 2 now recognizes conventional top-level `test/`, `tests/`, `__tests__/` layouts in `findTestFileForSource`.
- mutation (P1-1): quick mode prints "Heuristic Score" and evidence carries `scoreKind: heuristic|mutation`, so a static health check can no longer masquerade as a real mutation score.

### Tests
- +29 regression tests across 6 new suites (spec-discovery, skipped-status, spec CJK+placeholder, constitution test-dirs, validate structural gates, apply anti-fake-green); legacy-green contract tests rewritten to RED→GREEN.

### Fixed (post-release AI review, same day)
- apply: a no-test-command config failure (`command: '(none)'` + error, never ran a test) counted as RED evidence and could re-unlock the fake green — excluded. `--allow-no-tests` no longer logs a waiver when RED evidence actually exists.
- evidence: the verify status derivation missed the TDD RED-evidence gate — a run failing solely on missing-RED persisted evidence `status: 'pass'`; the gate now joins the conjunction.
- graph-history: replay rendered constitution binary pass/fail; a SKIPPED check replayed as a red failure — now three-way.
- validate: the generic-placeholder rule was unanchored and matched legitimate near-miss phrasings ("Given the system is ready for checkout") — anchored to the full default-template step line.
- verify: the skip reason is now attributed correctly when change rigor (not the --no-constitution flag) disabled the check.
- spec-discovery: specs under domain dirs named like build artifacts (specs/build/, specs/reports/) were pruned by the walker's project-tree skip list — specs/ uses a minimal skip set now.
- change-helpers: toSafeFilename caps length at 60 chars (CJK is 3 bytes/char; long descriptions hit ENAMETOOLONG) and covers CJK Extension A (\u3400-\u9fff).
- package-lock.json root version resynced (was stale at 1.2.4 for four releases).

Gates: 229 suites / 4452 tests; lint clean; docs consistency 9/9; 13/13 report scenarios flipped in end-to-end replay.

## [1.2.7] - 2026-11-09 — 实战测试报告缺陷修复（mutation 幽灵源文件 + flaky 测试）

### Fixed
- mutation: quick scan counted stdd-installed agent hook scripts (`.claude/hooks/*.js` et al.) as project source files — the coverage ratio was structurally depressed and the 80-point gate unreachable on small projects (identical repro project: 77 FAIL with `.claude/`, 100 PASS without). All agent dirs declared in engines.json are now excluded from the source/test scan.
- tests: round24-guard-audit lint cases never intercepted spawnSync — guard.js destructures it at module load (spy landed after capture) and the mock matched `eslint` against the command name while guard invokes `spawnSync('npx', ['eslint', ...])`. Both cases silently ran a real `npx eslint` (network fetch + 10s timeout → load-dependent flakiness). Replaced with the file-level `jest.mock('child_process')` pattern (metrics-lint.test.js) and tightened assertions from membership checks to exact statuses.

### Tests
- +2 regression tests: agent-hook exclusion (default `.claude`) and the full engines.json directory set.

Gates: 224 suites / 4414 tests; lint clean; docs consistency 9/9.

## [1.2.6] - 2026-11-06 — OCR 评审第二轮全量修复（11 high + 25 medium）

### Fixed (high)
- test-scaffolds: RTL skeleton now default-imports the component (+ jest-dom import) — previously every generated test was uncompilable
- schema-rules: countListItems regex matched literal backslash-s (min_items always 0); specs:* glob rules fired bogus blocking findings — both fixed; non-single-file artifact ids skipped
- pipeline: config key nesting (tdd.test_pipeline vs top-level) — wiring never activated against the shipped config
- clarify: single-arg action form (stdd clarify questions) treated the action as a change name
- update: bare stdd update forwarded undefined path to all five helpers (crash); root threaded through
- browser: viewport options coerced to numbers (string defaults broke Playwright)
- delta-spec: legacy verbatim-append idempotent on re-archive; RENAMED FROM/TO pair sequentially
- archive: two-phase merge (write only when zero conflicts) — conflict-abort truly atomic; strict-gate honors throwOnFailure

### Fixed (medium)
- dashboard: loopback-only bind; EADDRINUSE clean error; per-request read; 404 non-root; canonical readers (parseTasks/readDeferred/readRulings/readChangeRigor/readInterruptions)
- graph-run: cache key after workspace resolution; cache cleared on archive node; cycle detection in layering; TRANSIENT_RE narrowed to errno codes; exit-code sniffing sequential-only
- validate: .feature skip delta checks; replace idiom (REMOVED+ADDED) passes; REMOVED FROM-side rename flagged; schema-driven repo-mode guard
- design-reverse: multi-block findBlock (theme.colors + extend.colors); token tables 4-col backticked; CSS dedupe
- version-check: semver prerelease symmetry; Windows npm shell; PACKAGE from package.json
- outside-in: invalid --code rejected; .md specs included; lazy renderers
- pipeline: per-change scoping under global dirs; placeholder_mode validated
- spec-generator: empty-description warns, skipped array contract preserved
- mutation: waived-by-config resolved before evidence persistence
- interruption: YAML-quoted storage, reader unwraps
- ui: companion test guarded; page-under-workspace targets pages/
- ruling-ledger: CRLF collapsed

Gates: premerge exit 0; 224 suites / 4412 tests; lint clean.

## [1.2.5] - 2026-11-06 — en 文档全译完成（撤销原"精简版"决策）

### Changed
- docs/en/ now carries FULL English editions of all 12 documents (was: condensed stubs for the strategic docs). New full translations: concepts, workflows, commands, capabilities, agent-protocol, framework-benchmark (all 18 adoption items), model-strength-adaptation (taxonomy + principles + landed items), known-gaps; the README index rebuilt with sections, keeping the test-locked cross-link lines verbatim. Chinese docs remain the authoritative source.

Gates: docs consistency 9/9.

## [1.2.4] - 2026-11-06 — 第 6 轮：模板真全量同步 + Docker 端到端验证

### Fixed
- Template sync actually completed: the round-4 batch landed only 4 of 13 command templates (a script bug) — this round re-ran the full set with per-section idempotency markers; a registry-vs-template rescan now reports ALL COMMAND TEMPLATES SYNCED (ff/issue/turbo/verify/apply/archive/design/browser/graph/update/schema + 4 more skills: archive/plan/confirm/spec).
- Dockerfile: `addgroup -g 1000` failed on node:20-alpine (gid already in use) — now reuses the existing group when present; image LABEL version updated from stale 1.0.0.

### Verified
- Docker end-to-end: daemon started, image built, container smoke covers --version (1.2.3), doctor, init into a mounted workspace, ff with the certainty nudge, and design reverse's no-sources guidance — the full CLI works inside the published image.

## [1.2.3] - 2026-11-06 — 第 4 轮审计全清：配置段接线/诚实化、update 联网检查、resume 语义

### Wired (previously dead config sections)
- test_pipeline -> stdd pipeline: honors output_dir / ir_dir / placeholder_mode (todo|skip|pending)
- mutation_review -> stdd mutation: threshold as the default (CLI flag still wins), enabled=false waives the failure exit (evidence kept, status waived-by-config)
- sprint_spec -> spec-generator: warns when a change exceeds max_scenarios_per_feature ("just enough specs")

### Honest deprecation (template stdd/config.yaml)
- i18n / ai_engines / docs_site sections marked deprecated with pointers (docs dirs handle bilingual; engines.yaml is the live registry consumed with env interpolation; docs-site templates remain manual-use)

### New
- stdd update --check-version [--json]: npm registry latest-version check (new src/utils/version-check.js with semver-aware compareVersions, prerelease sorts before release); offline degrades gracefully (never hard-fails). `stdd update` with no path now operates on the cwd instead of crashing.

### Fixed / Clarified
- progress --resume now states its semantics explicitly: context recovery only — execution does NOT auto-resume (checkpoint resume belongs to graph run); README wording aligned.
- schema.yaml documents the DSL boundary: which validation keys the --schema-driven executor runs, and which engines own the rest.
- update.js: registry no longer hardcodes threshold default 80 (config participates); several latent crashes fixed while wiring (undefined path arg, method placement).

Gates: premerge exit 0; 224 suites / 4412 tests; lint clean; docs 9/9.

## [1.2.2] - 2026-11-06 — P0+P1+P2：模板同步、声明剧场执行器化、边角清偿

### P0: slash command templates synced (13 + 3 skills)
design(reverse) / browser(baseline+diff --threshold) / ff,issue,turbo(--rigor) / verify(RED gate, --defer/--resolve/--no-lint) / apply(baseline_commit, --ruling, 3-strikes) / archive(strict gate, --skip-strict) / validate(--strict, --schema-driven) / outside-in(--code) / clarify(conversational, actions) / roles(--triage/--implemented-by) / graph(engine options) — the AI-facing interface now knows every v1.1+ capability.

### P1: declarative theater made real
- schema.yaml validation DSL executor (src/utils/schema-rules.js): `stdd validate <change> --schema-driven` runs the declared rules (required / min_length / min_items on artifact sections, leaf-heading resolution for dotted fields like Scope.In Scope). Previously zero consumers.
- engines.yaml ${VAR:-default} interpolation (src/utils/env-interpolate.js) wired into the heterogeneous adapter's engine loader — enabled/model now reflect the actual environment instead of literal placeholders.

### P2: edges
- issue --change-name (parity with ff/turbo)
- ui generate --workspace (output defaults into <ws>/src/components); design reverse --workspace (scans the workspace root)
- graph run global timeout: stdd/config.yaml graph.timeout (default 1h) checked between layers — a long run cannot outlive it
- docs/en/command-reference.md (condensed EN reference, 77 commands)
- jest coverage thresholds added for all 12 new util modules (calibrated to measured levels)

Gates: premerge exit 0; 223 suites / 4406 tests; lint clean; docs 9/9.

## [1.2.1] - 2026-11-06 — 全量修复：像素阈值、验证盲区补测、异构排除

### Added
- Zero-dependency PNG pixel diff (src/utils/png-diff.js): decodes 8-bit non-interlaced PNGs (RGBA/RGB/palette, all five row filters) with only node's built-in zlib, enabling `stdd browser diff --threshold <ratio>` — tolerate up to N% pixel drift instead of strict hash equality; non-decodable buffers and threshold 0 fall back to the hash gate. Verified against genuine PNG byte streams constructed in-test (deflate + CRC32).
- `stdd roles review --triage --implemented-by <engine>`: the triage suggestion now dynamically excludes the implementing engine (engine-diversity rule made actionable).

### Fixed / Verified
- known-gaps.md self-contradiction (the frontend row still said "not started" after v1.2.0 landed them).
- Verification blind spots closed: dashboard --serve now has a real HTTP start/stop assertion; ui generate vue/html variants have CLI integration tests (plus a page-action test); design reverse parses TypeScript config syntax (export default / typed) at both the unit and CLI level (tailwind.config.ts discovery).
- Decision annotations added to known-gaps for the three items intentionally not done here (skeleton compilation verification, certainty auto-assessment, full en translation) with reasons.

## [1.2.0] - 2026-11-06 — 前端五项全部落地

### Added (the frontend five)
- stdd design reverse: DESIGN.md reverse-engineered from the project's REAL sources - Tailwind config tokens (text-parsed, user code never executed), CSS custom properties, and component-library dependencies - with per-token Source annotations; graceful no-sources guidance back to presets.
- stdd browser baseline/diff <url> --name <n>: visual regression gate - named baselines under stdd/evidence/visual/baselines, strict hash comparison, diff evidence archived, exit 1 on change, --allow-changed accepts and re-baselines. Requires playwright (graceful install hint without it); pixel-percentage thresholds deliberately deferred to stay zero-dependency.
- stdd outside-in scaffold --code rtl|playwright|storybook|all: runnable test-code skeletons driven by the change's BDD scenarios - RTL tests with an a11y/axe hook, Playwright specs, Storybook stories (new src/utils/test-scaffolds.js).
- stdd ui generate|page <Name>: DESIGN.md-token-driven component/page skeletons (react default, vue/html variants; tech-stack aware) with a companion RTL test scaffold (new src/utils/ui-scaffolds.js).
- stdd dashboard [generate|serve]: zero-dependency single-file HTML dashboard (inline JSON + vanilla JS, no CDN) aggregating changes/rigor/tasks/verify status/deferred/rulings/interruptions; --serve ships a tiny built-in http server.

### Changed
- CLI command count 75 -> 77 (ui, dashboard) - counts synced across README/USAGE/docs and the taxonomy test.
- fix.md frontend capability table rewritten: five items landed.

## [1.1.2] - 2026-11-06 — 引擎收尾与剩余缺口清偿

### Added
- Node timeout: `stdd graph run --node-timeout <seconds>` — a node exceeding it fails with a timedOut marker and is never retried; off by default.
- Content-level retry classification: side-effect nodes retry only when the failure looks transient (ETIMEDOUT/ECONN/network/rate-limit/flaky); deterministic failures stop after one attempt regardless of the whitelist.
- Graph history wiring: every graph run (success or failure) writes a graph-run evidence entry into the change's evidence/ dir — `stdd graph history` sees runs immediately.
- Precise parallel failure attribution: verify/archive accept throwOnFailure (injected by graph run) so failures throw from the owning node instead of relying on the best-effort exit-code heuristic.
- Engine-diverse triage suggestion: the triage worksheet recommends a Tier-1 engine different from the implementer, read from engines.yaml.
- certainty nudge: ff prints the `stdd certainty assess` command (with a scores example) after creating a change.
- English docs: en/framework-benchmark.md and en/model-strength-adaptation.md (condensed editions linking back to the authoritative Chinese versions).

### Fixed
- spec-generator: tasks whose description sanitizes to an empty filename produced a contentless `.feature` file — now skipped with a recorded reason.
- README engine count corrected 24 → 22 (matches engines.yaml and ARCHITECTURE).
- `stdd start` wizard help now covers the v1.1 capabilities (--rigor, graph run, --defer).

### Verified
- npm run test:benchmark passes (graph compile 0.4ms, constitution check 13.9ms median).
- Docker: CLI present but daemon unavailable on this machine — build/compose verification deferred to a daemon-equipped environment (noted in known-gaps).

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
