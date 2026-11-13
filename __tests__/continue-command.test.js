/**
 * ContinueCommand — enhanced unit tests
 * Tests updateTaskLine, findMostRecentActiveChange, readLastLogLine,
 * pickContinueTask, and execute with various scenarios.
 * Uses real temp directories — no fs mocks.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ContinueCommand } = require('../src/cli/commands/continue');
const { parseTasks } = require('../src/utils/change-utils');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir;

function createTempDir(prefix = 'stdd-continue-cmd-') {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return tmpDir;
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Build a complete stdd changes structure in tmpDir.
 * Returns { projectDir, stddDir, changeDir }
 */
function buildProject(changes = {}) {
  const projectDir = tmpDir;
  const stddDir = path.join(projectDir, 'stdd');
  fs.mkdirSync(stddDir, { recursive: true });
  fs.mkdirSync(path.join(stddDir, 'changes'), { recursive: true });

  for (const [name, opts = {}] of Object.entries(changes)) {
    const changeDir = path.join(stddDir, 'changes', name);
    fs.mkdirSync(changeDir, { recursive: true });

    if (opts.tasksContent) {
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), opts.tasksContent);
    }
    if (opts.applyLog) {
      fs.writeFileSync(path.join(changeDir, 'apply.log'), opts.applyLog);
    }
    if (opts.createSpecs) {
      fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    }
  }

  return { projectDir, stddDir };
}

// ---------------------------------------------------------------------------
// updateTaskLine
// ---------------------------------------------------------------------------

