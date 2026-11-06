---
description: Archive a completed change
---

# Command: /stdd:archive

## Usage
```
/stdd:archive                  # Archive current change
/stdd:archive --force          # Force archive (skip validation)
```

## Description
Completes and archives a change, merging delta specs into main specs. The change directory is moved to the archive folder with a date-prefixed name.

## Execution Flow
1. **Validate state:**
   - All tasks completed
   - All tests passing
   - No unresolved blockers
2. **Merge Delta Specs:**
   - ADDED → Append to main spec
   - MODIFIED → Replace existing requirement
   - REMOVED → Delete corresponding requirement
3. **Generate archive summary:**
   - Create `archive.md` with metadata, summary, metrics
4. **Move to archive directory:**
   - `stdd/changes/archive/YYYY-MM-DD-{change-id}/`
5. **Update status**
   - Mark as Completed

### Pre-Archive Checklist
- All tasks completed
- Unit/integration/E2E tests passing
- Code coverage and mutation score acceptable
- TypeScript/ESLint clean
- Delta specs validated with no merge conflicts

## Referenced Skill
- `/stdd:archive`

## Output
- Updated main specs with merged delta changes
- `stdd/changes/archive/YYYY-MM-DD-{change-id}/` with all artifacts
- `archive.md` summary document


## v1.1+ Gates

Pre-archive strict structure gate (scenario completeness, duplicate headers)
runs BEFORE any spec write; `--skip-strict` escapes. Delta conflicts abort
with spec-merge-report.json. Retrospective verdict (accepted /
accepted-with-open-items / rejected) lands in summary.md. Open deferred-work
items are carried into the archive with a warning.
