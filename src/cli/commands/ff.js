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







  generateProposal(description, workspace = null) {
    const timestamp = new Date().toISOString();
    const workspaceSection = workspace ? `
## Workspace

- Path: ${workspace.path}
- Package: ${workspace.name}
` : '';
    const workspaceRow = workspace ? `| Workspace | ${workspace.path} |
` : '';
    return `# Proposal: ${description}

## Intent

> 这个变更要解决什么问题？为什么现在要做？

${description}

## Scope

### In Scope

- [ ] 核心功能实现
- [ ] 基础单元测试

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

  generateTasks(description, workspace = null) {
    const workspaceHeader = workspace ? `
> Workspace: ${workspace.path}
` : '';
    // [phase:red] markers put ff tasks on the TDD state machine's default
    // path — apply enforces RED → GREEN → REFACTOR evidence (终测复验 D12).
    return `# Tasks
${workspaceHeader}

- [ ] TASK-001: 环境准备与脚手架搭建 [phase:red]
- [ ] TASK-002: ${description} 核心逻辑实现 [phase:red]
- [ ] TASK-003: 单元测试编写与验证 [phase:red]
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
   * Delta spec skeleton for ff: an ADDED requirement with a real Scenario
   * block derived from the description, so the change's specs pass the same
   * strict gate (`stdd validate --strict` / archive) instead of shipping an
   * empty specs/ directory (终测复验 D12).
   */
  generateDeltaSpec(description) {
    const title = description
      .trim()
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    return `## ADDED Requirements

### Requirement: ${title}

The system SHALL support: ${description}.

#### Scenario: ${title}

- **GIVEN** the current system state
- **WHEN** the user attempts to ${description}
- **THEN** "${description}" is delivered as specified
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

    try {
      await fs.mkdir(changeDir, { recursive: false });
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new Error(`Change '${changeName}' already exists.`);
      }
      throw error;
    }

    await fs.mkdir(path.join(changeDir, 'specs'), { recursive: true });

    await fs.writeFile(path.join(changeDir, 'proposal.md'), this.generateProposal(description, workspaceMeta));
    await fs.writeFile(path.join(changeDir, 'tasks.md'), this.generateTasks(description, workspaceMeta));
    await fs.writeFile(path.join(changeDir, 'specs', 'spec.md'), this.generateDeltaSpec(description));
    // design.md ships by default (--skip-design omits it; --include-design
    // is the explicit form of the default).
    const includeDesign = options.includeDesign === true
      || (options.includeDesign === undefined && options.skipDesign !== true);
    if (includeDesign) {
      await fs.writeFile(path.join(changeDir, 'design.md'), this.generateDesign(description, workspaceMeta));
    }

    // Rigor is a property of the change: recorded once at creation, honored
    // by verify/archive unless explicitly overridden there.
    writeChangeRigor(changeDir, rigor.level);

    console.log(chalk.green(`\n✅ Fast-forward change '${changeName}' created at stdd/changes/${changeName}/\n`));
    console.log(chalk.dim(`  Rigor: ${rigor.level} (${rigor.basis}) — verify/archive will follow it`));
    console.log(chalk.dim(`  Artifacts: proposal.md, tasks.md (TDD phases), specs/spec.md${includeDesign ? ', design.md' : ''}`));
    if (workspaceMeta) {
      console.log(chalk.cyan(`Workspace: ${workspaceMeta.path}`));
    }
    console.log('Next steps:');
    const workspaceArg = workspaceMeta ? ` --workspace ${workspaceMeta.path}` : '';
    console.log(chalk.cyan(`  stdd apply ${changeName}${workspaceArg}`));
    console.log(chalk.dim(`  (risk-triggered confirm? record evidence first: stdd certainty assess ${changeName} --scores "req:4,tech:4,risk:4,test:4,vision:4")`));

    return { changeName, workspace: workspaceMeta, rigor: rigor.level };
  }
}

module.exports = { FFCommand };
