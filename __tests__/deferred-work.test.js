/**
 * Tests for the deferred-work ledger (BMAD deferred-work + loop-sweep).
 *
 * verify --defer "<finding>" records work deferred during verification;
 * verify --resolve <n> closes an entry; verify runs surface the open count;
 * archive warns (without blocking) when open items are carried into the
 * archive.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const {
  readDeferred,
  appendDeferred,
  resolveDeferred,
  DEFERRED_FILENAME,
} = require('../src/utils/deferred-work');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

function createTempProject(name, changeName) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-deferred-'));
  roots.push(root);
  const projectPath = path.join(root, name);
  const changeDir = path.join(projectPath, 'stdd', 'changes', changeName);
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');
  // D02: archive requires fresh passing verify evidence.
  const evidenceDir = path.join(changeDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceDir, 'verify-1000000000.json'),
    JSON.stringify({ type: 'verify', status: 'pass', results: {}, metadata: {} })
  );
  return { projectPath, changeDir };
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('deferred-work module', () => {
  it('exposes the ledger filename', () => {
    expect(DEFERRED_FILENAME).toBe('deferred-work.md');
  });

  it('creates the ledger with a header and sequential numbering', () => {
    const { changeDir } = createTempProject('unit', 'demo');
    const first = appendDeferred(changeDir, 'Refactor error handling', 'verify');
    const second = appendDeferred(changeDir, 'Add integration test for billing', 'verify');

    expect(first.n).toBe(1);
    expect(second.n).toBe(2);

    const content = fs.readFileSync(path.join(changeDir, DEFERRED_FILENAME), 'utf8');
    expect(content).toContain('# Deferred Work');
    expect(content).toContain('- [ ] #1 [');
    expect(content).toContain('] Refactor error handling (source: verify)');
    expect(content).toContain('- [ ] #2 [');
    expect(content).toContain('] Add integration test for billing (source: verify)');
  });

  it('reads open and total counts', () => {
    const { changeDir } = createTempProject('unit', 'demo');
    appendDeferred(changeDir, 'One', 'verify');
    appendDeferred(changeDir, 'Two', 'verify');
    resolveDeferred(changeDir, 1);

    const state = readDeferred(changeDir);
    expect(state.total).toBe(2);
    expect(state.open).toBe(1);
    expect(state.entries[0].checked).toBe(true);
    expect(state.entries[1].checked).toBe(false);
  });

  it('resolves entries by number and reports unknown numbers', () => {
    const { changeDir } = createTempProject('unit', 'demo');
    appendDeferred(changeDir, 'One', 'verify');

    const ok = resolveDeferred(changeDir, 1);
    expect(ok.resolved).toBe(true);
    const content = fs.readFileSync(path.join(changeDir, DEFERRED_FILENAME), 'utf8');
    expect(content).toContain('- [x] #1');

    const missing = resolveDeferred(changeDir, 42);
    expect(missing.resolved).toBe(false);
    expect(missing.reason).toContain('42');
  });

  it('reads an absent ledger as empty', () => {
    const { changeDir } = createTempProject('unit', 'demo');
    const state = readDeferred(changeDir);
    expect(state.total).toBe(0);
    expect(state.open).toBe(0);
    expect(state.entries).toEqual([]);
  });
});

describe('verify --defer / --resolve integration', () => {
  it('records a deferred finding from the CLI', () => {
    const { projectPath, changeDir } = createTempProject('cli', 'demo');
    const result = runCli(['verify', 'demo', '--defer', 'Refactor error handling'], projectPath);

    expect(result.status).toBe(0);
    const content = fs.readFileSync(path.join(changeDir, DEFERRED_FILENAME), 'utf8');
    expect(content).toContain('Refactor error handling');
  });

  it('closes an entry from the CLI', () => {
    const { projectPath, changeDir } = createTempProject('cli', 'demo');
    runCli(['verify', 'demo', '--defer', 'One', '--defer', 'Two'], projectPath);
    // Commander keeps only the last value for a repeatable string option in
    // this wiring, so defer one at a time.
    runCli(['verify', 'demo', '--defer', 'Two'], projectPath);

    const result = runCli(['verify', 'demo', '--resolve', '1'], projectPath);

    expect(result.status).toBe(0);
    const state = readDeferred(changeDir);
    expect(state.entries[0].checked).toBe(true);
  });

  it('surfaces open deferred items in the verification summary', () => {
    const { projectPath, changeDir } = createTempProject('cli', 'demo');
    appendDeferred(changeDir, 'Pending cleanup', 'verify');

    const result = runCli(['verify', 'demo', '--no-constitution'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Deferred');
    expect(result.stdout).toContain('1 open');
  });
});

describe('archive carries the deferred ledger', () => {
  it('warns about open deferred items but still archives', () => {
    const { projectPath, changeDir } = createTempProject('cli', 'demo');
    appendDeferred(changeDir, 'Still pending', 'verify');

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('deferred');
    // The ledger travels with the archived change.
    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    const archived = fs.readdirSync(archiveDir)[0];
    expect(fs.existsSync(path.join(archiveDir, archived, DEFERRED_FILENAME))).toBe(true);
  });

  it('does not warn when the ledger is absent or fully resolved', () => {
    const { projectPath, changeDir } = createTempProject('cli', 'demo');
    appendDeferred(changeDir, 'Done soon', 'verify');
    resolveDeferred(changeDir, 1);

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('deferred item');
  });
});