describe('ContinueCommand — updateTaskLine()', () => {
  beforeEach(() => createTempDir('stdd-update-task-'));
  afterEach(cleanup);

  it('updates a task checkbox from [ ] to [x]', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [ ] Task A\n- [ ] Task B\n');

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    cmd.updateTaskLine(tasksFile, tasks[0], 'x');

    const updated = fs.readFileSync(tasksFile, 'utf-8');
    expect(updated).toBe('- [x] Task A\n- [ ] Task B\n');
  });

  it('updates a task checkbox from [ ] to [~]', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [ ] Task A\n- [ ] Task B\n');

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    cmd.updateTaskLine(tasksFile, tasks[1], '~');

    const updated = fs.readFileSync(tasksFile, 'utf-8');
    expect(updated).toBe('- [ ] Task A\n- [~] Task B\n');
  });

  it('updates a task checkbox from [x] back to [ ]', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [x] Task A\n- [x] Task B\n');

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    cmd.updateTaskLine(tasksFile, tasks[0], ' ');

    const updated = fs.readFileSync(tasksFile, 'utf-8');
    expect(updated).toBe('- [ ] Task A\n- [x] Task B\n');
  });

  it('does nothing when task index is out of bounds', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [ ] Task A\n');

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();

    // Create a fake task with an out-of-bounds index
    const fakeTask = { ...tasks[0], index: 99 };
    const original = fs.readFileSync(tasksFile, 'utf-8');

    // Should not throw, just silently skip
    expect(() => cmd.updateTaskLine(tasksFile, fakeTask, 'x')).not.toThrow();
    expect(fs.readFileSync(tasksFile, 'utf-8')).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// readLastLogLine
// ---------------------------------------------------------------------------

describe('ContinueCommand — readLastLogLine()', () => {
  beforeEach(() => createTempDir('stdd-readlog-'));
  afterEach(cleanup);

  it('returns null when no apply.log exists', () => {
    const cmd = new ContinueCommand();
    expect(cmd.readLastLogLine(tmpDir)).toBeNull();
  });

  it('returns the last line of apply.log', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'apply.log'),
      '[2026-01-01T00:00:00.000Z] {"task":"A","status":"passed"}\n[2026-01-01T00:01:00.000Z] {"task":"B","status":"failed"}\n',
    );
    const cmd = new ContinueCommand();
    const line = cmd.readLastLogLine(tmpDir);
    expect(line).toContain('"task":"B"');
    expect(line).toContain('"status":"failed"');
  });

  it('returns the only line when log has a single entry', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'apply.log'),
      '[2026-01-01T00:00:00.000Z] {"task":"Solo","status":"passed"}\n',
    );
    const cmd = new ContinueCommand();
    expect(cmd.readLastLogLine(tmpDir)).toContain('"Solo"');
  });

  it('returns null when log file is empty', () => {
    fs.writeFileSync(path.join(tmpDir, 'apply.log'), '');
    const cmd = new ContinueCommand();
    expect(cmd.readLastLogLine(tmpDir)).toBeNull();
  });

  it('returns null when log file has only whitespace', () => {
    fs.writeFileSync(path.join(tmpDir, 'apply.log'), '  \n  \n');
    const cmd = new ContinueCommand();
    expect(cmd.readLastLogLine(tmpDir)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findMostRecentActiveChange
// ---------------------------------------------------------------------------

describe('ContinueCommand — findMostRecentActiveChange()', () => {
  beforeEach(() => createTempDir('stdd-findchange-'));
  afterEach(cleanup);

  it('returns null when no changes exist', () => {
    buildProject({});
    const cmd = new ContinueCommand();
    const stddDir = path.join(tmpDir, 'stdd');
    expect(cmd.findMostRecentActiveChange(stddDir)).toBeNull();
  });

  it('returns null when all changes have no tasks.md', () => {
    buildProject({ 'change-a': { createSpecs: true } });
    const cmd = new ContinueCommand();
    const stddDir = path.join(tmpDir, 'stdd');
    expect(cmd.findMostRecentActiveChange(stddDir)).toBeNull();
  });

  it('returns null when all tasks are done', () => {
    buildProject({
      'done-change': {
        tasksContent: '- [x] Task A\n- [x] Task B\n',
        createSpecs: true,
      },
    });
    const cmd = new ContinueCommand();
    const stddDir = path.join(tmpDir, 'stdd');
    expect(cmd.findMostRecentActiveChange(stddDir)).toBeNull();
  });

  it('returns the change with pending tasks', () => {
    buildProject({
      'active-change': {
        tasksContent: '- [x] Done\n- [ ] Pending\n',
        createSpecs: true,
      },
    });
    const cmd = new ContinueCommand();
    const stddDir = path.join(tmpDir, 'stdd');
    const result = cmd.findMostRecentActiveChange(stddDir);
    expect(result).toBeTruthy();
    expect(result).toContain('active-change');
  });

  it('prefers the change with apply.log sorted by mtime descending', () => {
    buildProject({
      'older-change': {
        tasksContent: '- [ ] Old pending\n',
        createSpecs: true,
      },
      'newer-change': {
        tasksContent: '- [ ] New pending\n',
        createSpecs: true,
      },
    });

    // Give newer-change a more recent apply.log
    const now = Date.now();
    fs.writeFileSync(
      path.join(tmpDir, 'stdd', 'changes', 'older-change', 'apply.log'),
      '[2026-01-01T00:00:00.000Z] {"task":"A"}\n',
    );
    // Manipulate mtime
    const olderPath = path.join(tmpDir, 'stdd', 'changes', 'older-change', 'apply.log');
    fs.utimesSync(olderPath, new Date(now - 5000), new Date(now - 5000));

    fs.writeFileSync(
      path.join(tmpDir, 'stdd', 'changes', 'newer-change', 'apply.log'),
      '[2026-01-01T00:00:00.000Z] {"task":"B"}\n',
    );
    const newerPath = path.join(tmpDir, 'stdd', 'changes', 'newer-change', 'apply.log');
    fs.utimesSync(newerPath, new Date(now), new Date(now));

    const cmd = new ContinueCommand();
    const stddDir = path.join(tmpDir, 'stdd');
    const result = cmd.findMostRecentActiveChange(stddDir);
    expect(result).toContain('newer-change');
  });

  it('skips archive and dot directories', () => {
    buildProject({
      'archive': {
        tasksContent: '- [ ] Should skip\n',
        createSpecs: true,
      },
      '.hidden': {
        tasksContent: '- [ ] Should skip\n',
        createSpecs: true,
      },
      'real': {
        tasksContent: '- [ ] Real task\n',
        createSpecs: true,
      },
    });

    const cmd = new ContinueCommand();
    const stddDir = path.join(tmpDir, 'stdd');
    const result = cmd.findMostRecentActiveChange(stddDir);
    expect(result).toContain('real');
    expect(result).not.toContain('archive');
    expect(result).not.toContain('.hidden');
  });

  it('returns a change without apply.log when it has pending tasks', () => {
    buildProject({
      'no-log': {
        tasksContent: '- [ ] Do something\n',
        createSpecs: true,
      },
    });
    const cmd = new ContinueCommand();
    const stddDir = path.join(tmpDir, 'stdd');
    const result = cmd.findMostRecentActiveChange(stddDir);
    expect(result).toContain('no-log');
  });
});

// ---------------------------------------------------------------------------
// pickContinueTask
// ---------------------------------------------------------------------------

describe('ContinueCommand — pickContinueTask()', () => {
  beforeEach(() => createTempDir('stdd-picktask-'));
  afterEach(cleanup);

  it('picks in-progress task (status ~) first', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [ ] Pending\n- [~] In progress\n');
    const tasks = parseTasks(tasksFile);

    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir);
    expect(picked.description).toBe('In progress');
    expect(picked.status).toBe('~');
  });

  it('picks failed task from apply.log when no in-progress task exists', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [ ] Task Alpha\n- [ ] Task Beta\n');

    fs.writeFileSync(
      path.join(tmpDir, 'apply.log'),
      '[2026-01-01T00:00:00.000Z] {"change":"c1","task":"Task Beta","command":"npm test","status":"failed"}\n',
    );

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir);
    expect(picked.description).toBe('Task Beta');
  });

  it('matches the failed task across [phase:*] markers (taskKey correlation)', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    // TASK-002 is first: a verbatim fallback would pick it, the taskKey
    // match must pick TASK-001 despite its phase marker.
    fs.writeFileSync(tasksFile, '- [ ] TASK-002 Other\n- [ ] [phase:green] TASK-001 Build feature\n');

    fs.writeFileSync(
      path.join(tmpDir, 'apply.log'),
      '[2026-01-01T00:00:00.000Z] {"change":"c1","task":"[phase:red] TASK-001 Build feature","command":"npm test","status":"failed"}\n',
    );

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir);
    expect(picked.description).toContain('TASK-001');
  });

  it('falls back to first pending task when no log entry matches', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [ ] First\n- [ ] Second\n');

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir);
    expect(picked.description).toBe('First');
  });

  it('returns null when all tasks are done', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [x] Done A\n- [x] Done B\n');

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    expect(cmd.pickContinueTask(tasks, tmpDir)).toBeNull();
  });

  it('in force mode, picks task matching last log entry', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [x] Done A\n- [x] Done B\n');

    fs.writeFileSync(
      path.join(tmpDir, 'apply.log'),
      '[2026-01-01T00:00:00.000Z] {"change":"c1","task":"Done B","command":"npm test","status":"passed"}\n',
    );

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir, { force: true });
    expect(picked.description).toBe('Done B');
  });

  it('in force mode, matches the last log entry across [phase:*] markers', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    // Verbatim matching would miss and fall back to the last done task
    // (TASK-002); the taskKey match must pick TASK-001.
    fs.writeFileSync(tasksFile, '- [x] [phase:done] TASK-001 Build feature\n- [x] TASK-002 Other done\n');

    fs.writeFileSync(
      path.join(tmpDir, 'apply.log'),
      '[2026-01-01T00:00:00.000Z] {"change":"c1","task":"TASK-001: Build feature [phase:green]","command":"npm test","status":"passed"}\n',
    );

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir, { force: true });
    expect(picked.description).toContain('TASK-001');
  });

  it('in force mode, picks last done task when no log exists', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [x] Done A\n- [x] Done B\n');

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir, { force: true });
    expect(picked.description).toBe('Done B');
  });

  it('in force mode with no done tasks and no log, falls back to first pending', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [ ] Pending\n');

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir, { force: true });
    expect(picked).not.toBeNull();
    expect(picked.description).toBe('Pending');
  });

  it('ignores malformed log lines gracefully', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [ ] Task A\n');

    fs.writeFileSync(
      path.join(tmpDir, 'apply.log'),
      'this is not valid json at all\n',
    );

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir);
    // Should fall through to first pending task
    expect(picked.description).toBe('Task A');
  });

  it('ignores log line with status != failed when looking for failed task', () => {
    const tasksFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(tasksFile, '- [ ] First\n- [ ] Second\n');

    fs.writeFileSync(
      path.join(tmpDir, 'apply.log'),
      '[2026-01-01T00:00:00.000Z] {"change":"c1","task":"Second","command":"npm test","status":"passed"}\n',
    );

    const tasks = parseTasks(tasksFile);
    const cmd = new ContinueCommand();
    const picked = cmd.pickContinueTask(tasks, tmpDir);
    // Log says "passed", so we should not prioritize Second — fall back to first pending
    expect(picked.description).toBe('First');
  });
});

