---
description: Read-only brainstorming and elicitation mode for suggestions and exploration
---

# Command: /stdd:brainstorm

## Usage
```
/stdd:brainstorm <topic>       # Explore a topic without modifying files
```

CLI equivalent for structured elicitation:

```bash
stdd brainstorm "<topic>" --method first-principles
stdd brainstorm --list
```

## Description
Pure analysis suggestion mode. Provides read-only analysis of the codebase, architecture, or specific problems without modifying any project files.

The CLI command `stdd brainstorm` is backed by the elicitation engine (`--method`, `--list`, `--json`). This slash-command template keeps the same intent but presents the result as chat analysis instead of writing artifacts.

## Constraints
- **Read-only analysis** - Does not create, modify, or delete any project files
- Provides suggestions, insights, and architectural analysis
- Safe to run at any time without affecting project state

## Execution Flow
1. Analyze the specified topic or current codebase
2. Apply the requested elicitation method when provided
3. Provide insights, suggestions, and observations
4. Output analysis as chat response (no file modifications)

## Use Cases
- Architectural review
- Code quality assessment
- Technology evaluation
- Refactoring suggestions
- Risk identification
- Requirement elicitation with first-principles, inversion, or edge-case methods

## Output
- Analysis report in chat (no files created or modified)
