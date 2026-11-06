# Model-Strength Adaptation

> Full English edition of [docs/model-strength-adaptation.md](../model-strength-adaptation.md).

## Core judgment

Stronger base models change the cost/benefit of constraints but do not remove the reason they exist:

- **Intent alignment is not a capability problem** — even a perfect model doesn't know what the human wants; spec-driven development survives model strength.
- **Verification asymmetry is eternal** — strong models hallucinate confidently; evidence gates (RED evidence, mutation, conflict aborts) grow MORE valuable.
- **Weak-model compensation backfires** — hardcoded micro-task caps, ceremonial clarification, role simulation, and stage-triggered pauses become token/interruption taxes.

Repositioning: from "behavior correction for weak models" to **trust boundary management for strong models**. Four principles: evidence-based (not ceremony), risk-triggered (not stage-triggered), scale-proportional, freedom-by-default.

## Constraint taxonomy

| Class | Verdict | STDD mechanisms |
|---|---|---|
| **Does not decay** | keep | spec/delta source of truth, scope contracts, audit artifacts (rulings/deferred/baseline), evidence chains |
| **Grows in value** | strengthen | RED-evidence gate, mutation, delta conflict aborts, risk-triggered pauses |
| **Decays** | budget/demote | micro-task caps (→ scale function), 78-method clarify (→ optional toolbox), role simulation / SudoLang (→ legacy labels), stage-triggered confirm (→ risk-triggered) |

## The acceptance test

Every retained constraint must answer: **"strong model + without this constraint" — where would it fail?** If there is no answer, it is overhead.

## What landed (P0–P2)

1. **Adaptive task budget** — the hardcoded 6-task cap became a scale function (base 4; +1/+2 by scope items; +1 for 600+ word proposals; +1 for multiple cross-cutting risk signals; clamped [3,10]); `planning.max_tasks` overrides; Epic-split hint instead of silent truncation.
2. **Risk-triggered confirm** — auto-approve at certainty ≥ auto threshold with no irreversible signal (decision persisted); otherwise pending-human with exact reasons; `--skip` is the explicit human override.
3. **Change-level rigor** — ff/issue/turbo record a level in `.state.yaml` (irreversible wording escalates to strict); verify/archive honor it; explicit flags always win.
4. **Conversational clarify** — core questions + signal-selected probes (a signal hit replaces the probe); `--exhaustive` restores the checklist.
5. **Interruption budget** — real human pauses count per change; exceeding warns to restructure, never blocks a human decision.
6. **Legacy labels + config honesty** — simulation capabilities marked legacy (optional); unwired config keys marked deprecated.

## Latent bugs found along the way (constraint-layer rot)

1. `stdd confirm` crashed everywhere (unescaped regex)
2. clarify dropped its entire commander options object (positional signature bug)
3. graph-cache never wired (and wrote to the package root)
4. certainty/hitl checkpoint config had zero consumers (declarative theater)
5. certainty thresholds lived at the wrong YAML nesting (never read)
6. the planning section kidnapped defense keys (YAML structure corruption)

Lesson: every constraint needs (a) end-to-end tests, (b) real smoke runs, (c) consumer audits — or it rots silently.

## Later rounds

Engine finishing (node timeout, transient-content retry classification, history wiring, precise parallel attribution — throwOnFailure), the frontend five (design reverse / visual regression with zero-dependency PNG pixel thresholds / runnable test scaffolds / ui generate / dashboard), template sync completion, Docker end-to-end verification. Remaining backlog: node-level timeout ✅ … all settled; frontend-adjacent growth is a separate initiative.