// ---------------------------------------------------------------------------
// execute — error conditions
// ---------------------------------------------------------------------------

describe('ContinueCommand — execute() error conditions', () => {
  beforeEach(() => createTempDir('stdd-exec-err-'));
  afterEach(cleanup);

  it('throws when stdd/ does not exist', async () => {
    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    await expect(cmd.execute()).rejects.toThrow('STDD not initialized');

    process.chdir(originalCwd);
  });

  it('throws when no change name given and no active changes exist', async () => {
    buildProject({});

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    await expect(cmd.execute()).rejects.toThrow('No active changes found');

    process.chdir(originalCwd);
  });

  it('throws when specified change name does not exist', async () => {
    buildProject({
      'existing': { tasksContent: '- [ ] Task\n', createSpecs: true },
    });

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    await expect(cmd.execute('nonexistent')).rejects.toThrow("Change 'nonexistent' not found");

    process.chdir(originalCwd);
  });

  it('throws when tasks.md is missing in the change', async () => {
    buildProject({
      'no-tasks': { createSpecs: true },
    });

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    await expect(cmd.execute('no-tasks')).rejects.toThrow('tasks.md not found');

    process.chdir(originalCwd);
  });

  it('throws when tasks.md has no parseable tasks', async () => {
    buildProject({
      'empty-tasks': {
        tasksContent: '# Just a heading\nSome text without checkboxes\n',
        createSpecs: true,
      },
    });

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    await expect(cmd.execute('empty-tasks')).rejects.toThrow('No tasks found');

    process.chdir(originalCwd);
  });

  it('reports all tasks completed when everything is done', async () => {
    buildProject({
      'all-done': {
        tasksContent: '- [x] Done A\n- [x] Done B\n',
        createSpecs: true,
      },
    });

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await cmd.execute('all-done');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('All tasks completed'));
    logSpy.mockRestore();

    process.chdir(originalCwd);
  });
});

