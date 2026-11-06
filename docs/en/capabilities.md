# STDD Copilot Capability Boundaries

> This document separates what the tool does by itself from what requires an external AI executor.

## Core Design Principle

STDD Copilot is a **CLI tool + template framework**. It provides no AI coding ability of its own — it sets the "traffic rules" for your AI coding assistant (Claude Code, Cursor, Copilot, etc.).

---

## ✅ Capabilities implemented in the tool itself

### CLI commands (directly usable)

| Command | Purpose | Status |
|------|------|------|
| `stdd init` | Initialize project structure | ✅ Fully implemented |
| `stdd new <name>` | Create change directory and files | ✅ Fully implemented |
| `stdd apply <name> [--phase red\|green\|refactor] [--allow-no-tests]` | Run tests and update task state | ✅ Fully implemented |
| `stdd verify <name>` | Verify a change (tests + Constitution) | ✅ Fully implemented |
| `stdd archive <name>` | Archive change + delta-spec merge | ✅ Fully implemented |
| `stdd list` | List all changes | ✅ Fully implemented |
| `stdd status [name]` | Show change status | ✅ Fully implemented |
| `stdd doctor [--deep]` | Health check / deep diagnostics | ✅ Fully implemented |
| `stdd guard` | Quality gate checks | ✅ Fully implemented |
| `stdd constitution` | View/check development articles | ✅ Fully implemented |
| `stdd mutation <name>` | Quick heuristic mutation testing | ✅ Partially implemented |
| `stdd workspace` | Workspace management | ✅ Fully implemented |
| `stdd metrics` | Quality metrics | ✅ Fully implemented |
| `stdd graph run` | Graph engine execution | ⚠️ Needs an external executor |
| CommandLoader mode | Unified registration/discovery/loading of commands | ✅ Fully implemented |

### Constitution checks (9 articles)

| Article | Name | Checks | Status |
|---------|------|---------|------|
| 1 | Library-First | unused deps, wheel reinvention | ✅ |
| 2 | TDD | test file existence, anti-patterns, phase compliance | ✅ |
| 3 | Small Commits | git history checks | ✅ |
| 4 | Code Style | ESLint integration, file length | ✅ |
| 5 | Documentation | JSDoc checks | ✅ |
| 6 | Error Handling | empty catch detection | ✅ |
| 7 | Security | hardcoded secrets, SQL injection | ✅ |
| 8 | Performance | useEffect deps, N+1 queries | ✅ |
| 9 | CI/CD | CI config detection | ✅ |

### Test execution

- ✅ Auto-detect test command (package.json, stdd/config.yaml)
- ✅ Multi-workspace tests
- ✅ Test reporter injection (Jest, Vitest, pytest, etc.)
- ✅ TDD phase enforcement (RED → GREEN → REFACTOR)

### Evidence system

- ✅ Structured evidence capture
- ✅ Audit trails
- ✅ Shell-executor audit log (`stdd/logs/shell-executor-audit.jsonl`)
- ✅ Fix Packet generation

### Workspace / Monorepo

- ✅ Auto-detect npm/pnpm workspaces
- ✅ `--workspace` scoping
- ✅ Workspace registry management

---

## ⚠️ Capabilities requiring an external AI executor

### Claude Code slash commands (`/stdd:*`)

These are **markdown templates** used inside an AI session; the assistant executes them:

| Command | Purpose | Depends on |
|------|------|------|
| `/stdd:propose` | Draft a requirement proposal | 🤖 AI-generated content |
| `/stdd:clarify` | Requirement clarification | 🤖 AI-generated content |
| `/stdd:confirm` | Confirmation gate | 🤖 AI-generated content |
| `/stdd:spec` | Generate BDD specs | 🤖 AI-generated content |
| `/stdd:plan` | Task breakdown + ADR | 🤖 AI-generated content |
| `/stdd:execute` | Ralph Loop TDD execution | 🤖 AI coding |
| `/stdd:ff` | Fast-forward generation | 🤖 AI-generated content |
| `/stdd:continue` | Continue producing artifacts | 🤖 AI-generated content |
| `/stdd:turbo` | One-shot full flow | 🤖 AI coding |

### Graph engine

| Capability | Status |
|------|------|
| DAG compilation | ✅ Tool |
| Topological ordering | ✅ Tool |
| Node execution | ⚠️ External executor |
| Self-healing engine | ⚠️ Framework present, needs an executor |

### Mutation testing

| Mode | Status |
|------|------|
| Quick (heuristic) | ✅ Tool |
| Deep (Stryker) | ⚠️ Requires the project to install Stryker |

### Agent runtime

| Capability | Status |
|------|------|
| Role definitions | ✅ Templates exist |
| Party Mode | ✅ Simple state machine |
| Multi-agent collaboration | ❌ Not implemented |

---

## 📋 Capability summary

### What the tool can do

1. **Manage spec files**: create, organize, version
2. **Execute tests**: run, update state, collect evidence
3. **Enforce the TDD flow**: RED → GREEN → REFACTOR phase control
4. **Quality gates**: 9 Constitution articles
5. **Evidence collection**: structured evidence, audit trails
6. **Workspace management**: Monorepo support

### What the tool cannot do

1. **AI coding**: cannot write code by itself
2. **Requirement analysis**: cannot analyze requirements by itself
3. **Spec generation**: cannot generate spec documents by itself
4. **Task breakdown**: cannot decompose tasks by itself

### AI tools it pairs with

- **Claude Code**: the primary supported assistant
- **Cursor**: supported IDE
- **GitHub Copilot**: supported IDE
- **Others**: adaptable via templates

---

## 🔧 Typical workflows

### Scenario 1: clear requirements

```bash
# 1. Initialize (tool)
stdd init

# 2. Create a change (tool)
stdd new add-login

# 3. Generate spec and tasks (AI — /stdd:ff in the AI session)

# 4. Execute TDD tasks (tool + human)
stdd apply add-login --phase red      # write the failing test (human)
stdd apply add-login --phase green    # implement (human/AI)
stdd apply add-login --phase refactor # refactor (human/AI)

# 5. Verify (tool)
stdd verify add-login

# 6. Archive (tool)
stdd archive add-login
```

### Scenario 2: fuzzy requirements

```bash
stdd init
stdd new auth-flow
# 3. Clarify (AI — /stdd:clarify)
# 4. Generate spec (AI — /stdd:spec)
# 5. Continue as scenario 1
```

---

## Frontend capabilities (v1.2, the frontend five)

- `stdd design reverse` — DESIGN.md reverse-engineered from Tailwind config / CSS custom properties / component-library deps (text-parsed, never executes user code; Source annotations)
- `stdd browser baseline/diff <url> --name <n>` — visual regression gate: strict hash or `--threshold <ratio>` pixel-drift tolerance (zero-dependency PNG decode); `--allow-changed` accepts and re-baselines
- `stdd outside-in scaffold <change> --code rtl|playwright|storybook|all` — runnable, BDD-scenario-driven test skeletons (RTL with an a11y/axe hook)
- `stdd ui generate|page <Name> --framework react|vue|html` — DESIGN.md-token-driven scaffolds plus a companion RTL test
- `stdd dashboard generate|serve` — zero-dependency single-file HTML dashboard (changes/rigor/tasks/verify/deferred/rulings/interruptions)

---

## 📚 Related documentation

- [README](../../README_EN.md) — project introduction
- [USAGE](../../USAGE.md) — full usage guide (zh)
- [ARCHITECTURE](../../ARCHITECTURE.md) — system architecture
- [Agent protocol](agent-protocol.md) — AI agent behavior protocol
