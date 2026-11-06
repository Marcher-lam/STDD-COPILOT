---
description: Validate spec consistency and integrity
---

# Command: /stdd:validate

## Usage
```
stdd validate [change]           # Validate change
stdd validate --spec-guardian    # Spec Guardian check
stdd validate --fix              # Auto-fix issues
```

## Description
Validates specification consistency, Spec Guardian leakage detection, and RFC 2119 keyword compliance.

## Execution Flow
1. Parse specifications
2. Check for consistency issues
3. Run Spec Guardian leakage check
4. Validate RFC 2119 keywords
5. Generate report

## Output
- Validation report
- Issues found
- Fix suggestions

## v1.1+: `--strict` enables OpenSpec-style delta structure checks:
requirement/scenario completeness, duplicate headers, MODIFIED/REMOVED
target resolution (rename-aware), ADDED conflicts; `--schema-driven` runs
the schema.yaml validation DSL (min_length / min_items on change artifacts).
