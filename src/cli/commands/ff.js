/**
 * FF Command (Fast-Forward)
 * Generate a change with pre-populated tasks for immediate apply
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { validateChangeName } = require('../../utils/change-utils');
const { generateChangeName: _genChangeName, toSafeFilename: _toSafe, workspaceContext: _wsCtx } = require('../../utils/change-helpers');
const { resolveRigor, writeChangeRigor } = require('../../utils/rigor');
const { readGateConfig } = require('../../utils/gate-config');

class FFCommand {
  constructor(spinner) {
    this.spinner = spinner;
  }

  async ensureChangesDir() {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    try {
      await fs.access(changesDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('STDD not initialized. Run `stdd init` first.');
      }
      throw new Error(`Cannot access changes directory: ${error.message}`);
    }
    return changesDir;
  }







  /**
   * A-2: a concise, case-preserving label for requirement/task titles.
   * Never title-case the description — that destroyed URLs like
   * /api/articles/:slug/favorite in the generated spec (过程审计 A-2).
   */
  shortLabel(description, max = 48) {
    const text = String(description).replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const boundary = cut.lastIndexOf(' ');
    return (boundary > max / 2 ? cut.slice(0, boundary) : cut).trim() + '…';
  }

  generateProposal(description, workspace = null) {
    const timestamp = new Date().toISOString();
    const workspaceSection = workspace ? `
## Workspace

- Path: ${workspace.path}
- Package: ${workspace.name}
` : '';
    const workspaceRow = workspace ? `| Workspace | ${workspace.path} |
` : '';
    // A-2: In Scope carries the requirement itself — no more disconnected
    // template words ("核心功能实现"); tasks derive from these items.
    return `# Proposal: ${this.shortLabel(description, 80)}

## Intent

> 这个变更要解决什么问题？为什么现在要做？

${description}

## Scope

### In Scope

- [ ] ${description}
- [ ] 基础单元测试与回归

### Out of Scope

- 高级特性
- 性能优化

## Success Criteria

- [ ] 所有测试通过
- [ ] 无 ESLint 警告
${workspaceSection}

---

## Metadata

| Field | Value |
|-------|-------|
| Created | ${timestamp.split('T')[0]} |
| Author | [作者] |
| Status |  Draft |
${workspaceRow}
`;
  }

  /**
   * A-2: tasks derive from the proposal's scope items (same philosophy as
   * `stdd plan`), not a fixed 3-slot template. [phase:red] markers keep
   * them on the TDD state machine's default path (终测复验 D12).
   */
  generateTasks(description, workspace = null) {
    const workspaceHeader = workspace ? `
> Workspace: ${workspace.path}
` : '';
    const label = this.shortLabel(description);
    return `# Tasks
${workspaceHeader}

- [ ] TASK-001: Implement: ${label} [phase:red]
- [ ] TASK-002: Write failing tests for ${label} [phase:red]
- [ ] TASK-003: Add error handling and edge cases [phase:red]
- [ ] TASK-004: Run mutation testing [phase:red]
`;
  }

  /**
   * Design skeleton (终测复验 D12): ff promises a design document. The
   * generator cannot invent architecture decisions — it scaffolds the
   * decision ledger with the requirement filled in and clearly labeled
   * open slots for the implementer.
   */
  generateDesign(description, workspace = null) {
    const workspaceSection = workspace ? `\n## Workspace\n\n- Path: ${workspace.path}\n- Package: ${workspace.name}\n` : '';
    return `# Design: ${description}

## Context

> 需求：${description}

## Decision Ledger

### AD-1: implementation approach for "${description}"

Status: OPEN — 由实现者在 apply 前填写（决策格式：决定 — 理由 — 出错了的代价）。

## Risks

- [ ] 待实现者评估（性能 / 安全 / 兼容性）
${workspaceSection}
`;
  }

  /**
   * Delta spec skeleton for ff: an ADDED requirement whose name is a
   * case-preserving short label (A-2: the old title-casing destroyed URLs),
   * with the RAW requirement text in the SHALL body, plus a Scenario block.
   * Passes the same strict gate as `stdd validate --strict` / archive.
   */
  generateDeltaSpec(description) {
    const label = this.shortLabel(description);
    return `## ADDED Requirements

### Requirement: ${label}

The system SHALL ${description}.

#### Scenario: ${label}

- **GIVEN** the current system state
- **WHEN** the behavior "${label}" is exercised
- **THEN** "${label}" is delivered as specified
`;
  }

  async execute(description, options = {}) {
    if (!description || typeof description !== 'string') {
      throw new Error('Description is required.');
    }

    // Fail fast on an invalid --rigor before any files are created.
    const rigor = resolveRigor({ explicit: options.rigor, intent: 'feature', text: description });
    const changesDir = await this.ensureChangesDir();
    const workspace = options.workspace ? resolveWorkspace(process.cwd(), options.workspace) : null;
    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }
    const workspaceMeta = _wsCtx(workspace);

    const changeName = options.changeName || options.output || _genChangeName('ff');
    // --output is the template-documented alias for the change id (a custom
    // output location under stdd/changes/). It is a change NAME: the rest
    // of the tool addresses changes by single-segment ids.
    validateChangeName(changeName);
    const changeDir = path.join(changesDir, changeName);

    // 过程审计 A-1: `new change` then `ff` is the documented pairing — ff
    // must FILL an existing skeleton change, not error on EEXIST. User
    // edits are never clobbered: only absent files or untouched templates
    // (detected by their sentinel markers) get written.
    let populateMode = false;
    try {
      await fs.mkdir(changeDir, { recursive: false });
    } catch (error) {
      if (error.code === 'EEXIST') {
        populateMode = true;
      } else {
        throw error;
      }
    }

    await fs.mkdir(path.join(changeDir, 'specs'), { recursive: true });

    // design.md ships by default (--skip-design omits it; --include-design
    // is the explicit form of the default).
    const includeDesign = options.includeDesign === true
      || (options.includeDesign === undefined && options.skipDesign !== true);

    // [rel, content, templateSentinels] — sentinels prove a file is still
    // an untouched `stdd new` skeleton (safe to replace with ff's version).
    const artifacts = [
      ['proposal.md', this.generateProposal(description, workspaceMeta), ['[功能点 1]']],
      ['tasks.md', this.generateTasks(description, workspaceMeta), ['TASK-001: Setup project structure']],
      ['specs/spec.md', this.generateDeltaSpec(description), []],
      ...(includeDesign ? [['design.md', this.generateDesign(description, workspaceMeta), []]] : []),
    ];

    const filled = [];
    const kept = [];
    for (const [rel, content, sentinels] of artifacts) {
      const filePath = path.join(changeDir, rel);
      let existing = null;
      try {
        existing = await fs.readFile(filePath, 'utf8');
      } catch {
        existing = null; // absent → fill
      }
      if (existing === null) {
        await fs.writeFile(filePath, content);
        filled.push(rel);
      } else if (populateMode && sentinels.some(s => existing.includes(s))) {
        await fs.writeFile(filePath, content);
        filled.push(`${rel} (replaced untouched template)`);
      } else {
        kept.push(rel);
      }
    }

    if (populateMode && filled.length === 0) {
      throw new Error(
        `Change '${changeName}' already exists and is already populated (${kept.join(', ')}).\n` +
        'ff fills skeletons once; edit the artifacts directly or use a new change name.'
      );
    }

    // Rigor is a property of the change: recorded once at creation, honored
    // by verify/archive unless explicitly overridden there.
    writeChangeRigor(changeDir, rigor.level);

    if (populateMode) {
      console.log(chalk.green(`\n✅ Fast-forward filled existing change '${changeName}'\n`));
      filled.forEach(f => console.log(`  ${chalk.green('+')} ${f}`));
      kept.forEach(k => console.log(`  ${chalk.dim('=')} ${k} (kept — already has content)`));
      console.log('');
    } else {
      console.log(chalk.green(`\n✅ Fast-forward change '${changeName}' created at stdd/changes/${changeName}/\n`));
    }
    console.log(chalk.dim(`  Rigor: ${rigor.level} (${rigor.basis}) — verify/archive will follow it`));
    console.log(chalk.dim(`  Artifacts: proposal.md, tasks.md (TDD phases), specs/spec.md${includeDesign ? ', design.md' : ''}`));
    if (workspaceMeta) {
      console.log(chalk.cyan(`Workspace: ${workspaceMeta.path}`));
    }
    console.log('Next steps:');
    const workspaceArg = workspaceMeta ? ` --workspace ${workspaceMeta.path}` : '';
    // B-2: ff deliberately skips the interactive confirmation gate — in
    // enforced mode the framework still stops code execution at apply
    // until a decision is recorded. Say so up front, not after the fact.
    if (readGateConfig(process.cwd()).confirmation === 'enforced') {
      console.log(chalk.yellow(`  ⛔ gates.confirmation=enforced: record a decision before apply —`));
      console.log(chalk.cyan(`     stdd confirm ${changeName} --yes "<why this proceeds>"`));
    }
    console.log(chalk.cyan(`  stdd apply ${changeName}${workspaceArg}`));
    console.log(chalk.dim(`  (risk-triggered confirm? record evidence first: stdd certainty assess ${changeName} --scores "req:4,tech:4,risk:4,test:4,vision:4")`));

    return { changeName, workspace: workspaceMeta, rigor: rigor.level };
  }
}

module.exports = { FFCommand };
