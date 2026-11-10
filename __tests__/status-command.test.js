/**
 * Tests for StatusCommand.execute() and edge cases not covered by status-unit.test.js.
 *
 * status-unit.test.js covers: getProgressBar, getDetailedStatus, buildOverallStatusPayload,
 * showOverallStatus, showChangeStatus, countItems, getActiveChanges.
 *
 * This file covers:
 *   - execute() routing (no changeName -> showOverallStatus, with changeName -> showChangeStatus)
 *   - exists() with non-ENOENT errors (EACCES)
 *   - getDetailedStatus with non-silent read errors
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { StatusCommand } = require('../src/cli/commands/status');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.dim = fn;
  fn.red = fn;
  return fn;
});

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-status-cmd-'));
}

function makeStddDir(root) {
  const stdd = path.join(root, 'stdd');
  fs.mkdirSync(path.join(stdd, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(stdd, 'changes'), { recursive: true });
  fs.mkdirSync(path.join(stdd, 'memory'), { recursive: true });
  fs.writeFileSync(path.join(stdd, 'config.yaml'), 'version: 1\n');
  return stdd;
}

function makeChange(stddDir, name, opts = {}) {
  const dir = path.join(stddDir, 'changes', name);
  fs.mkdirSync(dir, { recursive: true });
  if (opts.proposal) {
    fs.writeFileSync(path.join(dir, 'proposal.md'), opts.proposal);
  }
  if (opts.specs) {
    const specsDir = path.join(dir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'feature.md'), opts.specs);
  }
  if (opts.design) {
    fs.writeFileSync(path.join(dir, 'design.md'), opts.design);
  }
  if (opts.tasks) {
    fs.writeFileSync(path.join(dir, 'tasks.md'), opts.tasks);
  }
  return dir;
}

describe('StatusCommand.execute()', () => {
  let cmd;
  let logSpy;
  let origCwd;

  beforeEach(() => {
    cmd = new StatusCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    origCwd = process.cwd();
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.chdir(origCwd);
  });

  // --- execute() with no changeName routes to showOverallStatus ---

  it('delegates to showOverallStatus when no changeName provided', async () => {
    const root = makeTmp();
    const stdd = makeStddDir(root);
    const projectPath = path.dirname(stdd);
    process.chdir(projectPath);

    // Create a change so we get meaningful output
    makeChange(stdd, 'test-change', { proposal: '# Proposal: Test\n' });

    await cmd.execute();

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('STDD initialized');
    expect(output).toContain('Specs');

    fs.rmSync(root, { recursive: true, force: true });
  });

  it('delegates to showOverallStatus with json option', async () => {
    const root = makeTmp();
    const stdd = makeStddDir(root);
    const projectPath = path.dirname(stdd);
    process.chdir(projectPath);

    fs.writeFileSync(path.join(stdd, 'specs', 'auth.md'), '');

    await cmd.execute(undefined, { json: true });

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const json = JSON.parse(output);
    expect(json.initialized).toBe(true);
    expect(json.specs).toBe(1);

    fs.rmSync(root, { recursive: true, force: true });
  });

  // --- execute() with changeName routes to showChangeStatus ---

  it('delegates to showChangeStatus when changeName provided', async () => {
    const root = makeTmp();
    const stdd = makeStddDir(root);
    const projectPath = path.dirname(stdd);
    process.chdir(projectPath);

    makeChange(stdd, 'my-change', {
      proposal: '# Proposal: My Feature\n',
      tasks: '- [x] Task 1\n',
    });

    await cmd.execute('my-change');

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('my-change');
    expect(output).toContain('proposal.md');

    fs.rmSync(root, { recursive: true, force: true });
  });

  it('delegates to showChangeStatus with json option', async () => {
    const root = makeTmp();
    const stdd = makeStddDir(root);
    const projectPath = path.dirname(stdd);
    process.chdir(projectPath);

    makeChange(stdd, 'json-change', {
      proposal: '# Proposal: JSON Test\n',
      specs: 'Feature: X\n',
    });

    await cmd.execute('json-change', { json: true });

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const json = JSON.parse(output);
    expect(json.change).toBe('json-change');
    expect(json.hasProposal).toBe(true);
    expect(json.hasSpecs).toBe(true);

    fs.rmSync(root, { recursive: true, force: true });
  });

  // --- execute() propagates errors from showChangeStatus ---

  it('throws when changeName does not exist', async () => {
    const root = makeTmp();
    const stdd = makeStddDir(root);
    const projectPath = path.dirname(stdd);
    process.chdir(projectPath);

    await expect(cmd.execute('nonexistent')).rejects.toThrow("Change 'nonexistent' not found.");

    fs.rmSync(root, { recursive: true, force: true });
  });

  // --- execute() with options forwarded correctly ---

  it('passes options to showOverallStatus', async () => {
    const root = makeTmp();
    // Do NOT initialize -- so JSON output says initialized: false
    const projectPath = path.join(root, 'empty');
    fs.mkdirSync(projectPath, { recursive: true });
    process.chdir(projectPath);

    await cmd.execute(undefined, { json: true });

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const json = JSON.parse(output);
    expect(json.initialized).toBe(false);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it('passes options to showChangeStatus', async () => {
    const root = makeTmp();
    const stdd = makeStddDir(root);
    const projectPath = path.dirname(stdd);
    process.chdir(projectPath);

    makeChange(stdd, 'opt-test', {
      proposal: '# Proposal: Opts\n',
      design: '# Design\n',
      tasks: '- [x] Done\n',
    });

    await cmd.execute('opt-test', { json: true });

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const json = JSON.parse(output);
    expect(json.hasDesign).toBe(true);

    fs.rmSync(root, { recursive: true, force: true });
  });
});

// --- exists() edge cases ---

describe('StatusCommand.exists() edge cases', () => {
  let cmd;
  let errorSpy;

  beforeEach(() => {
    cmd = new StatusCommand();
    errorSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('returns true for an existing path', async () => {
    const root = makeTmp();
    const filePath = path.join(root, 'exists.txt');
    fs.writeFileSync(filePath, 'test');

    const result = await cmd.exists(filePath);
    expect(result).toBe(true);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it('returns false for ENOENT', async () => {
    const result = await cmd.exists('/nonexistent/path/file.txt');
    expect(result).toBe(false);
  });

  it('returns false and logs warning for EACCES error', async () => {
    // We need to simulate EACCES without actually changing permissions
    // Mock fs.access to throw EACCES
    const fsPromises = require('fs').promises;
    const origAccess = fsPromises.access;
    fsPromises.access = jest.fn().mockRejectedValue(
      Object.assign(new Error('permission denied'), { code: 'EACCES' })
    );

    const result = await cmd.exists('/some/path');
    expect(result).toBe(false);
    // EACCES now logs a warning via structured logger
    expect(errorSpy).toHaveBeenCalled();

    fsPromises.access = origAccess;
  });

  it('returns false and logs warning for unexpected error code', async () => {
    const fsPromises = require('fs').promises;
    const origAccess = fsPromises.access;
    fsPromises.access = jest.fn().mockRejectedValue(
      Object.assign(new Error('unknown error'), { code: 'EIO' })
    );

    const result = await cmd.exists('/some/path');
    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalled();

    fsPromises.access = origAccess;
  });
});

// --- getDetailedStatus non-silent error handling ---

describe('StatusCommand.getDetailedStatus non-silent errors', () => {
  let cmd;
  let errorSpy;

  beforeEach(() => {
    cmd = new StatusCommand();
    errorSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs warning when proposal.md read fails with non-ENOENT in non-silent mode', async () => {
    const root = makeTmp();
    const dir = path.join(root, 'change');
    fs.mkdirSync(dir, { recursive: true });
    // Create a real proposal.md so access() succeeds
    fs.writeFileSync(path.join(dir, 'proposal.md'), '# Proposal: Test\n');

    const fsPromises = require('fs').promises;
    const origReadFile = fsPromises.readFile;

    // Only mock readFile to fail for proposal.md
    fsPromises.readFile = jest.fn().mockImplementation(async (p) => {
      if (typeof p === 'string' && p.includes('proposal.md')) {
        throw Object.assign(new Error('read error'), { code: 'EIO' });
      }
      return origReadFile.call(fsPromises, p);
    });

    const status = await cmd.getDetailedStatus(dir, { silent: false });

    // hasProposal is set to true BEFORE readFile, so it stays true
    // but title remains null since readFile failed
    expect(status.hasProposal).toBe(true);
    expect(status.title).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    const errorMsg = errorSpy.mock.calls.map(c => c[0]).join(' ');
    expect(errorMsg).toContain('read error');

    fsPromises.readFile = origReadFile;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('logs warning when specs/ read fails with non-ENOENT in non-silent mode', async () => {
    const root = makeTmp();
    const dir = path.join(root, 'change');
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'specs', 'test.md'), '');

    // Spec discovery walks with fs.readdirSync (file-walker); simulate an
    // unreadable specs/ directory on that path. Restore in finally so a
    // failed assertion cannot leak the mock into later tests.
    const fsCore = require('fs');
    const origReaddirSync = fsCore.readdirSync;
    fsCore.readdirSync = jest.fn(() => {
      throw Object.assign(new Error('read dir error'), { code: 'EACCES' });
    });

    try {
      const status = await cmd.getDetailedStatus(dir, { silent: false });

      expect(status.hasSpecs).toBe(false);
      // EACCES now logs a warning via structured logger (guard removed)
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      fsCore.readdirSync = origReaddirSync;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not log warnings in silent mode for ENOENT errors', async () => {
    // Use a fresh command instance to avoid mock leakage
    const freshCmd = new StatusCommand();
    const root = makeTmp();
    const dir = path.join(root, 'silent-change');
    fs.mkdirSync(dir, { recursive: true });
    // Ensure no proposal.md, no specs/, no design.md, no tasks.md

    const status = await freshCmd.getDetailedStatus(dir, { silent: true });

    expect(status.hasProposal).toBe(false);
    expect(status.hasSpecs).toBe(false);
    expect(status.hasDesign).toBe(false);
    expect(status.hasTasks).toBe(false);
    // Silent mode suppresses all warnings
    expect(errorSpy).not.toHaveBeenCalled();

    fs.rmSync(root, { recursive: true, force: true });
  });
});

// --- countItems edge cases ---

describe('StatusCommand.countItems edge cases', () => {
  let cmd;
  let errorSpy;

  beforeEach(() => {
    cmd = new StatusCommand();
    errorSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('returns 0 and logs warning for EACCES error', async () => {
    const fsPromises = require('fs').promises;
    const origReaddir = fsPromises.readdir;
    fsPromises.readdir = jest.fn().mockRejectedValue(
      Object.assign(new Error('access denied'), { code: 'EACCES' })
    );

    const count = await cmd.countItems('/some/dir');
    expect(count).toBe(0);
    // EACCES now logs a warning via structured logger
    expect(errorSpy).toHaveBeenCalled();

    fsPromises.readdir = origReaddir;
  });

  it('returns 0 and logs warning for unexpected error code', async () => {
    const fsPromises = require('fs').promises;
    const origReaddir = fsPromises.readdir;
    fsPromises.readdir = jest.fn().mockRejectedValue(
      Object.assign(new Error('io error'), { code: 'EIO' })
    );

    const count = await cmd.countItems('/some/dir');
    expect(count).toBe(0);
    expect(errorSpy).toHaveBeenCalled();

    fsPromises.readdir = origReaddir;
  });
});

// --- getActiveChanges edge cases ---

describe('StatusCommand.getActiveChanges edge cases', () => {
  let cmd;
  let errorSpy;

  beforeEach(() => {
    cmd = new StatusCommand();
    errorSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('returns empty and logs warning for unexpected error', async () => {
    const fsPromises = require('fs').promises;
    const origReaddir = fsPromises.readdir;
    fsPromises.readdir = jest.fn().mockRejectedValue(
      Object.assign(new Error('unexpected'), { code: 'EIO' })
    );

    const changes = await cmd.getActiveChanges('/some/dir');
    expect(changes).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    fsPromises.readdir = origReaddir;
  });

  it('filters out regular files (only returns directories)', async () => {
    const root = makeTmp();
    const changesDir = path.join(root, 'changes');
    fs.mkdirSync(changesDir, { recursive: true });
    fs.mkdirSync(path.join(changesDir, 'feat-a'), { recursive: true });
    fs.writeFileSync(path.join(changesDir, 'readme.txt'), 'not a dir');

    const changes = await cmd.getActiveChanges(changesDir);
    expect(changes).toEqual(['feat-a']);

    fs.rmSync(root, { recursive: true, force: true });
  });
});
