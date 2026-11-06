# STDD Copilot — AI Agent Instructions (EN)

> Version: 2.4-en | Mirrors [docs/agent-protocol.md](../agent-protocol.md) (Chinese version is authoritative).

---

## Capability entries (80 = 80 command templates + 47 skill templates, deduplicated)

### Command template entries (80)
- `/stdd:init` `/stdd:new` `/stdd:propose` `/stdd:clarify` `/stdd:confirm`
- `/stdd:spec` `/stdd:plan` `/stdd:apply` `/stdd:execute` `/stdd:verify` `/stdd:archive`
- `/stdd:final-doc` `/stdd:brainstorm` `/stdd:issue` `/stdd:constitution`
- `/stdd:ff` `/stdd:continue` `/stdd:explore` `/stdd:graph` `/stdd:turbo`
- `/stdd:vision` `/stdd:supervisor` `/stdd:prp` `/stdd:parallel` `/stdd:mock`
- `/stdd:memory` `/stdd:iterate` `/stdd:help` `/stdd:factory` `/stdd:design`
- `/stdd:complexity` `/stdd:certainty` `/stdd:metrics`

---

## Dual-mode design: user interaction + agent orchestration

### Mode A: User-driven

**Trigger**: the user types an explicit `/stdd:` slash command.

**Behavior**: execute the named command immediately with no extra orchestration; report results; if project state doesn't match the command, suggest next steps without forcing them.

```
User: /stdd:apply
Agent: ✅ Executing TASK-003...
       💡 Tip: 2 tasks remain; after them, /stdd:verify
```

### Mode B: Agent-driven orchestration

**Trigger**: natural-language requirements (not a slash command), or explicit "auto-advance"/"continue".

**Behavior**: read the Skill Graph, plan a full path, advance phase by phase pausing only at confirmation gates, and report progress.

| Input | Mode | Behavior |
|---------|------|------|
| `/stdd:apply` | User-driven | Execute apply now |
| `/stdd:status` | User-driven | Show state, do not advance |
| "implement login" | Agent-driven | Plan and advance the full flow |
| "continue" / "next" | Agent-driven | Advance one phase |
| "auto-complete" | Agent-driven | Advance to the next confirmation gate |

Core rules: slash commands win; natural language triggers orchestration; the user can intervene at any time.

---

## Dual scenarios: greenfield + brownfield

### Scenario 1: Greenfield (from scratch)

Empty directory → `stdd init` → tech-stack interview (confirmation gate) → DESIGN.md → standard workflow:
`new → propose → clarify → confirm → spec → plan → apply → verify → archive`

The tech-stack interview decides project type, language, frontend/backend frameworks, test framework, package manager, design preset, and database — write them into `stdd/config.yaml`.

### Scenario 2: Brownfield (existing project)

Code exists but no `stdd/` → deep read → understanding report → user confirmation → init → standard workflow.

The agent must read package.json/README/directory structure/key entry files/existing tests, then produce an understanding report (stack, modules, coverage, risks) and wait at a confirmation gate before initializing.

---

## Frontend design: DESIGN.md

DESIGN.md is a plain-text design system the agent reads to generate consistent UI. Built-in presets: `modern` (blue SaaS), `dark` (developer tools), `minimal` (black-and-white content). `stdd design reverse` derives it from the project's REAL sources (Tailwind/CSS custom properties/component libraries, Source-annotated).

---

## Agent orchestration protocol

### Phase transitions (agent-driven; pause only at gates)

| Phase | Completion condition | Auto-advance to |
|-----------|---------|---------|
| `/stdd:init` | config.yaml + directories ready | wait for requirement → `/stdd:new` |
| `/stdd:new` | change dir + proposal.md | `/stdd:propose` |
| `/stdd:propose` | proposal filled | `/stdd:clarify` |
| `/stdd:clarify` | questions answered | `/stdd:confirm` ⚠️ user gate |
| `/stdd:confirm` | confirmed | `/stdd:spec` |
| `/stdd:spec` | BDD feature generated | `/stdd:plan` |
| `/stdd:plan` | tasks.md + design.md | `/stdd:apply` (per task) |
| `/stdd:apply` | current task green | next task or `/stdd:verify` |
| `/stdd:verify` | all checks pass | `/stdd:mutation` |
| `/stdd:mutation` | score ≥ threshold | `/stdd:archive` ⚠️ user gate |
| `/stdd:archive` | archived | wait for new requirements |