// ---------------------------------------------------------------------------
// execute — auto-detect change
// ---------------------------------------------------------------------------

describe('ContinueCommand — execute() auto-detect', () => {
  beforeEach(() => createTempDir('stdd-exec-auto-'));
  afterEach(cleanup);

  it('auto-detects the most recent active change when no name is given', async () => {
    buildProject({
      'active-change': {
        tasksContent: '- [ ] Pending task\n',
        createSpecs: true,
      },
    });

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    // This will delegate to ApplyCommand — but since there's no test command or package.json,
    // it should still proceed and show the task name
    try {
      await cmd.execute(undefined, { testCommand: 'true' });
    } catch (e) {
      // ApplyCommand might throw if it can't find things — that's fine,
      // we just want to confirm it found the right change
    }

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('active-change'));

    logSpy.mockRestore();
    process.chdir(originalCwd);
  });
});

// ---------------------------------------------------------------------------
// updateTaskLine — error path
// ---------------------------------------------------------------------------

describe('ContinueCommand — updateTaskLine() error path', () => {
  beforeEach(() => createTempDir('stdd-update-err-'));
  afterEach(cleanup);

  it('throws when the file does not exist', () => {
    const cmd = new ContinueCommand();
    const fakePath = path.join(tmpDir, 'nonexistent-tasks.md');
    const fakeTask = { index: 0 };
    expect(() => cmd.updateTaskLine(fakePath, fakeTask, 'x')).toThrow(
      /Failed to update task/,
    );
  });
});

// ---------------------------------------------------------------------------
// findMostRecentActiveChange — edge cases
// ---------------------------------------------------------------------------

