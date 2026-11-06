---
description: One-shot full workflow from requirement to task breakdown
---

# Command: /stdd:turbo

## Usage
```
/stdd:turbo <requirement description>         # One-shot through main pre-implementation phases
```

## Description
One-click serial execution from requirement through task breakdown of the pre-implementation phases. Optionally continues to the implementation closed-loop. Suitable for small-to-medium requirements with clear boundaries.

## Execution Flow
1. Parse requirement description
2. Execute propose phase (draft requirement)
3. Execute clarify phase (boundary clarification)
4. Execute confirm phase (user confirmation)
5. Execute spec phase (BDD specification)
6. Execute plan phase (task breakdown)
7. Optionally continue to execute/apply phase

## Applicable Scenarios
- Small-to-medium requirements with clear boundaries
- Scenarios where you want to reduce multi-round clarification interactions

## Output
- Complete change directory with all pre-implementation artifacts:
  - `proposal.md`
  - `specs/`
  - `design.md`
  - `tasks.md`


## v1.1+: `--rigor <level>` is recorded on the created change (see ff).
