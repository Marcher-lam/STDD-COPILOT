# Comprehensive Framework Comparison: 12 Reference Frameworks vs STDD Copilot

> Generated: 2026-04-02 | STDD Copilot v1.0
> Purpose: Identify unique/advanced features in 12 reference frameworks that STDD does NOT yet have

---

## Executive Summary

STDD Copilot already has 38 skills, 12 agents, graph engine, constitution (9 articles), hooks, certainty protocol, and many other features. This report identifies **83 unique features** across 12 frameworks that STDD does NOT currently implement. Features are organized by category with priority ratings.

---

## 1. SpecKit (github/spec-kit)

**Source:** [github.com/github/spec-kit](https://github.com/github/spec-kit)

### Unique Features NOT in STDD

#### MULTI-AGENT VENDOR SUPPORT (HIGH priority)
- **23+ AI agent integrations**: Supports Claude Code, Gemini CLI, GitHub Copilot, Cursor, Qwen Code, opencode, Codex CLI, Windsurf, Junie, Kilo Code, Auggie CLI, Roo Code, CodeBuddy CLI, Qoder CLI, Kiro CLI, Amp, SHAI, Tabnine CLI, Kimi Code, Pi, iFlow, IBM Bob, Trae, and a generic "bring your own agent" option. STDD is Claude-only.
- **AGENTS.md standard format**: A single interop format (`AGENTS.md`) that any agent can read, enabling multi-vendor team workflows.
- **Agent-specific config generation**: Automatically generates the correct directory structure, command format (Markdown vs TOML), and argument conventions per agent.

#### EXTENSION MARKETPLACE (HIGH priority)
- **Extension system with catalog.json**: Community extensions can be published and installed, with `catalog.community.json` for third-party extensions.
- **RFC-EXTENSION-SYSTEM.md**: Formal extension API, development guide, and publishing guide.
- **Extension self-test**: Built-in `selftest` extension for validating the extension system itself.

#### PRESET SYSTEM (MEDIUM priority)
- **Community preset catalog** (`catalog.community.json`): Shared team configurations.
- **Scaffold preset**: Project scaffolding via presets.
- **Self-test preset**: Built-in testing preset for validation.

#### PROJECT SCAFFOLDING CLI (MEDIUM priority)
- **Specify CLI (Python-based)**: `speckit init --ai <agent>` bootstraps full project with correct agent configs.
- **Cross-platform shell scripts**: Both Bash and PowerShell scripts for check-prerequisites, create-new-feature, setup-plan, update-agent-context.
- **DevContainer support**: Pre-configured devcontainers with AI agent CLI tools installed.

#### BRANCH NUMBERING (LOW priority)
- **Timestamp-based branch numbering**: Automated branch naming with timestamps for traceability.

---

## 2. OpenSpec (Fission-AI)

**Source:** [github.com/Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)

### Unique Features NOT in STDD

#### DELTA SPEC SYSTEM (HIGH priority)
- **Delta specs with semantic markers**: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements` -- specs describe ONLY what's changing, not the whole system.
- **Spec merge on archive**: When a change is archived, its delta specs automatically merge into the main specs, building a living source of truth.
- **Conflict-free parallel changes**: Two changes can touch the same spec file without conflict as long as they modify different requirements.
- **Brownfield-first philosophy**: Designed for modifying existing systems, not just greenfield projects.

#### ARTIFACT DAG (HIGH priority)
- **Schema-based artifact dependency graph**: A `schema.yaml` defines artifact types and their dependencies (e.g., proposal -> specs -> design -> tasks), forming a DAG.
- **Dependencies as enablers, not gates**: They show what's possible to create next, not what you must create. You can skip artifacts.
- **Custom schemas**: Teams can create custom workflow schemas or fork existing ones (`openspec schema fork spec-driven my-workflow`).

#### CHANGE ISOLATION (MEDIUM priority)
- **Change folders**: Each proposed modification is a self-contained folder with all artifacts (proposal, design, tasks, delta specs).
- **Parallel changes**: Multiple changes can exist simultaneously without conflict, enabling context-switching.
- **Change metadata**: `.openspec.yaml` per change for configuration.

#### 3D VERIFICATION (MEDIUM priority)
- **Completeness, Correctness, Coherence verification**: `/opsx:verify` checks implementation across three dimensions: (1) all tasks done, requirements covered; (2) implementation matches spec intent; (3) design decisions reflected in code.
- **Bulk-archive with conflict detection**: Detects when multiple changes touch the same specs and resolves by checking what's actually implemented.

#### CONFIGURATION SYSTEM (MEDIUM priority)
- **Dynamic instructions**: Three-layer AI instruction injection: Context (tech stack) + Rules (per-artifact constraints) + Templates (formatting patterns).
- **Profile sync drift detection**: Warns when local profile is out of sync with shared config.
- **Global config + project config**: User-level schemas at `~/.local/share/openspec/schemas/` shared across projects.

---

## 3. BMAD-METHOD (bmad-code-org)

**Source:** [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)

### Unique Features NOT in STDD

#### ADVERSARIAL REVIEW (HIGH priority)
- **Forced problem-finding reviews**: No "looks good" allowed. Reviewer MUST find issues. Zero findings triggers a halt and re-analysis.
- **Information asymmetry**: Reviews run with fresh context (no access to original reasoning) so the artifact itself is evaluated, not the intent.
- **Diminishing returns tracking**: Multiple passes with awareness that each pass yields less signal.

#### ADVANCED ELICITATION (HIGH priority)
- **60+ structured reasoning methods**: Pre-mortem Analysis, First Principles Thinking, Inversion, Red Team vs Blue Team, Socratic Questioning, Constraint Removal, Stakeholder Mapping, Analogical Reasoning, and dozens more.
- **Method selection**: AI suggests 5 relevant methods for your content; you pick one or reshuffle for different options.
- **Second-pass pattern**: After generating content, run a structured reasoning method to re-examine through a specific lens.

#### PARTY MODE (HIGH priority)
- **Multi-agent debate in one conversation**: All named agents (PM, Architect, Dev, UX, etc.) in one room, responding in character, agreeing, disagreeing, building on each other's ideas.
- **BMad Master orchestrator**: Picks relevant agents per message automatically.
- **Use cases**: Big decisions with tradeoffs, brainstorming, post-mortems, sprint retrospectives.

#### QUICK DEV MODE (HIGH priority)
- **Intelligent routing**: Automatically decides whether a change is one-shot (go straight to implementation) or needs the full planning path.
- **Compressed intent**: Turns messy requests into one coherent goal before running autonomously.
- **Failure layer diagnosis**: If implementation is wrong because intent was wrong, goes back to intent layer rather than patching code.
- **Review as triage**: Separates findings into "belongs to current change" vs "deferred for later" to prevent scope creep.

#### NAMED AGENTS WITH PERSONALITY (MEDIUM priority)
- **Persona-based agents**: Mary (Analyst), John (PM), Winston (Architect), Bob (Scrum Master), Amelia (Developer), Quinn (QA), Barry (Solo Dev), Sally (UX Designer), Paige (Tech Writer).
- **Trigger codes**: Short codes (CP, RS, CB, etc.) for quick invocation.
- **Conversational triggers**: Some triggers accept arguments alongside the code (e.g., "WD Write a deployment guide").

#### MODULE ECOSYSTEM (MEDIUM priority)
- **BMad Builder**: Create custom agents and workflows (BMB module).
- **Test Architect (TEA)**: Risk-based test strategy enterprise module.
- **Game Dev Studio**: Unity, Unreal, Godot workflows.
- **Creative Intelligence Suite**: Innovation, brainstorming, design thinking module.
- **Non-interactive/CI installation**: `npx bmad-method install --yes` for CI/CD pipelines.

#### DOCUMENT SHARDING (LOW priority)
- **bmad-shard-doc**: Split large documents for token optimization, maintaining coherence across shards.

---

## 4. AIDD (paralleldrive)

**Source:** [github.com/paralleldrive/aidd](https://github.com/paralleldrive/aidd)

### Unique Features NOT in STDD

#### SUDOLANG PROMPT LANGUAGE (HIGH priority)
- **Typed pseudocode for AI orchestration**: SudoLang is a pseudocode language with clear structure, strong typing, and explicit control flow designed specifically for prompting LLMs.
- **20-30% fewer tokens**: Structured pseudocode reduces prompt token cost vs natural language.
- **Declarative, constraint-based, interface-oriented**: Programs that build programs (metaprograms).

#### PRODUCT DISCOVERY WORKFLOW (HIGH priority)
- **Story mapping**: `/discover` creates user story maps saved as YAML journey files in `plan/story-map/`.
- **Persona-based journeys**: Journey files define personas and user journeys for systematic feature discovery.
- **Progressive discovery principle**: AI agents only read folders relevant to the current task, avoiding context bloat.

#### DUAL USER TESTING (HIGH priority)
- **Human test scripts**: Think-aloud protocol with video recording for manual testing.
- **AI agent test scripts**: Executable tests with screenshots and persona-based behavior, generated from journey YAML files.
- **Nielsen Norman Group integration**: References research that 3-5 users reveal 65-85% of usability problems.

#### VISION DOCUMENT CONFLICT RESOLUTION (MEDIUM priority)
- **Automatic conflict detection**: When a task conflicts with vision.md, the agent stops and offers options: (1) proceed anyway, (2) suggest alternative, (3) skip task.
- **Vision-first reading**: Agents read vision.md before every task to check alignment.

#### COMPOSABLE SERVER FRAMEWORK (LOW priority)
- **asyncPipe patterns**: Function composition instead of middleware chains.
- **Auth middleware**: Built-in better-auth integration with passkey support.

---

## 5. TDD Guard (nizos)

**Source:** [github.com/nizos/tdd-guard](https://github.com/nizos/tdd-guard)

### Unique Features NOT in STDD

#### MULTI-LANGUAGE TEST REPORTERS (HIGH priority)
- **Language-specific test reporters**: Dedicated reporter packages for 6 languages:
  - JavaScript/TypeScript: Vitest (`tdd-guard-vitest`) and Jest (`tdd-guard-jest`)
  - Python: pytest (`tdd-guard-pytest`)
  - PHP: PHPUnit (`tdd-guard/phpunit`)
  - Go: `tdd-guard-go`
  - Rust: `tdd-guard-rust` (with cargo-nextest support)
- **Reporter captures test results to JSON**: Test output is captured and fed back to the validation engine.

#### AI MODEL VALIDATION (MEDIUM priority)
- **Flexible validation model**: Choose faster models for speed or more capable models for accuracy.
- **LLM-powered TDD compliance checking**: Uses AI to validate whether code changes follow TDD principles, not just regex rules.

#### SESSION CONTROL (MEDIUM priority)
- **Toggle on/off mid-session**: Enable/disable TDD enforcement without restarting.
- **Session-aware state**: Maintains TDD state across session lifecycle (startup, resume, clear).
- **Three-hook architecture**: PreToolUse + UserPromptSubmit + SessionStart hooks combined.

#### LINT INTEGRATION FOR REFACTORING (MEDIUM priority)
- **Automated refactoring enforcement**: Uses your existing linting rules to enforce refactoring during the refactor phase.
- **Anti-bypass mechanisms**: Prevents agents from circumventing validation via shell commands or MCP operations.

#### DISTRIBUTION (LOW priority)
- **Homebrew + npm**: Dual distribution via `brew install tdd-guard` and `npm install -g tdd-guard`.
- **Plugin-based installation**: `/tdd-guard:setup` auto-detects test framework and configures reporters.

---

## 6. Claude Pilot (changoo89)

**Source:** [github.com/changoo89/claude-pilot](https://github.com/changoo89/claude-pilot)

### Unique Features NOT in STDD

#### GPT CODEX DELEGATION (HIGH priority)
- **Cross-model delegation**: After 2 consecutive failures in Claude, automatically delegates to GPT Codex for a fresh perspective.
- **Semantic expert mapping**: Architecture -> Architect agent, Security -> Security Analyst, Large plans -> Plan Reviewer, Coder block -> Agent, Uncertainty -> Self-Assessment.
 Delegation triggers:
  - Explicit: "ask GPT"
  - Semantic: Architecture decisions, security issues, ambiguity
  - Automatic: After 2nd failure
  - Self-Assessment: Confidence scoring < 0.7 triggers delegation
- **CODEX_REASONING_EFFORT config**: Control delegation depth.

 Similar to STDD certainty but but for cross-model delegation.

#### PERSISTENT PLAN STATE (MEDIUM priority)
- **`.pilot/` directory**: Plan state saved persistently across sessions, similar to `.claude/` but for workflow state.
- **Auto-sync documentation**: Documentation stays in sync with code changes automatically during implementation.

#### PRE-COMMIT VALIDATION (MEDIUM priority)
- **JSON validation hook**: Pre-commit hook validates JSON files before committing.
- **Pre-commit spec-to-code check**: Validates that code changes align with specs before allowing commit.

#### E2E VERIFICATION BUILT-IN (MEDIUM priority)
- **Chrome/browser integration**: Built-in E2E verification using Chrome browser testing during the Ralph Loop.
- **5-step Ralph Loop**: RED -> VERIFY (E2E) -> GREEN -> MUTATE REVIEW -> PASS.

 This differs from STDD's 5-step by adding E2E as a dedicated phase.

 Similar to STDD's outside-in but integrated directly into the loop.

 Similar concept exists in STDD outside-in skill but Claude Pilot integrates it natively.

 Similar pattern but Claude Pilot makes it a core loop phase.

 Novel vs STDD's separate outside-in skill.

 Similar to STDD execute skill. Novel additions: cross-model delegation, E2E as loop phase.

 Similar concept to STDD certainty. Novel: configurable thresholds.

 Similar to STDD commit. Novel: persistent plan state.

 Similar to STDD parallel. Novel: cross-model delegation.

 Similar to STDD final-doc. Novel: auto-sync docs.

 Similar to STDD guard. Novel: pre-commit JSON validation. Similar concept exists in STDD but more specific to JSON.

 Similar to STDD roles. Smaller scale (12 vs STDD's configurable). Similar to STDD context. Novel: explicit 3-tier doc hierarchy. Similar to STDD graph. Novel: persistent `.pilot/` state. Similar to STDD commit. Novel: commit message conventions.

 Similar concept exists but specific prefix format is novel. Similar concept exists across several frameworks but specific naming conventions differ.

 Similar concept of STDD prp. Novel: PRP structured prompts. Similar to STDD brainstorm. Novel: three explicit modes. Similar to STDD issue. Novel: issue resolution mode. Similar to STDD guard hooks. Novel: session start/resume hooks. Similar to STDD guard. Novel: enforcement prevention mechanisms.

 Similar concept but STDD has a novel architecture: explicit anti-bypass measures.

#### Additional Features Found in Claude Pilot
Note: Many Claude Pilot features overlap significantly with existing STDD skills. The truly unique additions are:
- **Cross-model (跨AI) delegation**: After 2 failures, delegates to GPT Codex for fresh perspective. STDD has no cross-model delegation.
- **`CODEX_REASONING_EFFORT` environment variable**: Configurable delegation reasoning depth.

---

## 7. Spec-First TDD (donnieprakoso)

**Source:** [github.com/donnieprakoso/spec-first-tdd](https://github.com/donnieprakoso/spec-first-tdd)

### Unique Features NOT in STDD

#### ATOMIC USE CASES ("BEADS") (HIGH priority)
- **Tiny digestible units**: Instead of monolithic spec documents, work in "beads" of functionality -- one small use case at a time.
- **Single-file workflow**: Everything lives in three files: `00-sftdd-workflow.md` (system prompt), `00-use-case.md` (tracker), `00-issues.md` (bug tracker).

#### ENHANCEMENT PHASE (MEDIUM priority)
- **4-step TDD**: RED -> GREEN -> ENHANCEMENT -> REFACTOR. The Enhancement phase sits between Green and Refactor, specifically for AI-suggested edge cases.
 This is NOT the same as STDD's 5-step loop which goes RED -> CHECK -> GREEN -> MUTATION -> REFACTOR. STDD has no dedicated edge-case suggestion phase.

#### EVOLUTIONARY SPECS (MEDIUM priority)
- **Specs tighten through building**: The spec becomes airtight BECAUSE you built it, not before you started. Specs evolve as you discover edge cases during implementation.

#### THREE-MODE TEMPLATE (MEDIUM priority)
- **Feature Development mode**: Standard use case -> TDD flow.
- **Issue Resolution mode**: Bug triage and fix with TDD.
- **Brainstorming mode**: "Don't change anything yet" -- pure analysis and proposals, no code changes.

#### EVOLUTIONARY SPECS PHILOSOPHY (LOW priority)
- **"Take the power back"**: Explicitly positions the human as pilot, not the AI. Emphasizes human agency in AI-assisted development.

---

## 8. ATDD (swingerman)

**Source:** [github.com/swingerman/atdd](https://github.com/swingerman/atdd)

### Unique Features NOT in STDD

#### SPEC GUARDIAN AGENT (HIGH priority)
- **Implementation leakage detection**: Dedicated agent that catches class names, API endpoints, database tables, and other implementation details leaking into Given/When/Then specs.
- **Domain language enforcement**: Automatically proposes domain-language rewrites for specs that contain technical implementation terms.

#### PIPELINE BUILDER AGENT (HIGH priority)
- **Generated test pipeline**: Analyzes your codebase and generates a bespoke parser -> IR (Intermediate Representation) -> test generator for your project.
- **Language/framework-agnostic**: Works for any language and test framework by analyzing your actual project structure.

#### CUSTOM MUTATION TESTING TOOL (HIGH priority)
- **3-module architecture**: mutations ( rules + matching), runner(test execution), core(orchestration).
- **AST/source tree walking**: Language-agnostic mutation by walking the AST.
- **TDD-built mutation tool**: The mutation tool itself is built using TDD discipline.
- **Targeted execution**: Run only the tests affected by each mutation (not all tests).
- **Uncle Bob's empire-2025 reference**: Directly inspired by Robert C. Martin's empire-2025 approach to mutation testing.

#### TEAM WORKFLOW WITH PHASE GATES (MEDIUM priority)
- **5-phase team workflow**: (1) Spec Writing -> (2) Spec Review -> (3) Pipeline Generation -> (4) Implementation (TDD) -> (5) Post-Implementation Review.
- **Phase gates**: Explicit approval between each phase before proceeding.
- **Team extension**: If you already have an active agent team, ATDD detects it and offers to extend with ATDD roles rather than replacing.

#### TWO-STREAM TESTING (MEDIUM priority)
- **Acceptance tests define WHAT**: Given/When/Then specs describe external observable behavior.
- **Unit tests define HOW**: Implementation details verified through TDD.
- **Both streams must pass**: Implementation is not complete until both acceptance AND unit tests are green.

#### MUTATION TESTING AS VALIDATION LAYER (MEDIUM priority)
- **Phase 6 integration**: Mutation testing added as the final validation layer after post-implementation review.
- **9-language mutation framework support**: Stryker, mutmut, PIT, Stryker.NET, cargo-mutants, go-mutesting, mutant, Stryker4s, pitest.

---

## 9. tdder (t1)

**Source:** [github.com/t1/tdder](https://github.com/t1/tdder)

### Unique Features NOT in STDD

#### BABY STEPS + GUESSING GAME (HIGH priority)
- **Minimal test-first increments**: Each test should be the smallest possible step forward. The "guessing game" challenges the developer to write the minimal test that fails, forcing thinking about what the smallest next step is.
- **Strict Red-Green-Refactor with forced minimalism**: Not just TDD, but the SMALLEST possible test at each step.

#### CLEAN CODE SUBAGENT REVIEWER (HIGH priority)
- **Automated code review during refactor phase**: A dedicated subagent (`clean-code-reviewer`) performs code review automatically during the refactor phase.
- **Review scope**: Naming, SOLID principles, code smells, method design -- all checked automatically.

#### UNFOLDING ARCHITECTURE (HIGH priority)
- **Progressive architectural decisions**: Start with the simplest possible architecture, Add complexity only when it reduces overall complexity.
- **Integration architecture skill**: Explicit patterns for commands vs events, push vs pull, reliability in distributed systems.
- **Start simple, evolve on demand**: Anti-over-engineering pattern.

#### APP MASS CALCULATIONS (MEDIUM priority)
- **Absolute Priority Premise**: Objective code complexity measurement, Quantifies the "mass" of code to guide refactoring priorities.
- **Similar concept to STDD complexity skill**: But tdder integrates it directly into the TDD cycle as a decision point.

#### NESTED FIXTURE PATTERN (MEDIUM priority)
- **JUnit nested fixture**: Layered test preconditions using JUnit's nested classes for building up complex test scenarios incrementally.

#### CONFIGURABLE HITL LEVELS (MEDIUM priority)
- **Three HITL modes**: `every-phase` (stop after every R/G/R), `end-of-cycle` (stop after each complete cycle), `off` (full autonomous).
- **Persistent configuration**: Saved in `.claude/tdder.local.md` per project.

#### AUTO-SKILL LOADING (LOW priority)
- **File-pattern-based skill activation**: PreToolUse hook detects file patterns (e.g., `*.java`) and reminds the agent to load the corresponding skill (`java`).

---

## 10. TDAID (joedevon)

**Source:** [github.com/joedevon/TDAID](https://github.com/joedevon/TDAID)

### Unique Features NOT in STDD

#### PATTERN TEACHING (HIGH priority)
- **Code+test examples as AI training**: Write initial code and tests manually, then these serve as examples for the AI to learn your coding style, conventions, project structure, logging patterns, and test methodology.
- **Style transfer via examples**: The AI extends patterns from provided examples to similar tasks, maintaining consistency.

#### SELF-MOTIVATED IMPLEMENTATION (MEDIUM priority)
- **AI fixes without prompting**: After writing tests, the AI runs them and, without explicit prompting, recognizes failing tests and implements the code to make them pass.
- **Quality observation**: AI-generated code maintains consistent style, error handling, and architectural patterns from the examples.

#### TDAID METHODOLOGY (MEDIUM priority)
- **TDD + vibe coding fusion**: Faster than traditional TDD (AI generates more), but with code review tradeoff -- you should not skip robust code review.
- **Origin story**: Emerged from accessibility evaluation where similar patterns needed implementation across multiple criteria.

#### BEST PRACTICES (LOW priority)
- **Start small**: Begin with well-defined, contained features.
- **Provide clear examples**: Include several representative code+test examples.
- **Iterative refinement**: Review AI work, then ask for improvements.

---

## 11. TDD Starters (tdd-starters)

**Source:** [github.com/tdd-starters](https://github.com/tdd-starters)

### Unique Features NOT in STDD

#### MULTI-LANGUAGE STARTER TEMPLATES (HIGH priority)
- **10 language templates**: Rust, Java, Python, Kotlin, JavaScript, TypeScript, C++ (CMake), C#, Go -- all with testing frameworks pre-configured.
- **String calculator sample**: Every starter includes the classic string calculator kata to ready-to-go.
- **GitHub template repos**: Use "Use this template" button on GitHub to bootstrap a new project instantly.
- **MIT-0 license**: No attribution required -- completely free for any use.

#### KATA-READY SETUP (MEDIUM priority)
- **Pre-configured test frameworks**: Each language has its standard testing framework set up and ready.
- **Sample test included**: A working sample test to verify the setup works.

---

## 12. TDG - Test-Driven Generation (chanwit)

**Source:** [github.com/chanwit/tdg](https://github.com/chanwit/tdg)

### Unique Features NOT in STDD

#### ISSUE TRACEABILITY IN COMMITS (HIGH priority)
- **Phase-prefixed commits**: `red: test spec for user login (#42)`, `green: implement user login (#42)`, `refactor: extract auth service (#42)`.
- **Issue number mandatory**: Every TDD cycle requires an issue number for full traceability from test to commit to issue tracker.

#### ATOMIC COMMIT SKILL (MEDIUM priority)
- **Non-TDD atomic commits**: Separate skill for organizing mixed changes into logical atomic commits when not following TDD workflow.
- **Mixed concern detection**: Analyzes changes and detects when multiple concerns are mixed in one change.
- **Test validation before commit**: Ensures tests pass before allowing any commit.

#### AUTO TDD PHASE DETECTION (MEDIUM priority)
- **Current phase awareness**: Automatically detects whether you're in Red, Green, or Refactor phase based on file changes.
- **Phase-aware commit messages**: Generates appropriate commit message prefix based on detected phase.

#### INITIALIZATION (LOW priority)
- **Project initialization**: `/tdg:init` detects language, framework, and test commands automatically.

---

## Summary: All Unique Features by Category

### WORKFLOW PATTERNS NOT IN STDD

| Feature | Source | Priority |
|---------|--------|----------|
| Delta specs (ADDED/MODIFIED/REMOVED) | OpenSpec | HIGH |
| Adversarial review (forced problem-finding) | BMAD | HIGH |
| 60+ ideation techniques for brainstorming | BMAD | HIGH |
| Advanced elicitation methods | BMAD | HIGH |
| Party Mode (multi-agent debate) | BMAD | HIGH |
| Quick Dev (intelligent one-shot vs full-path routing) | BMAD | HIGH |
| Baby steps + guessing game | tdder | HIGH |
| Cross-model delegation (Claude->GPT on failure) | Claude Pilot | HIGH |
| Enhancement phase (between Green and Refactor) | Spec-First TDD | MEDIUM |
| Evolutionary specs (tighten through building) | Spec-First TDD | MEDIUM |
| SudoLang prompt language | AIDD | HIGH |
| Product discovery with story mapping | AIDD | HIGH |
| Failure layer diagnosis (intent vs spec vs code) | BMAD Quick Dev | HIGH |
| Phase-prefixed commits with issue traceability | TDG | HIGH |
| Unfolding architecture (start simple, evolve) | tdder | HIGH |
| Custom mutation testing tool (3-module AST walker) | ATDD | HIGH |

### TESTING STRATEGIES NOT IN STDD

| Feature | Source | Priority |
|---------|--------|----------|
| Two-stream testing (acceptance=WHAT + unit=HOW) | ATDD | HIGH |
| Spec Guardian (implementation leakage detection) | ATDD | HIGH |
| Pipeline builder (parser->IR->test generator) | ATDD | HIGH |
| 9-language mutation framework support | ATDD | MEDIUM |
| Dual user testing (human think-aloud + AI agent scripts) | AIDD | HIGH |
| Clean code subagent reviewer during refactor | tdder | HIGH |
| Nested fixture pattern (layered test preconditions) | tdder | MEDIUM |
| Pattern teaching (code+test examples for AI learning) | TDAID | HIGH |
| Multi-language test reporters (Vitest, Jest, pytest, PHPUnit, Go, Rust) | TDD Guard | HIGH |
| AI model validation (LLM-powered TDD compliance) | TDD Guard | MEDIUM |

### COLLABORATION MECHANISMS NOT IN STDD

| Feature | Source | Priority |
|---------|--------|----------|
| 23+ AI agent vendor integrations | SpecKit | HIGH |
| Extension marketplace with community catalog | SpecKit | HIGH |
| Party Mode (multi-agent in-character debate) | BMAD | HIGH |
| Team extension (add roles to existing team) | ATDD | MEDIUM |
| Named agents with personality | BMAD | MEDIUM |
| Cross-model delegation | Claude Pilot | HIGH |
| AGENTS.md standard format | SpecKit | HIGH |

### TOOL INTEGRATIONS NOT IN STDD

| Feature | Source | Priority |
|---------|--------|----------|
| SudoLang pseudocode language | AIDD | HIGH |
| GPT Codex integration | Claude Pilot | HIGH |
| Multi-language test reporters | TDD Guard | HIGH |
| Homebrew distribution | TDD Guard | LOW |
| Composable server framework | AIDD | LOW |
| 10-language starter templates | TDD Starters | HIGH |
| Browser/E2E integration in Ralph Loop | Claude Pilot | MEDIUM |

### CONFIGURATION/CUSTOMIZATION NOT IN STDD

| Feature | Source | Priority |
|---------|--------|----------|
| Custom workflow schemas (fork, create, validate) | OpenSpec | HIGH |
| Extension system (catalog, community, publishing) | SpecKit | HIGH |
| HITL granularity levels (every-phase/end-of-cycle/off) | tdder | MEDIUM |
| Dynamic instructions (context+rules+templates layers) | OpenSpec | MEDIUM |
| Module ecosystem (Builder, TEA, Game Dev, Creative) | BMAD | MEDIUM |
| Session control (toggle mid-session) | TDD Guard | MEDIUM |
| CODEX_REASONING_EFFORT config | Claude Pilot | MEDIUM |
| Global + project config layers | OpenSpec | MEDIUM |
| Profile sync drift detection | OpenSpec | LOW |

### DOCUMENTATION APPROACHES NOT IN STDD

| Feature | Source | Priority |
|---------|--------|----------|
| Document sharding for token optimization | BMAD | MEDIUM |
| Auto-sync documentation with code | Claude Pilot | MEDIUM |
| 3D verification (completeness, correctness, coherence) | OpenSpec | MEDIUM |
| Evolutionary specs (tighten through building) | Spec-First TDD | MEDIUM |
| Progressive disclosure for agents (read only relevant folders) | AIDD | MEDIUM |
| Auto-generated index.md from frontmatter | AIDD | LOW |

### CI/CD INTEGRATION NOT IN STDD

| Feature | Source | Priority |
|---------|--------|----------|
| Non-interactive installation mode | BMAD | MEDIUM |
| Pre-commit JSON validation hook | Claude Pilot | MEDIUM |
| Phase-prefixed commit messages | TDG | HIGH |
| GitHub template repos | TDD Starters | MEDIUM |
| DevContainer support for AI agents | SpecKit | LOW |
| PowerShell scripts | SpecKit | LOW |

---

## Top 20 Recommended Features for STDD to Adopt

Based on uniqueness, impact, and feasibility:

1. **Delta Spec system** (OpenSpec) -- Incremental specs with ADDED/MODIFIED/REMOVED
2. **Adversarial review** (BMAD) -- Forced problem-finding, no rubber-stamp approvals
3. **Cross-model delegation** (Claude Pilot) -- Delegate to GPT after 2 failures
4. **Advanced elicitation methods** (BMAD) -- Pre-mortem, First Principles, Inversion, etc.
5. **23+ agent vendor support** (SpecKit) -- Multi-agent interoperability
6. **Custom workflow schemas** (OpenSpec) -- Fork and create team-specific workflows
7. **Two-stream testing** (ATDD) -- Acceptance tests (WHAT) + unit tests (HOW)
 constraint
 AI
 both streams must pass
8. **Spec Guardian agent** (ATDD) -- Detect implementation leakage in specs
9. **Dual user testing** (AIDD) -- Human think-aloud + AI agent test scripts
10. **Extension marketplace** (SpecKit) -- Community extensions catalog
11. **Baby steps + guessing game** (tdder) -- Force minimal test increments
12. **Clean code subagent reviewer** (tdder) -- Automated review during refactor phase
13. **Unfolding architecture** (tdder) -- Start simple, add complexity only when it reduces it
14. **Pattern teaching** (TDAID) -- Code+test examples for AI learning your style
15. **Multi-language test reporters** (TDD Guard) -- 6-language test capture
16. **Story mapping with YAML journeys** (AIDD) -- Product discovery workflow
17. **Quick Dev routing** (BMAD) -- One-shot vs full-path auto-decision
18. **Pipeline builder agent** (ATDD) -- Auto-generate parser->IR->test generator
19. **Issue traceability in commits** (TDG) -- Phase-prefixed commits with issue numbers
20. **10-language starter templates** (TDD Starters) -- Ready-to-use TDD katas

---

## Reference Links

### SDD Frameworks
- SpecKit: https://github.com/github/spec-kit
- OpenSpec: https://github.com/Fission-AI/OpenSpec
- BMAD-METHOD: https://github.com/bmad-code-org/BMAD-METHOD

 - Docs: https://docs.bmad-method.org

### TDD Frameworks
- AIDD: https://github.com/paralleldrive/aidd
- TDD Guard: https://github.com/nizos/tdd-guard
- Claude Pilot: https://github.com/changoo89/claude-pilot
- TDAID: https://github.com/joedevon/TDAID

### Spec-First Approaches
- Spec-First TDD: https://github.com/donnieprakoso/spec-first-tdd
- ATDD: https://github.com/swingerman/atdd

### Disciplined TDD
- tdder: https://github.com/t1/tdder
- TDD Starters: https://github.com/tdd-starters
- TDG: https://github.com/chanwit/tdg
