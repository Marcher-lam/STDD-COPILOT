---
description: Outside-in TDD from E2E to unit
---

# Command: /stdd:outside-in

## Usage
```
stdd outside-in init             # Initialize outside-in TDD
stdd outside-in scaffold [change] # Generate test scaffold
stdd outside-in status           # Check status
```

## Description
Outside-in TDD approach starting from E2E tests, then integration tests, finally unit tests.

## Execution Flow
1. Define E2E test scenarios
2. Generate integration tests
3. Generate unit tests
4. Create test hierarchy

## Output
- E2E test skeleton
- Integration test skeleton
- Unit test skeleton

## v1.2: `scaffold <change> --code rtl|playwright|storybook|all` also
generates RUNNABLE test skeletons driven by the change's BDD scenarios
(RTL with an a11y/axe hook, Playwright specs, Storybook stories).
