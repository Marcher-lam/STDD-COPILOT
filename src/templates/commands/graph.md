---
description: Graph engine commands - visualize, analyze, run, parallel, history, replay, recommend
---

# Command: /stdd:graph

## Usage

### Sub-commands
```
/stdd:graph visualize          # Mermaid format
/stdd:graph visualize --format=html    # HTML interactive
/stdd:graph visualize --output=graph.svg

/stdd:graph analyze            # Status analysis
/stdd:graph analyze --paths    # Path analysis
/stdd:graph analyze --bottlenecks  # Bottleneck analysis

/stdd:graph run stdd-spec      # Start from spec phase
/stdd:graph run --full         # Full workflow
/stdd:graph run --skip-completed
/stdd:graph run --dry-run      # Preview

/stdd:graph parallel --detect  # Detect parallelizable tasks
/stdd:graph parallel --execute # Execute in parallel
/stdd:graph parallel --max-workers=4

/stdd:graph history            # All history
/stdd:graph history --last=10  # Last 10 executions
/stdd:graph history --failures # Failed executions only

/stdd:graph replay <exec-id>   # Replay execution
/stdd:graph replay <exec-id> --re-execute

/stdd:graph recommend          # Recommend next step based on current state
/stdd:graph recommend --goal="Complete auth feature"
```

## Description
Graph engine commands for managing and executing the STDD skill graph. Provides visualization, analysis, execution control, parallel processing, history tracking, replay, and intelligent recommendations.

## Sub-commands

### visualize
Visualizes the skill dependency graph.
- Default: Mermaid format
- `--format=html`: Interactive HTML visualization
- `--output`: Specify output file

### analyze
Analyzes current state and executable paths.
- `--paths`: Path analysis showing possible execution routes
- `--bottlenecks`: Identifies bottleneck skills in the graph

### run
Executes from a specified skill.
- `--full`: Execute the complete workflow
- `--skip-completed`: Skip already completed skills
- `--dry-run`: Preview execution plan without running

### parallel
Identifies and executes independent tasks in parallel.
- `--detect`: Detect tasks that can run in parallel
- `--execute`: Actually execute in parallel
- `--max-workers`: Set maximum parallel workers (default: 4)

### history
Views execution history.
- `--last=N`: Show last N executions
- `--failures`: Show only failed executions

### replay
Replays a historical execution.
- `<exec-id>`: Execution ID to replay
- `--re-execute`: Actually re-execute (not just display)

### recommend
Intelligently recommends the next step.
- Based on current graph state
- `--goal`: Provide a specific goal for targeted recommendations

## Output
- Visualization files (Mermaid, HTML, SVG)
- Analysis reports
- Execution logs
- History records
- Recommendation suggestions


## v1.1+ Engine Options (graph run)

`--rigor` · `--retry <n>` (read-only nodes; transient-classified errors
retry anywhere) · `--node-timeout <s>` · `--sequential` · `--no-cache`.
Layered parallel execution; checkpoints resume per change+intent+rigor;
failures locate a re-planning decision point; history evidence recorded.
Project intents: stdd/graph/intents.yaml. Global timeout: config
graph.timeout.
