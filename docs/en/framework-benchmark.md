# Framework Benchmark: superpowers + BMAD + OpenSpec

> Version: 1.0-en | Full English edition of [docs/framework-benchmark.md](../framework-benchmark.md).

## Why benchmark these three frameworks

| Framework | Positioning | Most valuable part for STDD |
|------|------|----------------------|
| superpowers | discipline skills library | TDD iron law, verification-before-claims, plan Interfaces/Run+Expected format, subagent collaboration, systematic debugging |
| BMAD-METHOD | agile multi-agent methodology | story-as-complete-context, DoD checkbox gates, triage code review, memlog decision log, deferred-work ledger, stable ID family |
| OpenSpec | lightweight spec-driven framework | `### Requirement:` / `#### Scenario:` structured specs, delta specs (ADDED/MODIFIED/REMOVED/RENAMED) archive semantics, `validate --strict`, idempotent conflict detection |

Shared principles: **artifact-first, behavior-first, evidence gates, idempotent replay**.

---

## Adoptions landed (18 items)

### 1. Delta spec engine: OpenSpec archive semantics (core)

The original `archive.js` merge only appended MODIFIED/REMOVED sections as comment-marked blocks at the end of the spec — modifications never replaced, removals never removed, repeated archives accumulated duplicates, with zero conflict detection.

New `src/utils/delta-spec.js`: `### Requirement: [Name]` headers as unique identifiers; OpenSpec order **RENAMED → REMOVED → MODIFIED → ADDED**; MODIFIED replaces in place, REMOVED truly deletes, RENAMED truly renames. **Conflicts abort the archive** (report + exit 1, change stays active, main spec untouched); **idempotent** (identical ADDED → already-synced warning); legacy marker path preserved for brand-new specs.

### 2. `stdd validate --strict`

Blocking: missing scenarios, duplicate headers, MODIFIED/REMOVED/RENAMED targets missing from the main spec, ADDED conflicts. Warnings: missing SHALL/MUST, already-synced, delta without standard sections. Repo mode checks main specs too.

### 3. GWT step parsing accepts OpenSpec bold format

`- **WHEN** ...` lines were misreported as blocking missing-gwt.

### 4. tasks template upgrade

Per-task **Verification** (Run + Expected), **Sources** (`[Source: file#section]`), **Interfaces** (Produces/Consumes).

### 5. RENAMED in the delta template

### 6. Pre-archive strict gate (P1)

Blocking structure issues refuse the archive before any spec write; `--skip-strict` escape hatch.

### 7. baseline_commit capture (P1, BMAD)

First `apply` records git HEAD into `.state.yaml` (idempotent, never overwritten, skipped outside git) so reviews diff against pre-implementation state.

### 8. deferred-work ledger (P1, BMAD loop-sweep)

`verify --defer` / `--resolve`; deferred counts surface in every verify; archive warns about open items and carries the ledger.

### 9. RED-evidence gate (P2, superpowers)

Verify parses apply.log: TDD-phase tasks that reached GREEN without a recorded RED pass fail verification. Legacy-mode tasks are counted but not blocked.

### 10. 3-strikes escalation (P2, superpowers systematic-debugging)

Consecutive per-task failures tracked; from the third, a circuit-breaker tells the agent to stop patching (architecture problem) and writes escalation evidence.

### 11. Previous Change Intelligence (P2, BMAD)

Plan feeds still-open deferred items and recent rulings from the latest archived change back into new task lists.

### 12. Triage review protocol (P2, BMAD triage)

`roles review --triage`: findings stay untriaged (no auto-kill) with a worksheet — verdicts high/medium/low/false/maybe-false; buckets intent-gap / plan-defect / patch / defer.

### 13. AD-n stable decision IDs (P3, BMAD stable ID family)

Template + `validate --strict` checks (duplicate IDs blocking, Supersedes references validated, legacy format warned).

### 14. AD-n decision validation — see 13.

### 15. Ruling ledger (P3, superpowers "Rulings, not stalls")

`apply --ruling "decision — reason — cost-if-wrong"` persisted into rulings.md, carried through archive, fed back by plan. Closes memlog by mapping its role onto rulings.md / apply.log / progress.jsonl.

### 16. Retrospective verdict (P3, BMAD)

Archive summaries carry `Verdict: accepted | accepted-with-open-items | rejected` computed from evidence.

### 17. Engine-diverse review protocol (P3, BMAD)

Triage worksheets carry Implemented-by / Triaged-by with the different-engine rule; agent-protocol gains five cross-framework review disciplines.

### 18. DAG engine enhancement

Audit finding: graph-cache was never wired into graph run (and wrote to the package root, leaking across projects). Landed: progressive rigor (OpenSpec), node retry + delegation evidence (superpowers fix-loop), project-local checkpoint resume.

---

## Confirmed already-present (no change needed)

RED-phase enforcement in apply ("RED Phase Violation"), delegation plan on failure, fix packets, progress.jsonl checkpoint context, Spec Guardian leakage rules, Constitution waivers, HITL confirm gates.

---

## Explicitly not adopted, with reasons

- **git worktrees** (superpowers): executor-layer concern; STDD's `parallel` already does file-conflict detection
- **three-path ceremony scaling** (superpowers brainstorming): ff/turbo/standard flow are semantically equivalent
- **Stores cross-repo planning** (OpenSpec): out of scope for STDD's positioning
- **memlog engine** (BMAD): mapped onto three existing logs instead of a fourth engine

---

## Test evidence

delta-spec (25), archive-delta-merge (10 e2e), validate-strict (15), apply-baseline (3), apply-three-strikes (4), verify-red-evidence (4), plan-previous-intelligence (3), roles-triage (3), deferred-work (10), graph engine suites — all green with the existing suites untouched.
