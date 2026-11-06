# Framework Benchmark: superpowers + BMAD + OpenSpec (EN summary)

> Condensed English edition. The authoritative full version (with code locations for every item) is [docs/framework-benchmark.md](../framework-benchmark.md).

## Why these three frameworks

| Framework | What STDD adopted |
|---|---|
| superpowers | TDD iron law (RED evidence gate), 3-strikes escalation, ruling ledger, plan Interfaces/Verification blocks, engine-diverse review |
| BMAD | deferred-work & ruling ledgers, baseline_commit, previous-change intelligence, triage review, AD-n stable IDs, retrospective verdict |
| OpenSpec | delta-spec engine (real header-based merge, RENAMED/REMOVED/MODIFIED/ADDED, conflict abort, idempotent re-archive), validate --strict, pre-archive gate, progressive rigor |

## Adoption status

All planned items landed or explicitly closed (18 numbered adoptions plus DAG engine enhancements): see the Chinese doc's numbered list 1–18. Explicitly not adopted, with reasons: memlog (mapped onto rulings.md / apply.log / progress.jsonl), git worktrees (executor-layer concern), three-path grading (ff/turbo/standard already equivalent), Stores (out of scope).

## The one-line verdict

STDD's skeleton (spec-driven + evidence chains + auditability) matters MORE as base models strengthen; its weak-model compensation layers (micro-task caps, ceremonial clarify, role simulation, stage-triggered pauses) have been budgeted, demoted, or labeled legacy — see [model-strength-adaptation.md](model-strength-adaptation.md).
