/**
 * Tests for the 3-consecutive-failure escalation in `stdd apply`
 * (superpowers systematic-debugging: 3 failed fixes = architecture problem).
 *
 * When the same task fails 3 times in a row, apply must stop encouraging
 * symptom patching: it prints a circuit-breaker escalation telling the
 * agent/user to question the architecture, and records escalation evidence.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('apply 3-strikes escalation', () => {
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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-threestrikes-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'flaky');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      '- [ ] [phase:green] TASK-001 Stubborn feature\n',
      'utf8'
    );
    return { projectPath, changeDir };
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  function applyOnce(projectPath) {
    return runCli(
      ['apply', 'flaky', '--test-command', 'node -e process.exit(1)'],
      projectPath
    );
  }

  it('does not escalate on the first two failures', () => {
    const { projectPath } = createTempProject('strikes-early');

    const first = applyOnce(projectPath);
    expect(first.status).not.toBe(0);
    expect(first.stdout).not.toContain('consecutive failures');

    const second = applyOnce(projectPath);
    expect(second.status).not.toBe(0);
    expect(second.stdout).not.toContain('3 consecutive failures');
  });

  it('escalates on the third consecutive failure with architecture guidance', () => {
    const { projectPath, changeDir } = createTempProject('strikes-third');

    applyOnce(projectPath);
    applyOnce(projectPath);
    const third = applyOnce(projectPath);

    expect(third.status).not.toBe(0);
    expect(third.stdout).toContain('3 consecutive failures');
    expect(third.stdout).toContain('architecture');

    // Escalation evidence must be recorded for the fix-packet / handoff flow.
    const evidenceDir = path.join(changeDir, 'evidence');
    expect(fs.existsSync(evidenceDir)).toBe(true);
    const escalations = fs.readdirSync(evidenceDir).filter(f => f.startsWith('escalation-'));
    expect(escalations.length).toBeGreaterThan(0);
    const payload = JSON.parse(
      fs.readFileSync(path.join(evidenceDir, escalations[0]), 'utf8')
    );
    expect(payload.escalation.consecutiveFailures).toBeGreaterThanOrEqual(3);
    expect(payload.escalation.task).toContain('Stubborn feature');
  });

  it('keeps escalating on later consecutive failures', () => {
    const { projectPath } = createTempProject('strikes-fourth');

    for (let i = 0; i < 4; i++) applyOnce(projectPath);
    const fifth = applyOnce(projectPath);

    expect(fifth.stdout).toContain('consecutive failures');
  });

  it('resets the streak after a pass (legacy mode)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-threestrikes-reset-'));
    roots.push(root);
    const projectPath = path.join(root, 'reset');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'flaky');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001 Flaky task\n', 'utf8');

    const fail = cmd => runCli(['apply', 'flaky', '--test-command', cmd], projectPath);

    fail('node -e process.exit(1)');
    fail('node -e process.exit(1)');
    // A pass resets the streak.
    const passed = fail('node -e process.exit(0)');
    expect(passed.status).toBe(0);
    // Task marked done; a new failing task on the same change starts fresh.
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Flaky task\n- [ ] TASK-002 Next flaky task\n', 'utf8');
    const freshFail = fail('node -e process.exit(1)');
    expect(freshFail.stdout).not.toContain('3 consecutive failures');
  });
});
