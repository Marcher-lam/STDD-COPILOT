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
});
