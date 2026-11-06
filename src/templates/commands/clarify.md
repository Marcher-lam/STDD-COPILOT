---
description: Multi-round clarification for requirement drafts
---

# Command: /stdd:clarify

## Usage
```
/stdd:clarify                  # Clarify current active change
/stdd:clarify --change=<name>  # Clarify specified change
```

## Description
Conducts multi-round clarification sessions for requirement drafts. Helps resolve ambiguities, identify edge cases, and ensure the requirement is well-scoped before proceeding to specification.

## Execution Flow
1. Load current active change proposal
2. Identify ambiguous or incomplete areas
3. Ask clarifying questions about:
   - Boundary conditions
   - Edge cases
   - Implicit constraints
   - Non-functional requirements
4. Update proposal.md with clarified information
5. Repeat until clarification is complete

## Next Step
- After clarification is complete, proceed to `/stdd:confirm`

## Output
- Updated `proposal.md` with clarified requirements
- Refined scope and boundary definitions

## v1.1+: Conversational by default — core questions + signal-selected
probes (no more 20-question dump). `--exhaustive` restores the full
checklist. Actions: `questions` (list only), `edge-cases`, `constraints`.
