/**
 * Tests for Previous Change Intelligence feedback in `stdd plan`
 * (BMAD create-story "PREVIOUS STORY INTELLIGENCE").
 *
 * When generating tasks.md, plan reads the most recently archived change
 * and feeds its still-open deferred-work items back into the new task list,
 * so deferred findings loop back instead of rotting in the archive.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('plan previous change intelligence', () => {
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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-plan-intel-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'next-feature');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, 'proposal.md'),
      '# Proposal: Next feature\n\n## description\nAdd the next feature\n',
      'utf8'
    );
    return { projectPath, changeDir };
  }

  function createArchivedChange(projectPath, archiveName, deferredLines) {
    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive', archiveName);
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(path.join(archiveDir, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');
    if (deferredLines) {
      fs.writeFileSync(path.join(archiveDir, 'deferred-work.md'), deferredLines, 'utf8');
    }
    return archiveDir;
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  it('feeds open deferred items from the latest archived change into tasks.md', () => {
    const { projectPath, changeDir } = createTempProject('intel-with-deferred');
    // Older archive entry.
    createArchivedChange(projectPath, 'older-20260101000000', null);
    // Latest archive entry with one open and one resolved deferred item.
    createArchivedChange(
      projectPath,
      'recent-20261104000000',
      [
        '# Deferred Work',
        '',
        '- [ ] #1 [2026-11-04] Add rate limiting later (source: verify)',
        '- [x] #2 [2026-11-04] Already handled (source: verify)',
        '',
      ].join('\n')
    );

    const result = runCli(['plan', 'next-feature'], projectPath);

    expect(result.status).toBe(0);
    const tasks = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
    expect(tasks).toContain('Previous Change Intelligence');
    expect(tasks).toContain('recent-20261104000000');
    expect(tasks).toContain('Add rate limiting later');
    // Resolved items must not leak back.
    expect(tasks).not.toContain('Already handled');
  });

  it('omits the section when the latest archive has no open deferred items', () => {
    const { projectPath, changeDir } = createTempProject('intel-no-open');
    createArchivedChange(projectPath, 'recent-20261104000000', [
      '# Deferred Work',
      '',
      '- [x] #1 [2026-11-04] Done (source: verify)',
      '',
    ].join('\n'));

    const result = runCli(['plan', 'next-feature'], projectPath);

    expect(result.status).toBe(0);
    const tasks = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
    expect(tasks).not.toContain('Previous Change Intelligence');
  });

  it('omits the section when nothing is archived yet', () => {
    const { projectPath, changeDir } = createTempProject('intel-no-archive');

    const result = runCli(['plan', 'next-feature'], projectPath);

    expect(result.status).toBe(0);
    const tasks = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
    expect(tasks).not.toContain('Previous Change Intelligence');
  });
});
