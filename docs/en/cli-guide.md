# CLI Guide

stdd init
stdd init /path/to/project
stdd init --force
stdd list
stdd list --specs
stdd list --archived
stdd list --json
stdd status
stdd status add-dark-mode
stdd new change add-dark-mode
stdd skills
stdd commands
stdd fix-packet add-dark-mode
stdd outside-in init
stdd outside-in scaffold add-dark-mode
stdd constitution
stdd constitution show 2
stdd constitution check
stdd hooks install
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable
stdd doctor
stdd doctor --deep
stdd apply <name> --allow-no-tests

## TDD Gap Enhancements

- `stdd fix-packet [change]` — Golden Packet style AI handoff context for failed tests
- `stdd outside-in init/scaffold/status` — Layer registry for outside-in TDD

## Risk-Scoped Gates and Ledgers (v1.1)

- `stdd ff/issue/turbo <desc> --rigor light|standard|strict` — change-level rigor, auto-escalating to strict on irreversible signals (migrate/drop table/payment/breaking change/public API)
- `stdd validate <change> --strict` — OpenSpec-style delta structure checks
- `stdd verify <change> --defer "<finding>"` / `--resolve <n>` — deferred-work ledger; `--no-lint` escapes a strict change's lint default
- `stdd apply <change> --ruling "<decision> — <reason> — <cost if wrong>"` — ruling ledger
- `stdd archive <change> [--skip-strict]` — pre-archive structure gate
- `stdd roles review <target> --triage` — verdict worksheet (high/medium/low/false/maybe-false; buckets intent-gap/plan-defect/patch/defer)
- `stdd graph run --rigor <level> --retry <n> [--no-cache] [--sequential]` — progressive rigor, read-only-node retries, checkpoint resume, layered parallel execution
- `stdd/graph/intents.yaml` — project-defined intent pathways (`intents.<name>.path: [node chain]`)
- `stdd confirm <change>` with `hitl.mode: risk-triggered` — certainty + irreversible-signal auto-approval; `--skip` is the explicit human override

## Documentation
- [English Docs Index](README.md) — English documentation hub
- [Getting Started](getting-started.md) — First-run workflow and quick CLI reference
- [Project README](../../README_EN.md) — Project overview and top-level examples
