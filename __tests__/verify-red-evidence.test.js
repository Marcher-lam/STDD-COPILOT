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

  function createTempProject(name, applyLogLines, taskLines) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-red-evidence-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      (taskLines || ['- [x] TASK-001 Done thing\n']).join('\n') + '\n',
      'utf8'
    );
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
    expect(result.stdout).toContain('TASK-001');
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

  // D01 regression (REPORT.md 终测): apply rewrites the tasks.md line with a
  // [phase:*] marker at every phase transition, so each phase's log entry
  // carries a different task text. verify must correlate the evidence on the
  // stable TASK id instead of the raw text.
  it('correlates RED/GREEN/REFACTOR evidence across per-phase [phase:*] suffixes', () => {
    const { projectPath } = createTempProject('red-phase-suffix', [
      { change: 'demo', task: 'TASK-001: build the task board [phase:red]', phase: 'red', status: 'passed' },
      { change: 'demo', task: 'TASK-001: build the task board [phase:green]', phase: 'green', status: 'passed' },
      { change: 'demo', task: 'TASK-001: build the task board [phase:refactor]', phase: 'refactor', status: 'passed' },
    ]);

    const result = verify(projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('RED evidence');
    expect(result.stdout).toContain('1/1');
  });

  it('reports 7/7 RED evidence for a real 7-task RED/GREEN/REFACTOR flow (REPORT D01)', () => {
    const logLines = [];
    const taskLines = [];
    for (let i = 1; i <= 7; i++) {
      const id = `TASK-${String(i).padStart(3, '0')}`;
      const desc = `${id}: implement feature ${i}`;
      taskLines.push(`- [x] ${desc}`);
      logLines.push({ change: 'demo', task: `${desc} [phase:red]`, phase: 'red', status: 'passed' });
      logLines.push({ change: 'demo', task: `${desc} [phase:green]`, phase: 'green', status: 'passed' });
      logLines.push({ change: 'demo', task: `${desc} [phase:refactor]`, phase: 'refactor', status: 'passed' });
    }
    const { projectPath } = createTempProject('red-phase-7tasks', logLines, taskLines);

    const result = verify(projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('7/7');
    expect(result.stdout).not.toContain('7/21');
    expect(result.stdout).not.toContain('without a recorded RED pass');
  });

  it('correlates phase evidence when apply inserted the marker right after the checkbox', () => {
    // updateTaskPhase inserts `] [phase:red] ` after the checkbox on first
    // transition, so the parsed description starts with the marker.
    const { projectPath } = createTempProject('red-phase-prefix', [
      { change: 'demo', task: '[phase:red] TASK-001 Done thing', phase: 'red', status: 'passed' },
      { change: 'demo', task: '[phase:green] TASK-001 Done thing', phase: 'green', status: 'passed' },
      { change: 'demo', task: '[phase:done] TASK-001 Done thing', phase: 'refactor', status: 'passed' },
    ]);

    const result = verify(projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('1/1');
  });

  it('still fails GREEN-without-RED when the task texts differ per phase', () => {
    const { projectPath } = createTempProject('red-phase-missing', [
      { change: 'demo', task: 'TASK-001: build the task board [phase:green]', phase: 'green', status: 'passed' },
      { change: 'demo', task: 'TASK-001: build the task board [phase:refactor]', phase: 'refactor', status: 'passed' },
    ]);

    const result = verify(projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('TASK-001');
    expect(result.stdout).toContain('without a recorded RED pass');
  });
});