### Pause rules (Human-in-the-Loop — the unified interruption-budget model)

**Only three pause classes** (stage-triggered pauses are retired; every pause is risk-triggered):

1. **Gate pending-human** — ask the user when `stdd confirm` returns pending-human (insufficient certainty / irreversible signal)
2. **Circuit-breaker** — 3 consecutive failures on one task: present the evidence chain and ask for a decision
3. **Irreversible actions** — data deletion, destructive migrations — regardless of confidence

Everything else (phase boundaries, cycle ends, constitution warnings) does **not** pause.

**Interruption budget**: every real human pause counts against `interruption.budget` (default 3) in `.state.yaml`. Exceeding it warns to split the change or tighten thresholds; it never blocks a genuinely human decision. On seeing the warning, suggest splitting rather than burning more budget.

---

## Review & adjudication protocol (cross-framework discipline)

1. **Engine diversity (BMAD)**: triage must run on a different engine than the implementation. The triage worksheet carries Implemented-by / Triaged-by; they must differ.
2. **Triage, not auto-kill (BMAD triage)**: verify each finding against code before a verdict (high/medium/low/false/maybe-false); route to intent-gap / plan-defect / patch / defer (`stdd verify <change> --defer` records into the ledger).
3. **RED evidence (superpowers)**: any GREEN claim must trace to an observed RED. `stdd verify` checks automatically.
4. **3-strikes (superpowers)**: three consecutive failures on one task is an architecture problem — stop patching, re-plan, or delegate with the escalation evidence.
5. **Ruling persistence (superpowers)**: record execution decisions via `stdd apply <change> --ruling "decision — reason — cost-if-wrong"` into rulings.md; they persist through archive and feed later plans.

---

## Skill Graph path selection

- **New feature** (default): `init → new → propose → clarify → confirm → spec → plan → apply → verify → archive`
- **Brownfield**: explore → understanding report → user confirmation → init → standard flow
- **Quick fix** ("fix X bug"): `init → issue → apply → verify → archive`
- **One-shot artifacts** ("quickly build X"): `turbo` (generates proposal+spec; implementation is the apply-stage AI executor's job)
- **Exploration** ("analyze X feasibility"): `explore → brainstorm → final-doc`

---

## Context awareness

Before any action, read the current state:

```bash
stdd status          # all changes
stdd status <name>   # one change
cat stdd/changes/<name>/tasks.md
```

When unsure of the next step: `stdd recommend` or `stdd graph recommend`.

---

## Error recovery

```
1 failure → analyze and retry with an adjusted strategy
2 failures → read the fix packet, try a degraded strategy
3 failures → 🔴 circuit-breaker: report the full evidence chain to the user
```

Fix packets: `stdd fix-packet <change>`, then read `stdd/changes/<change>/evidence/fix-packet-*.md`.

---

## On-demand helpers

| Situation | Auto-invoke |
|------|---------|
| After code completes | `/stdd:guard` |
| Before verification | `/stdd:mutation` |
| API requirements | `/stdd:api-spec` |
| Type requirements | `/stdd:schema` |
| Mocks needed | `/stdd:mock` |
| Test data | `/stdd:factory` |
| Before archive | `/stdd:constitution check` |
| Every ~5 tasks | `/stdd:metrics` |

---

## Frontend & visualization (v1.2)

`/stdd:design` (incl. `reverse`) · `/stdd:browser` (incl. the `baseline/diff` visual gate) · CLI: `stdd ui generate/page` · `stdd dashboard`

---

## Capability checklist (agent-invocable)

Core: init/new/propose/clarify/confirm/spec/plan/apply/execute/verify/archive
Workflow: ff/continue/explore/turbo/brainstorm/issue
SDD: api-spec/schema/contract/validate
TDD: outside-in/mutation/mock/factory
Gates: guard/constitution/hooks
Graph: graph
Collaboration & docs: commit/final-doc/design/prp/supervisor/context/iterate/memory/parallel/roles/product-proposal
Assessment & learning: metrics/learn/certainty/complexity/vision
Ops: user-test/ci/browser/depcheck/doctor
Misc: help/status/list/recommend/skills/commands/workspace/extensions/story/pipeline/baby-steps/starters/tdd-init/fix-packet/update/audit/runtime
