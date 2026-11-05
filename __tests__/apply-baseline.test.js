/**
 * Tests for baseline commit capture in `stdd apply` (BMAD baseline_revision).
 *
 * The first apply on a change records the current git HEAD into
 * stdd/changes/<name>/.state.yaml as `baseline_commit`, so later reviews can
 * diff against the pre-implementation state instead of trusting self-reports.
 * The value is captured once and never overwritten.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('apply baseline commit capture', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createGitProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-baseline-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'feature-x'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'stdd', 'changes', 'feature-x', 'tasks.md'),
      '- [ ] TASK-001 Implement feature\n', 'utf8');
    git(projectPath, 'init');
    return projectPath;
  }

  function git(cwd, ...args) {
    return spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {
      cwd,
      encoding: 'utf8',
    });
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  it('records the pre-implementation HEAD into .state.yaml on first apply', () => {
    const projectPath = createGitProject('baseline-capture');
    git(projectPath, 'commit', '--allow-empty', '-m', 'init');
    const head = git(projectPath, 'rev-parse', 'HEAD').stdout.trim();
    expect(head).toMatch(/^[0-9a-f]{40}$/);

    // Apply fails afterwards (no test command configured) but the baseline
    // must already be captured — the point is review-by-diff evidence.
    const result = runCli(['apply', 'feature-x'], projectPath);
    expect(result.status).not.toBe(0);

    const statePath = path.join(projectPath, 'stdd', 'changes', 'feature-x', '.state.yaml');
    expect(fs.existsSync(statePath)).toBe(true);
    expect(fs.readFileSync(statePath, 'utf8')).toContain(`baseline_commit: "${head}"`);
  });

  it('never overwrites an existing baseline on later applies', () => {
    const projectPath = createGitProject('baseline-idempotent');
    git(projectPath, 'commit', '--allow-empty', '-m', 'first');
    const firstHead = git(projectPath, 'rev-parse', 'HEAD').stdout.trim();

    runCli(['apply', 'feature-x'], projectPath);

    // New commits move HEAD after the baseline was captured.
    git(projectPath, 'commit', '--allow-empty', '-m', 'second');
    const secondHead = git(projectPath, 'rev-parse', 'HEAD').stdout.trim();
    expect(secondHead).not.toBe(firstHead);

    runCli(['apply', 'feature-x'], projectPath);

    const state = fs.readFileSync(
      path.join(projectPath, 'stdd', 'changes', 'feature-x', '.state.yaml'),
      'utf8'
    );
    expect(state).toContain(`baseline_commit: "${firstHead}"`);
    expect(state).not.toContain(secondHead);
  });

  it('skips capture silently outside a git repository', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-baseline-nogit-'));
    roots.push(root);
    const projectPath = path.join(root, 'nogit');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'feature-x'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'stdd', 'changes', 'feature-x', 'tasks.md'),
      '- [ ] TASK-001 Implement feature\n', 'utf8');

    const result = runCli(['apply', 'feature-x'], projectPath);

    const statePath = path.join(projectPath, 'stdd', 'changes', 'feature-x', '.state.yaml');
    // Apply still fails on missing test command; no state file is created.
    expect(result.status).not.toBe(0);
    expect(fs.existsSync(statePath)).toBe(false);
  });
});
