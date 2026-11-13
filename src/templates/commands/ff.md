---
description: Fast-forward generation of all artifacts in one step (language-agnostic)
---

# Command: /stdd:ff

## Usage
```bash
stdd ff "需求描述" --change-name <change-id>   # Fast-forward mode
stdd ff "需求描述"                             # Auto-generate change name
stdd ff "需求描述" --workspace packages/api    # Workspace scope
stdd ff "需求描述" --include-design            # Include design doc (default)
stdd ff "需求描述" --skip-design               # Skip design doc
stdd ff "需求描述" --output <change-id>        # Custom change id (alias of --change-name)
```

## Description
One-click generation of all STDD artifacts (proposal, specs, design, tasks) by skipping confirmation gates. Suitable for well-defined requirements with clear boundaries.

## When to Use

### ✅ Suitable for Fast-Forward
- Clear bug fixes with obvious solutions
- Small feature additions
- Configuration updates
- Documentation changes

### ❌ NOT suitable for Fast-Forward
- Ambiguous requirements requiring clarification
- Architecture changes
- High-risk changes requiring review
- Cross-team collaboration

## Execution Flow
```
Input (requirement description)
    ↓
Create change directory
    ↓
Generate proposal.md
    ↓
Generate specs/
    ↓
Generate design.md (optional)
    ↓
Generate tasks.md
    ↓
Stop before apply (await confirmation)
```

## Artifacts Generated
1. `proposal.md` - Requirement proposal
2. `specs/*.md` - Delta specifications
3. `design.md` - Design document (optional)
4. `tasks.md` - Task list with TDD phases

## Referenced Skills
- `/stdd:new` - Full workflow with confirmation
- `/stdd:propose` - Generate proposal only
- `/stdd:spec` - Generate specs only
- `/stdd:plan` - Generate tasks only

## Related Commands
- `/stdd:turbo` - Full automation including implementation
- `/stdd:apply` - Start implementation


## v1.1+: Change-Level Rigor

`stdd ff <desc> --rigor light|standard|strict` — recorded on the change
(.state.yaml); irreversible wording (migrate/drop table/payment/breaking
change/public API) auto-escalates to strict. verify/archive honor the level.
Also: adaptive task budgets (planning.max_tasks) and an interruption ledger.
