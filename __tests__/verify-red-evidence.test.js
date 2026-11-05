/**
 * Tests for the RED-phase evidence gate in `stdd verify`
 * (superpowers TDD iron law: if you didn't watch the test fail, you don't
 * know if it tests the right thing).
 *
 * A TDD-phase task that reached GREEN without a recorded RED pass is an
 * anti-fake-green risk: verify must fail it. Legacy-mode tasks (no phase
 * logging) are counted but not blocked.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('verify RED-phase evidence gate', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, applyLogLines) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-red-evidence-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done thing\n', 'utf8');
    if (applyLogLines) {
      fs.writeFileSync(
        path.join(changeDir, 'apply.log'),
        applyLogLines.map(line => `[2026-11-05T10:00:00.000Z] ${JSON.stringify(line)}`).join('\n') + '\n',
        'utf8'
      );
    }
    return { projectPath, changeDir };
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  function verify(projectPath) {
    return runCli(['verify', 'demo', '--no-constitution'], projectPath);
  }

  it('passes when every TDD task has RED evidence before GREEN', () => {
    const { projectPath } = createTempProject('red-ok', [
      { change: 'demo', task: 'TASK-001 Done thing', phase: 'red', status: 'passed' },
      { change: 'demo', task: 'TASK-001 Done thing', phase: 'green', status: 'passed' },
      { change: 'demo', task: 'TASK-001 Done thing', phase: 'refactor', status: 'passed' },
    ]);

    const result = verify(projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('RED evidence');
  });

  it('fails a TDD task that reached GREEN without a recorded RED pass', () => {
    const { projectPath } = createTempProject('red-missing', [
      { change: 'demo', task: 'TASK-001 Done thing', phase: 'green', status: 'passed' },
      { change: 'demo', task: 'TASK-001 Done thing', phase: 'refactor', status: 'passed' },
    ]);

    const result = verify(projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('RED');
    expect(result.stdout).toContain('TASK-001 Done thing');
  });

  it('does not block legacy-mode tasks (no phase logs), but counts them', () => {
    const { projectPath } = createTempProject('red-legacy', [
      { change: 'demo', task: 'TASK-001 Done thing', status: 'passed' },
    ]);

    const result = verify(projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('legacy');
  });

  it('skips the gate when no apply.log exists', () => {
    const { projectPath } = createTempProject('red-nolog', null);

    const result = verify(projectPath);

    expect(result.status).toBe(0);
  });
});