describe('ContinueCommand — findMostRecentActiveChange() edge cases', () => {
  beforeEach(() => createTempDir('stdd-findchange-edge-'));
  afterEach(cleanup);

  it('returns null when changes directory does not exist', () => {
    const stddDir = path.join(tmpDir, 'stdd');
    fs.mkdirSync(stddDir, { recursive: true });
    // No changes/ directory
    const cmd = new ContinueCommand();
    expect(cmd.findMostRecentActiveChange(stddDir)).toBeNull();
  });

  it('returns null when tasks.md has no parseable task lines', () => {
    buildProject({
      'empty-parse': {
        tasksContent: '# Just a heading\nNo checkboxes here\n',
        createSpecs: true,
      },
    });
    const cmd = new ContinueCommand();
    const stddDir = path.join(tmpDir, 'stdd');
    expect(cmd.findMostRecentActiveChange(stddDir)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// execute — force mode with all done (selectedTask reset)
// ---------------------------------------------------------------------------

describe('ContinueCommand — execute() force mode', () => {
  let savedCwd;
  beforeEach(() => {
    savedCwd = process.cwd();
    createTempDir('stdd-exec-force-');
  });
  afterEach(() => {
    process.chdir(savedCwd);
    cleanup();
  });

  it('in force mode, bypasses all-done check and resets done task to pending', async () => {
    buildProject({
      'force-reset': {
        tasksContent: '- [x] Done A\n- [x] Done B\n',
        createSpecs: true,
      },
    });

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await cmd.execute('force-reset', { force: true, testCommand: 'true' });
    } catch (e) {
      // ApplyCommand may throw — acceptable
    }

    // Should have printed the change name (bypasses the all-done early return)
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('force-reset'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Continuing change'));

    logSpy.mockRestore();
    process.chdir(originalCwd);
  });

  it('in force mode with all done, delegates to ApplyCommand', async () => {
    buildProject({
      'force-disk': {
        tasksContent: '- [x] Completed task\n',
        createSpecs: true,
      },
    });

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await cmd.execute('force-disk', { force: true, testCommand: 'true' });
    } catch (e) {
      // ApplyCommand may throw — acceptable
    }

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('force-disk'));

    logSpy.mockRestore();
    process.chdir(originalCwd);
  });

  it('reports all tasks completed when selectedTask is null and force is true', async () => {
    // Force mode, all done, but pickContinueTask returns null somehow
    // This can happen when all tasks are done and there is no log and no doneTasks
    // Since done tasks exist, pickContinueTask returns them. So let's use
    // a scenario where execute is called on an all-done change with force=true
    // but pickContinueTask is mocked to return null.
    buildProject({
      'force-null': {
        tasksContent: '- [x] Task A\n',
        createSpecs: true,
      },
    });

    const cmd = new ContinueCommand();
    // Mock pickContinueTask to return null
    cmd.pickContinueTask = jest.fn().mockReturnValue(null);

    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await cmd.execute('force-null', { force: true });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('All tasks completed'));

    logSpy.mockRestore();
    process.chdir(originalCwd);
  });
});

// ---------------------------------------------------------------------------
// execute — previous failure summary display
// ---------------------------------------------------------------------------

describe('ContinueCommand — execute() failure summary', () => {
  let savedCwd;
  beforeEach(() => {
    savedCwd = process.cwd();
    createTempDir('stdd-exec-fail-');
  });
  afterEach(() => {
    process.chdir(savedCwd);
    cleanup();
  });

  it('displays previous failure summary from apply.log', async () => {
    buildProject({
      'fail-summary': {
        tasksContent: '- [ ] Task Alpha\n- [ ] Task Beta\n',
        applyLog:
          '[2026-01-01T00:00:00.000Z] {"change":"c1","task":"Task Beta","command":"npm test","status":"failed"}\n',
        createSpecs: true,
      },
    });

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await cmd.execute('fail-summary', { testCommand: 'true' });
    } catch (e) {
      // ApplyCommand may throw — acceptable
    }

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Previous failure detected'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Task Beta'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('npm test'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying'));

    logSpy.mockRestore();
    process.chdir(originalCwd);
  });

  it('handles malformed log in execute failure-summary section', async () => {
    buildProject({
      'bad-log': {
        tasksContent: '- [ ] Task A\n',
        applyLog: 'not valid json at all\n',
        createSpecs: true,
      },
    });

    const cmd = new ContinueCommand();
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await cmd.execute('bad-log', { testCommand: 'true' });
    } catch (e) {
      // ApplyCommand may throw — acceptable
    }

    // Should NOT show "Previous failure detected" since log is malformed
    const failureCalls = logSpy.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('Previous failure'),
    );
    expect(failureCalls.length).toBe(0);

    logSpy.mockRestore();
    process.chdir(originalCwd);
  });
});
