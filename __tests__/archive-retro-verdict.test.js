/**
 * Tests for the retrospective verdict in archive summaries
 * (BMAD retrospective: accepted / accepted-with-open-items / rejected).
 *
 * The archived change's summary.md carries an explicit verdict computed
 * from the evidence: failed verification => rejected, open deferred items
 * => accepted-with-open-items, otherwise => accepted.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('archive retrospective verdict', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, extra = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-retro-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');
    if (extra.deferredOpen) {
      fs.writeFileSync(path.join(changeDir, 'deferred-work.md'),
        '# Deferred Work\n\n- [ ] #1 [2026-11-05] Still pending (source: verify)\n', 'utf8');
    }
    if (extra.verifyStatus) {
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'evidence', 'verify-100.json'),
        JSON.stringify({ status: extra.verifyStatus, results: {}, metadata: {} }), 'utf8');
    }
    return { projectPath, changeDir };
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  function archivedSummary(projectPath) {
    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    const archived = fs.readdirSync(archiveDir)[0];
    return fs.readFileSync(path.join(archiveDir, archived, 'summary.md'), 'utf8');
  }

  it('marks a clean change as accepted', () => {
    const { projectPath } = createTempProject('retro-clean', { verifyStatus: 'pass' });

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);
    const summary = archivedSummary(projectPath);
    expect(summary).toContain('Verdict: accepted');
  });

  it('marks a change with open deferred items as accepted-with-open-items', () => {
    const { projectPath } = createTempProject('retro-deferred', { verifyStatus: 'pass', deferredOpen: true });

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);
    const summary = archivedSummary(projectPath);
    expect(summary).toContain('Verdict: accepted-with-open-items');
  });

  it('marks a change with failed verification evidence as rejected', () => {
    const { projectPath } = createTempProject('retro-failed', { verifyStatus: 'fail' });

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);
    const summary = archivedSummary(projectPath);
    expect(summary).toContain('Verdict: rejected');
  });
});
