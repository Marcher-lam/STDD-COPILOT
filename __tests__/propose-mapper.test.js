/**
 * Registry mapper regression for `stdd propose` (REPORT.md 终测 N17).
 *
 * The registry registers `propose [action] [name]` but ProposeCommand.execute
 * takes (requirement, options). Without a mapper, Commander's second positional
 * landed in the options slot, so the documented form
 * `stdd propose draft expected-change --description "..."` created a change
 * named "draft" and silently dropped every flag. The mapper routes the
 * two-positional form to (description, { name }) and leaves the README's
 * one-positional `stdd propose <requirement>` form untouched.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('propose registry mapper', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-propose-map-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    return projectPath;
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  it('two-positional form creates the change named by the second arg (N17)', () => {
    const projectPath = createTempProject('two-pos');

    const result = runCli(
      ['propose', 'draft', 'expected-change', '--description', 'Add a task board with filtering'],
      projectPath
    );

    expect(result.status).toBe(0);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'expected-change');
    expect(fs.existsSync(path.join(changeDir, 'proposal.md'))).toBe(true);
    // The action keyword must NOT become the change name.
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'draft'))).toBe(false);

    const proposal = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    expect(proposal).toContain('task board');
  });

  it('one-positional form keeps deriving the change from the requirement', () => {
    const projectPath = createTempProject('one-pos');

    const result = runCli(['propose', 'task-board', '--description', 'Add a task board'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'task-board', 'proposal.md'))).toBe(true);
  });

  // Round-4 action dispatch: the action keyword must reach execute and the
  // read-only actions must never write.
  function seedProposal(projectPath, name, extra = {}) {
    const changeDir = path.join(projectPath, 'stdd', 'changes', name);
    fs.mkdirSync(changeDir, { recursive: true });
    const proposal = [
      `# Proposal: ${name}`,
      '',
      '## Description',
      '',
      extra.description || 'Build a small task board application for tracking work items.',
      '',
      '## Scope',
      '',
      ...(extra.scope || ['- Task CRUD endpoints', '- Filtering by status', '- Atomic JSON storage', '- Priority levels', '- Search by title']),
      '',
      '## Success Criteria',
      '',
      ...(extra.criteria || ['- [ ] Tasks can be created and listed', '- [ ] Data survives a restart']),
      '',
      '---',
      '',
      'status: draft',
    ].join('\n');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposal, 'utf8');
    return { changeDir, proposal };
  }

  it('show prints the existing proposal and never writes (pre-round-4 it overwrote it)', () => {
    const projectPath = createTempProject('act-show');
    const { changeDir, proposal } = seedProposal(projectPath, 'task-board');

    const result = runCli(['propose', 'show', 'task-board'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('# Proposal: task-board');
    expect(result.stdout).toContain('Atomic JSON storage');
    // The file is byte-identical — no rewrite, no status churn.
    expect(fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8')).toBe(proposal);
  });

  it('show without a target on an empty workspace fails and creates nothing', () => {
    const projectPath = createTempProject('act-show-empty');

    const result = runCli(['propose', 'show'], projectPath);

    expect(result.status).not.toBe(0);
    // The pre-round-4 bug created a junk change named after the keyword.
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'show'))).toBe(false);
  });

  it('validate exits 0 for a complete proposal and 1 for an incomplete one', () => {
    const okProject = createTempProject('act-validate-ok');
    seedProposal(okProject, 'complete');
    const ok = runCli(['propose', 'validate', 'complete'], okProject);
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain('All required sections present');

    const badProject = createTempProject('act-validate-bad');
    seedProposal(badProject, 'incomplete', { description: undefined, scope: undefined, criteria: undefined });
    fs.writeFileSync(
      path.join(badProject, 'stdd', 'changes', 'incomplete', 'proposal.md'),
      '# Proposal: incomplete\n\nstatus: draft\n',
      'utf8'
    );
    const bad = runCli(['propose', 'validate', 'incomplete'], badProject);
    expect(bad.status).not.toBe(0);
    expect(bad.stdout).toContain('description');
    expect(bad.stdout).toContain('success_criteria');
  });

  it('refine regenerates the Clarifying Questions section in place', () => {
    const projectPath = createTempProject('act-refine');
    const { changeDir } = seedProposal(projectPath, 'task-board');
    const before = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    expect(before).not.toContain('refined:');

    const result = runCli(['propose', 'refine', 'task-board'], projectPath);

    expect(result.status).toBe(0);
    const after = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    expect(after).toContain('refined:');
    // Content sections survive; only the questions section is replaced.
    expect(after).toContain('## Description');
    expect(after).toContain('Atomic JSON storage');
    expect(after).toContain('## Success Criteria');
    expect(after.match(/^- \[ \] /gm).length).toBeGreaterThan(3);
  });

  it('split writes a plan and scaffolds sub-changes; --dry-run writes nothing', () => {
    const projectPath = createTempProject('act-split');
    const { changeDir } = seedProposal(projectPath, 'epic-board');

    const dry = runCli(['propose', 'split', 'epic-board', '--dry-run'], projectPath);
    expect(dry.status).toBe(0);
    expect(fs.existsSync(path.join(changeDir, 'split-plan.md'))).toBe(false);
    expect(fs.readdirSync(path.join(projectPath, 'stdd', 'changes'))).toEqual(['epic-board']);

    const result = runCli(['propose', 'split', 'epic-board'], projectPath);
    expect(result.status).toBe(0);
    const plan = fs.readFileSync(path.join(changeDir, 'split-plan.md'), 'utf8');
    expect(plan).toContain('# Split Plan: epic-board');
    // 5 scope items at ≤3 per sub-change → 2 sub-changes.
    const subs = fs.readdirSync(path.join(projectPath, 'stdd', 'changes'))
      .filter(n => n !== 'epic-board');
    expect(subs.length).toBe(2);
    for (const sub of subs) {
      expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', sub, 'proposal.md'))).toBe(true);
    }
  });

  it('split refuses when the proposal has fewer than two scope items', () => {
    const projectPath = createTempProject('act-split-thin');
    seedProposal(projectPath, 'thin', { scope: ['- Only one item'] });
    // seedProposal joins array items without bullet markers; write a literal
    // single-bullet scope for precision.
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'thin');
    fs.writeFileSync(
      path.join(changeDir, 'proposal.md'),
      '# Proposal: thin\n\n## Description\n\nDo a thing.\n\n## Scope\n\n- one thing\n\n## Success Criteria\n\n- [ ] it works\n',
      'utf8'
    );

    const result = runCli(['propose', 'split', 'thin'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('Nothing to split');
    expect(fs.existsSync(path.join(changeDir, 'split-plan.md'))).toBe(false);
  });

  it('draft refuses to overwrite an existing proposal without --force', () => {
    const projectPath = createTempProject('act-force');
    seedProposal(projectPath, 'existing');
    const proposalPath = path.join(projectPath, 'stdd', 'changes', 'existing', 'proposal.md');
    const before = fs.readFileSync(proposalPath, 'utf8');

    const refused = runCli(['propose', 'draft', 'existing', '--description', 'Clobber it'], projectPath);
    expect(refused.status).not.toBe(0);
    expect(refused.stdout).toContain('--force');
    expect(fs.readFileSync(proposalPath, 'utf8')).toBe(before);

    const forced = runCli(['propose', 'draft', 'existing', '--description', 'Clobber it', '--force'], projectPath);
    expect(forced.status).toBe(0);
    const after = fs.readFileSync(proposalPath, 'utf8');
    expect(after).toContain('Clobber it');
    expect(after).not.toBe(before);
  });
});
