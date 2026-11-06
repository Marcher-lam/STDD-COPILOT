---
description: Generate technical design document from specifications
---

# Command: /stdd:design

## Usage
```
stdd design create                           # Create DESIGN.md
stdd design show                             # Show design document
stdd design check                            # Check design completeness
stdd design update                           # Update design document
```

## Description
Transform specifications into technical design documents with architecture decisions, implementation plans, and risk assessment.

## Execution Flow
1. Detect tech stack
2. Select design preset
3. Generate DESIGN.md template
4. Fill with architecture decisions
5. Validate completeness

## Output
- `DESIGN.md` in project root
- Architecture decisions
- Implementation plan
- Risk assessment
- Tech stack documentation


## v1.2+: Reverse-Engineering Real Sources

`stdd design reverse [--force] [--workspace <ws>]` derives DESIGN.md from
the project's REAL design sources instead of a preset: Tailwind config
tokens (text-parsed — user code is never executed), CSS custom properties,
and component-library dependencies — every token carries a Source annotation.
