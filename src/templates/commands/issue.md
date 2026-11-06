---
description: Bug fix workflow using TDD
---

# Command: /stdd:issue

## Usage
```
/stdd:issue                     # Start bug fix workflow
```

## Description
Issue Resolution mode for TDD-based bug fix workflow. Follows the test-first approach: write a failing test that reproduces the bug, then implement the minimal fix.

## Execution Flow
1. **Bug Classification**: Analyze and categorize the bug
2. **Create Change**: Generate bug fix change proposal
3. **Failing Test First**: Write a test that reproduces the bug (RED)
4. **Minimal Fix**: Implement the smallest fix to make the test pass (GREEN)
5. **Regression Verification**: Ensure fix doesn't break existing functionality
6. **Archive**: Complete the bug fix change

## Applicable Scenarios
- Bug classification and triage
- Failing test first approach
- Minimal fix with regression verification

## Output
- Bug fix change in `stdd/changes/`
- Test case that reproduces the bug
- Minimal fix implementation
- Regression test results


## v1.1+: Rigor & Safety

`--rigor` as in ff (high severity auto-escalates to strict). Same-task
3-strikes failures trip a circuit-breaker (architecture problem, not a
symptom) with escalation evidence. `--change-name <name>` supported.
