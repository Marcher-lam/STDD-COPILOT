# Known Gaps (managed inventory)

> Full English edition of [docs/known-gaps.md](../known-gaps.md). Legend: ✅ solved (with commit) · 🔧 partial · 📋 not started · ⛔ explicitly not adopted (reasoned).

## 1. Claims vs reality

All previously identified claim/reality gaps are settled: turbo claims aligned with its real boundary (ff + spec generation; implementation is the apply-stage AI executor's job); clarify actions implemented; supervisor carries the legacy notice; the architecture doc matches reality.

## 2. Engine & runtime

- graph-cache wiring ✅ · progressive rigor ✅ · custom intents ✅ · retry whitelist + transient classification ✅ · node timeout (`--node-timeout`) ✅ · history wiring ✅ · precise parallel attribution (throwOnFailure) ✅ · global graph timeout (config graph.timeout) ✅ · schema.yaml DSL executor (`validate --schema-driven`) ✅ · engines.yaml `${VAR:-default}` interpolation ✅
- Heterogeneous review: engine-side exclusion via `--implemented-by` + protocol-level enforcement (STDD does not schedule reviewers) ✅

## 3. Depth

- plan task content derives from the proposal's In-Scope items ✅
- certainty evidence stays AI/human-assessed (self-scoring loop risk) — ff prints a nudge
- spec-generator: empty-description tasks no longer create empty .feature files ✅
- `stdd start` wizard covers v1.1+ ✅; `stdd update --check-version` reaches npm (offline-graceful) ✅

## 4. Docs

English editions are full translations (all 12 docs) — completed in v1.2.5.

## 5. Frontend five — all landed (v1.2.0)

design reverse · browser baseline/diff (strict hash or `--threshold` pixel tolerance, zero-dependency PNG decode) · outside-in `--code` runnable scaffolds · ui generate/page · dashboard.

## 6. Docker — verified (v1.2.4)

Daemon started; image built; container smoke covered --version, doctor, init, ff, design reverse. Two real Dockerfile bugs fixed (gid conflict; stale label).

## 7. Explicitly not adopted

memlog (three-log mapping) · git worktrees (executor layer) · three-path ceremony scaling (equivalent flows exist) · Stores (out of scope) · deprecated config keys kept annotated for compatibility. Decision items: skeleton compilation verification (user-project dependency semantics) · certainty auto-assessment (self-scoring loop risk). en full translation is DONE (this document is part of it) — see the Chinese doc for full rationale on the remaining two.

## v1.2.6 — OCR review round 2
- All 11 high + 25 medium findings fixed (RTL scaffold compilation / schema-rules regexes /
  atomic archive / dashboard security etc.)
- Known remainder: --node-timeout remains best-effort for synchronous spawn paths (full
  async + child SIGTERM is a follow-up)
