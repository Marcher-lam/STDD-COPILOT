const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('continue CLI command', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, options = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-continue-test-'));
    const projectPath = path.join(root, name);
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', options.changeDir || 'demo', 'specs'), { recursive: true });

    const tasksContent = options.tasksContent || `- [ ] TASK-001 Write unit tests\n- [ ] TASK-002 Implement login logic`;
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', options.changeDir || 'demo', 'tasks.md'),
      tasksContent
    );

    if (options.packageJson) {
      fs.writeFileSync(
        path.join(projectPath, 'package.json'),
        JSON.stringify(options.packageJson)
      );
    }

    if (options.applyLog) {
      fs.writeFileSync(
        path.join(projectPath, 'stdd', 'changes', options.changeDir || 'demo', 'apply.log'),
        options.applyLog
      );
    }

    return projectPath;
  }

  /**
   * Case 1: Simulate a [~] in-progress task, run continue, expect it calls apply and succeeds.
   */
  it('resumes an in-progress task and marks it complete on test success', () => {
    const projectPath = createTempProject('continue-inprogress', {
      tasksContent: '- [x] TASK-001 Setup\n- [~] TASK-002 Implement feature\n- [ ] TASK-003 Write tests\n',
    });

    const result = runCli(['continue', 'demo', '--test-command', 'true', '--allow-no-tests'], projectPath);

    expect(result.stdout).toContain('Continuing change: demo');
    expect(result.stdout).toContain('TASK-002');
    expect(result.stdout).toContain('Task passed tests');

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    expect(tasksContent).toContain('- [x] TASK-002');
    // TASK-003 should still be pending
    expect(tasksContent).toContain('- [ ] TASK-003');
  });

  /**
   * Case 2: Simulate an apply.log with a failure record, but tasks.md reverted to [ ].
   * Expect it to identify this as the failed task and retry it.
   */
  it('identifies failed task from apply.log when tasks.md shows [ ]', () => {
    const failedLogLine = `[2026-05-12T10:00:00.000Z] {"change":"demo","task":"TASK-002 Implement feature","command":"npm test","status":"failed"}\n`;
    const projectPath = createTempProject('continue-failed-log', {
      tasksContent: '- [x] TASK-001 Setup\n- [ ] TASK-002 Implement feature\n- [ ] TASK-003 Write tests\n',
      applyLog: failedLogLine,
    });

    const result = runCli(['continue', 'demo', '--test-command', 'true', '--allow-no-tests'], projectPath);

    expect(result.stdout).toContain('Previous failure detected');
    expect(result.stdout).toContain('TASK-002 Implement feature');
    expect(result.stdout).toContain('Retrying');
    expect(result.stdout).toContain('Task passed tests');

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    expect(tasksContent).toContain('- [x] TASK-002');
  });

  it('auto-detects the most recent active change when no name is given', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-continue-autodetect-'));
    const projectPath = path.join(root, 'autodetect-project');

    // Create two changes, one with all tasks done, one with pending
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'old-change', 'specs'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'stdd', 'changes', 'old-change', 'tasks.md'), '- [x] TASK-001 Done\n');

    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'new-change', 'specs'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'stdd', 'changes', 'new-change', 'tasks.md'), '- [ ] TASK-001 Pending\n');

    const result = runCli(['continue', '--test-command', 'true'], projectPath);

    expect(result.stdout).toContain('Continuing change: new-change');
    expect(result.stdout).toContain('TASK-001 Pending');
  });

  it('reports "all tasks completed" when nothing is pending', () => {
    const projectPath = createTempProject('all-done', {
      tasksContent: '- [x] TASK-001 Done\n- [x] TASK-002 Also done\n',
    });

    const result = runCli(['continue', 'demo'], projectPath);

    expect(result.stdout).toContain('All tasks completed');
    expect(result.stdout).toContain('stdd verify');
  });

  it('force retries the last completed task', () => {
    const logLine = `[2026-05-12T10:00:00.000Z] {"change":"demo","task":"TASK-002 Implement login logic","command":"npm test","status":"passed"}\n`;
    const projectPath = createTempProject('force-retry', {
      tasksContent: '- [x] TASK-001 Write unit tests\n- [x] TASK-002 Implement login logic\n',
      applyLog: logLine,
    });

    const result = runCli(['continue', 'demo', '--force', '--test-command', 'true', '--allow-no-tests'], projectPath);

    expect(result.stdout).toContain('Continuing change: demo');
    expect(result.stdout).toContain('TASK-002');
    expect(result.stdout).toContain('Task passed tests');

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    expect(tasksContent).toContain('- [x] TASK-002');
  });

  it('errors when STDD is not initialized', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-continue-uninit-'));
    const projectPath = path.join(root, 'uninit');
    fs.mkdirSync(projectPath, { recursive: true });

    const result = runCli(['continue'], projectPath);

    expect(result.stderr).toContain('STDD not initialized');
    expect(result.status).toBe(1);
  });

  it('errors when no active changes exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-continue-nochanges-'));
    const projectPath = path.join(root, 'no-changes');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });

    const result = runCli(['continue'], projectPath);

    expect(result.stderr).toContain('No active changes found');
    expect(result.status).toBe(1);
  });

  it('errors when specified change does not exist', () => {
    const projectPath = createTempProject('missing-change');

    const result = runCli(['continue', 'nonexistent'], projectPath);

    expect(result.stderr).toContain("Change 'nonexistent' not found");
    expect(result.status).toBe(1);
  });

  it('selects first pending task when all are [ ] and no log exists', () => {
    const projectPath = createTempProject('first-pending', {
      tasksContent: '- [ ] TASK-001 First task\n- [ ] TASK-002 Second task\n',
    });

    const result = runCli(['continue', 'demo', '--test-command', 'true', '--allow-no-tests'], projectPath);

    expect(result.stdout).toContain('TASK-001');
    expect(result.stdout).toContain('Task passed tests');
  });

  it('supports dry-run mode', () => {
    const projectPath = createTempProject('dry-run-continue', {
      tasksContent: '- [~] TASK-001 In progress\n',
    });

    const result = runCli(['continue', 'demo', '--dry-run'], projectPath);

    expect(result.stdout).toContain('TASK-001');
    expect(result.stdout).toContain('Dry run mode');
  });
});
