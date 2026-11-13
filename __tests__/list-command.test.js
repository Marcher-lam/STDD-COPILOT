const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.dim = fn;
  return fn;
});

const { ListCommand } = require('../src/cli/commands/list');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-list-'));
}

function makeStdd(root) {
  const stdd = path.join(root, 'stdd');
  fs.mkdirSync(path.join(stdd, 'changes'), { recursive: true });
  fs.mkdirSync(path.join(stdd, 'specs'), { recursive: true });
  return stdd;
}

function makeChange(stdd, name, opts = {}) {
  const dir = path.join(stdd, 'changes', name);
  fs.mkdirSync(dir, { recursive: true });
  if (opts.proposal) fs.writeFileSync(path.join(dir, 'proposal.md'), opts.proposal);
  if (opts.tasks) fs.writeFileSync(path.join(dir, 'tasks.md'), opts.tasks);
  return dir;
}

describe('ListCommand', () => {
  let cmd;
  let logSpy;

  beforeEach(() => {
    cmd = new ListCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('listChanges', () => {
    it('shows no active changes when empty', async () => {
      const root = makeTmp();
      makeStdd(root);

      await cmd.listChanges(path.join(root, 'stdd'), {});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No active changes found');
    });

    it('outputs [] with --json on an empty workspace (N03)', async () => {
      const root = makeTmp();
      makeStdd(root);

      await cmd.listChanges(path.join(root, 'stdd'), { json: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(JSON.parse(output)).toEqual([]);
    });

    it('outputs empty active/archived object with --json --archived on an empty workspace', async () => {
      const root = makeTmp();
      makeStdd(root);

      await cmd.listChanges(path.join(root, 'stdd'), { json: true, archived: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(JSON.parse(output)).toEqual({ active: [], archived: [] });
    });

    it('lists active changes', async () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      makeChange(stdd, 'feat-a', { proposal: '# Proposal: Feature A\n' });
      makeChange(stdd, 'feat-b', { tasks: '- [x] Task 1\n- [ ] Task 2\n' });

      await cmd.listChanges(path.join(root, 'stdd'), {});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('feat-a');
      expect(output).toContain('feat-b');
      expect(output).toContain('1/2');
    });

    it('outputs JSON when --json flag', async () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      makeChange(stdd, 'feat-a');

      await cmd.listChanges(path.join(root, 'stdd'), { json: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      const json = JSON.parse(output);
      expect(json).toContain('feat-a');
    });

    it('includes archived changes with --archived flag', async () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      makeChange(stdd, 'feat-a');
      const archiveDir = path.join(stdd, 'changes', 'archive');
      fs.mkdirSync(path.join(archiveDir, 'old-feat'), { recursive: true });

      await cmd.listChanges(path.join(root, 'stdd'), { archived: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('old-feat');
      expect(output).toContain('Archived');
    });

    it('shows JSON with active and archived when both flags', async () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      makeChange(stdd, 'active-one');
      const archiveDir = path.join(stdd, 'changes', 'archive');
      fs.mkdirSync(path.join(archiveDir, 'archived-one'), { recursive: true });

      await cmd.listChanges(path.join(root, 'stdd'), { json: true, archived: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      const json = JSON.parse(output);
      expect(json.active).toContain('active-one');
      expect(json.archived).toContain('archived-one');
    });

    it('shows STDD not initialized for missing changes dir', async () => {
      const root = makeTmp();

      await cmd.listChanges(path.join(root, 'stdd'), {});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('STDD not initialized');
    });
  });

  describe('listSpecs', () => {
    it('shows no specs when empty', async () => {
      const root = makeTmp();
      makeStdd(root);

      await cmd.listSpecs(path.join(root, 'stdd'), {});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No specs found');
    });

    it('outputs [] with --json when no specs exist (N03)', async () => {
      const root = makeTmp();
      makeStdd(root);

      await cmd.listSpecs(path.join(root, 'stdd'), { json: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(JSON.parse(output)).toEqual([]);
    });

    it('lists spec domains', async () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      fs.mkdirSync(path.join(stdd, 'specs', 'auth'), { recursive: true });
      fs.writeFileSync(path.join(stdd, 'specs', 'auth', 'spec.md'), '# Auth Spec\n');

      await cmd.listSpecs(path.join(root, 'stdd'), {});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('auth');
    });

    it('outputs JSON specs', async () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      fs.mkdirSync(path.join(stdd, 'specs', 'billing'), { recursive: true });

      await cmd.listSpecs(path.join(root, 'stdd'), { json: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      const json = JSON.parse(output);
      expect(json).toContain('billing');
    });
  });

  describe('getChangeStatus', () => {
    it('returns default status for empty change', async () => {
      const root = makeTmp();
      const dir = path.join(root, 'empty-change');
      fs.mkdirSync(dir, { recursive: true });

      const status = await cmd.getChangeStatus(dir);
      expect(status.hasProposal).toBe(false);
      expect(status.title).toBeNull();
      expect(status.tasksCompleted).toBe(0);
    });

    it('detects proposal title', async () => {
      const root = makeTmp();
      const dir = path.join(root, 'titled');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'proposal.md'), '# Proposal: Dark Mode\n');

      const status = await cmd.getChangeStatus(dir);
      expect(status.hasProposal).toBe(true);
      expect(status.title).toBe('Dark Mode');
    });
  });

  describe('getArchivedChanges', () => {
    it('returns empty for missing archive dir', async () => {
      const result = await cmd.getArchivedChanges('/nonexistent');
      expect(result).toEqual([]);
    });

    it('lists archived directories', async () => {
      const root = makeTmp();
      const archiveDir = path.join(root, 'archive');
      fs.mkdirSync(path.join(archiveDir, 'old-1'), { recursive: true });
      fs.mkdirSync(path.join(archiveDir, 'old-2'), { recursive: true });
      fs.mkdirSync(path.join(archiveDir, '.hidden'), { recursive: true });

      const result = await cmd.getArchivedChanges(archiveDir);
      expect(result).toHaveLength(2);
    });
  });

  describe('execute', () => {
    it('delegates to listChanges by default', async () => {
      const root = makeTmp();
      makeStdd(root);

      await cmd.execute(root, {});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No active changes found');
    });

    it('delegates to listSpecs with --specs flag', async () => {
      const root = makeTmp();
      makeStdd(root);

      await cmd.execute(root, { specs: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No specs found');
    });
  });

  describe('branch coverage gaps', () => {
    it('shows no active changes when only archived exist', async () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const archiveDir = path.join(stdd, 'changes', 'archive');
      fs.mkdirSync(path.join(archiveDir, 'old-1'), { recursive: true });

      await cmd.listChanges(path.join(root, 'stdd'), { archived: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No active changes found');
    });

    it('shows no archived changes message when archived is empty', async () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      makeChange(stdd, 'feat-a');
      fs.mkdirSync(path.join(stdd, 'changes', 'archive'), { recursive: true });

      await cmd.listChanges(path.join(root, 'stdd'), { archived: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No archived changes found');
    });

    it('rethrows non-ENOENT errors in listChanges', async () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      makeChange(stdd, 'feat-a');
      const changesDir = path.join(stdd, 'changes');
      fs.chmodSync(changesDir, 0o000);

      await expect(cmd.listChanges(path.join(root, 'stdd'), {}))
        .rejects.toThrow();

      fs.chmodSync(changesDir, 0o755);
    });

    it('rethrows non-ENOENT errors in getArchivedChanges', async () => {
      const root = makeTmp();
      const archiveDir = path.join(root, 'archive');
      fs.mkdirSync(archiveDir);
      fs.chmodSync(archiveDir, 0o000);

      await expect(cmd.getArchivedChanges(archiveDir))
        .rejects.toThrow();

      fs.chmodSync(archiveDir, 0o755);
    });

    it('shows STDD not initialized for missing specs dir', async () => {
      const root = makeTmp();

      await cmd.listSpecs(path.join(root, 'stdd'), {});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('STDD not initialized');
    });

    it('getChangeStatus counts tasks correctly', async () => {
      const root = makeTmp();
      const dir = path.join(root, 'tasked');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'tasks.md'), '- [x] Done\n- [ ] Pending\n- [x] Also Done\n');

      const status = await cmd.getChangeStatus(dir);
      expect(status.tasksCompleted).toBe(2);
      expect(status.totalTasks).toBe(3);
    });
  });
});
