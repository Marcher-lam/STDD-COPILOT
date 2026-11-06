---
description: Execute TDD implementation loop (Ralph Loop)
---

# Command: /stdd:apply

## Usage
```
/stdd:apply                    # Execute all tasks
/stdd:apply --task=TASK-001    # Execute specific task
/stdd:apply --next             # Execute next task
/stdd:apply --fix              # Fix failing tests
/stdd:apply --no-mutation      # Skip mutation testing
/stdd:apply --no-refactor      # Skip refactoring
```

## Description
Executes tasks defined in `tasks.md`, following the Ralph Loop TDD cycle. Each task goes through RED → CHECK → GREEN → MUTATION → REFACTOR phases.

## Execution Flow
### Ralph Loop (TDD Cycle)
```
🔴 RED → 🔍 CHECK → 🟢 GREEN → 🧪 MUTATION → 🔵 REFACTOR → ✅
```

1. **RED Phase**: Read next incomplete task, analyze requirements, generate failing test cases, confirm test failure
2. **CHECK Phase**: Static analysis (syntax, type checking, code style)
3. **GREEN Phase**: Write minimal implementation, run tests, confirm pass
4. **MUTATION Phase**: Mutate code to detect fake-green assertions, restore code
5. **REFACTOR Phase**: Check code quality, optimize structure, eliminate duplication

### 5-Level Anti-Drift Protection
| Level | Mechanism | Trigger |
|-------|-----------|---------|
| 1 | Human confirmation gate | Key decision points |
| 2 | Micro-task isolation | Tasks > 6 warning |
| 3 | Consecutive failure rollback | Failures >= 3 |
| 4 | Static quality gate | Before each implementation |
| 5 | Pseudo-mutation review | After tests pass |

### Fuse Mechanism
If a task fails 3 consecutive times, the fuse triggers and manual intervention is recommended.

## Referenced Skill
- `/stdd:apply`

## Output
- Updated task status in `tasks.md`
- Implementation code files
- Test files
- `apply.log` with execution records


## v1.1+ Evidence & Safety

- First apply records `baseline_commit` into .state.yaml (review-by-diff).
- `--ruling "<decision> — <reason> — <cost if wrong>"` records execution
  rulings to rulings.md (fed back into later plans).
- 3 consecutive failures on one task = circuit-breaker: stop patching,
  re-plan or delegate with the escalation evidence.
