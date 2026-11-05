/**
 * Tests for the ruling ledger (superpowers executing-plans: "Rulings, not
 * stalls" — every execution-time decision is recorded as
 * 决定 — 理由 — 出错了的代价, persisted as an artifact that survives context
 * compaction).
 *
 * stdd apply <change> --ruling "<text>" records a ruling; stdd plan feeds
 * the latest archived change's rulings back into the new task list.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { readRulings, appendRuling, RULINGS_FILENAME } = require('../src/utils/ruling-ledger');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

function createTempProject(name, changeName = 'demo') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-rulings-'));
  roots.push(root);
  const projectPath = path.join(root, name);
  const changeDir = path.join(projectPath, 'stdd', 'changes', changeName);
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001 Work\n', 'utf8');
  return { projectPath, changeDir };
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('ruling-ledger module', () => {
  it('exposes the ledger filename', () => {
    expect(RULINGS_FILENAME).toBe('rulings.md');
  });

  it('creates the ledger with sequential numbering and reads it back', () => {
    const { changeDir } = createTempProject('unit');
    const first = appendRuling(changeDir, 'Skip cache invalidation — rarely hit path — stale reads for up to 60s');
    const second = appendRuling(changeDir, 'Use SHA-256 over SHA-1 — spec requires it — none, both available');

    expect(first.n).toBe(1);
    expect(second.n).toBe(2);

    const content = fs.readFileSync(path.join(changeDir, RULINGS_FILENAME), 'utf8');
    expect(content).toContain('# Rulings');
    expect(content).toContain('- #1 [');
    expect(content).toContain('Skip cache invalidation');

    const state = readRulings(changeDir);
    expect(state.total).toBe(2);
    expect(state.entries[1].text).toContain('SHA-256');
  });

  it('reads an absent ledger as empty', () => {
    const { changeDir } = createTempProject('unit-empty');
    const state = readRulings(changeDir);
    expect(state.total).toBe(0);
    expect(state.entries).toEqual([]);
  });
});

describe('apply --ruling integration', () => {
  it('records a ruling and exits successfully without running tests', () => {
    const { projectPath, changeDir } = createTempProject('cli');

    const result = runCli(['apply', 'demo', '--ruling', 'Inline the validator — spec is stable — copy needed if spec evolves'], projectPath);

    expect(result.status).toBe(0);
    const content = fs.readFileSync(path.join(changeDir, RULINGS_FILENAME), 'utf8');
    expect(content).toContain('Inline the validator');
    // The task must remain untouched (ruling is a recording action).
    expect(fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8')).toContain('- [ ] TASK-001 Work');
  });
});

describe('plan feeds rulings back', () => {
  it('includes the latest archived change rulings in Previous Change Intelligence', () => {
    const { projectPath, changeDir } = createTempProject('cli-plan');
    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive', 'prev-20261101000000');
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(path.join(archiveDir, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');
    appendRuling(archiveDir, 'Prefer prepared statements — security rule — SQL injection risk otherwise');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal: Next\n\n## description\nNext feature\n', 'utf8');

    const result = runCli(['plan', 'demo'], projectPath);

    expect(result.status).toBe(0);
    const tasks = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
    expect(tasks).toContain('Recent Rulings');
    expect(tasks).toContain('Prefer prepared statements');
    expect(tasks).toContain('rulings.md');
  });
});
