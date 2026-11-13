/**
 * End-to-end regression for the documented task pipeline (REPORT.md 终测 D03):
 * the tasks.md written by `stdd new` and by `stdd plan` must be directly
 * consumable by `stdd spec` — no manual reformatting between the steps.
 *
 * Pre-fix, `new` wrote colon-less `TASK-001 Setup...` and `plan` wrote
 * `**TASK-001**: ...`, while the spec generator only accepted `TASK-001:`,
 * so `stdd spec` failed with "No tasks found in tasks.md".
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('new/plan → spec generation chain', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, proposalContent) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-spec-chain-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });
    if (proposalContent) {
      const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposalContent, 'utf8');
    }
    return projectPath;
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  it('generates specs from the tasks.md written by stdd new', () => {
    const projectPath = createTempProject('new-chain');

    const created = runCli(['new', 'change', 'demo'], projectPath);
    expect(created.status).toBe(0);

    const spec = runCli(['spec', 'demo'], projectPath);

    expect(spec.status).toBe(0);
    expect(spec.stdout).not.toContain('No tasks found in tasks.md');
    const specsDir = path.join(projectPath, 'stdd', 'changes', 'demo', 'specs');
    const features = fs.readdirSync(specsDir).filter(f => f.endsWith('.feature'));
    expect(features.length).toBeGreaterThanOrEqual(1);
  });

  it('generates specs from the tasks.md written by stdd plan', () => {
    const projectPath = createTempProject('plan-chain', [
      '# Proposal: Add logout button',
      '',
      '## description',
      'Add a logout button to the header that clears the session.',
      '',
      '## scope',
      '- place button in header',
      '',
      '## success_criteria',
      '- clicking logs the user out',
    ].join('\n'));

    const planned = runCli(['plan', 'demo'], projectPath);
    expect(planned.status).toBe(0);

    const spec = runCli(['spec', 'demo'], projectPath);

    expect(spec.status).toBe(0);
    expect(spec.stdout).not.toContain('No tasks found in tasks.md');
    const specsDir = path.join(projectPath, 'stdd', 'changes', 'demo', 'specs');
    const features = fs.readdirSync(specsDir).filter(f => f.endsWith('.feature'));
    expect(features.length).toBeGreaterThanOrEqual(1);
  });
});
