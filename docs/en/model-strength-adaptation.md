# Model-Strength Adaptation (EN summary)

> Condensed English edition. The authoritative full version is [docs/model-strength-adaptation.md](../model-strength-adaptation.md).

## Core judgment

Stronger base models change the cost/benefit of constraints but do not remove the reason they exist:

- **Intent alignment is not a capability problem** — spec-driven development survives model strength (OpenSpec's growth is the evidence).
- **Verification asymmetry is eternal** — strong models hallucinate confidently; evidence gates (RED evidence, mutation, conflict abort) grow MORE valuable.
- **Weak-model compensation backfires** — hardcoded micro-task caps, ceremonial clarification, role simulation, stage-triggered pauses become token/interruption taxes.

Repositioning: from "behavior correction for weak models" to **trust boundary management for strong models**. Four principles: evidence-based (not ceremony), risk-triggered (not stage-triggered), scale-proportional, freedom-by-default.

## What landed (P0–P2)

1. **Adaptive task budget** (plan) — scale function replaces the hardcoded 6-task cap; `planning.max_tasks` overrides; Epic-split hint instead of silent truncation.
2. **Risk-triggered confirm** — auto-approves at certainty ≥ auto threshold with no irreversible signal (decision persisted); otherwise `pending-human` with exact reasons; `--skip` is the explicit human override.
3. **Change-level rigor** — ff/issue/turbo record a level in `.state.yaml` (irreversible signals escalate to strict); verify/archive honor it; explicit flags always win.
4. **Conversational clarify** — core questions + signal-selected probes instead of a 20-question dump; `--exhaustive` restores the checklist.
5. **Interruption budget** — real human pauses are counted per change (`interruption.budget`); exceeding warns to restructure, never blocks a human decision.
6. **Legacy labels + config honesty** — simulation capabilities marked legacy (optional); unwired config keys marked deprecated.

## Latent bugs found along the way (constraint-layer rot)

confirm's unescaped regex crash, clarify dropping its entire options object, graph-cache never wired (and writing to the package root), certainty thresholds at the wrong nesting, the planning section kidnapping defense keys — all fixed. Lesson: every constraint needs (a) end-to-end tests, (b) real smoke runs, (c) consumer audits, or it rots silently.

## Remaining backlog

Node-level timeout ✅, transient-content retry classification ✅, history wiring ✅, precise parallel attribution ✅ (v1.1.2). Frontend items (dashboard, visual regression, UI generation) remain a separate initiative — see [known-gaps.md](../known-gaps.md).
