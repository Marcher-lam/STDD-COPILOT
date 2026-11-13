/**
 * Unit tests for ArchiveCommand
 * Tests the class with all external dependencies mocked via jest.mock().
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// -- Mock chalk --
jest.mock('chalk', () => ({
  red: jest.fn(s => s),
  green: jest.fn(s => s),
  yellow: jest.fn(s => s),
  cyan: jest.fn(s => s),
  dim: jest.fn(s => s),
}));

// -- Mock change-utils --
const mockFindActiveChange = jest.fn();
const mockCheckTasksCompletion = jest.fn();
jest.mock('../src/utils/change-utils', () => ({
  findActiveChange: (...args) => mockFindActiveChange(...args),
  checkTasksCompletion: (...args) => mockCheckTasksCompletion(...args),
}));

// -- Mock workspace-detector --
const mockDetectWorkspaces = jest.fn();
jest.mock('../src/utils/workspace-detector', () => ({
  detectWorkspaces: (...args) => mockDetectWorkspaces(...args),
}));

// -- Import after mocks are set up --
// We re-require for each test inside helper, but need a reference to the module.
// Since the module uses require() at top-level, mocks intercept those calls.

const { ArchiveCommand } = require('../src/cli/commands/archive');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a temporary project directory with a stdd structure on the real
 * filesystem so that fs operations (mkdirSync, writeFileSync, renameSync, etc.)
 * actually work.  The caller is responsible for cleanup.
 */
function createTempProject(options = {}) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-archive-unit-'));
  const projectPath = path.join(tmpRoot, 'project');
  const changeName = options.changeName || 'demo';
  const changeDir = path.join(projectPath, 'stdd', 'changes', changeName);
  fs.mkdirSync(changeDir, { recursive: true });

  const tasksContent =
    options.tasksContent || '- [x] TASK-001 Write tests\n- [x] TASK-002 Implement feature\n';
  fs.writeFileSync(path.join(changeDir, 'tasks.md'), tasksContent);

  if (options.proposalContent) {
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), options.proposalContent);
  }

  writeVerifyPass(changeDir);

  return { projectPath, changeDir, changeName, tmpRoot };
}


/**
 * D02: the archive gate requires fresh passing verify evidence. Unit
 * fixtures that expect a successful archive must record it AFTER the last
 * change-artifact write so the evidence stays fresh.
 */
function writeVerifyPass(changeDir, name = 'verify-1000000000') {
  const evidenceDir = path.join(changeDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceDir, `${name}.json`),
    JSON.stringify({ type: 'verify', status: 'pass', results: {}, metadata: {} })
  );
}


function callsOf(spy) {
  return spy.mock.calls.map(args => args.join(' ')).join('\n');
}

function cleanupTemp(tmpRoot) {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArchiveCommand (unit)', () => {
  let cmd;
  let origCwd;

  beforeEach(() => {
    jest.clearAllMocks();
    cmd = new ArchiveCommand();
    origCwd = process.cwd;
  });

  afterEach(() => {
    process.cwd = origCwd;
  });

  // =======================================================================
  // 1. formatTimestamp
  // =======================================================================
  describe('formatTimestamp()', () => {
    it('formats a date as YYYYMMDDHHmmss', () => {
      const date = new Date('2026-05-16T14:30:45.000Z');
      // Use local-time representation via getFullYear etc., so construct
      // a date whose local time matches.
      const result = cmd.formatTimestamp(date);
      // The method uses getFullYear/getMonth/getDate/getHours/getMinutes/getSeconds
      // so it uses local timezone. Just verify the pattern.
      expect(result).toMatch(/^\d{14}$/);
    });

    it('zero-pads single-digit month, day, hour, minute, second', () => {
      const date = new Date(2026, 0, 5, 3, 7, 9); // Jan 5 2026, 03:07:09 local
      const result = cmd.formatTimestamp(date);
      expect(result).toBe('20260105030709');
    });

    it('handles double-digit values correctly', () => {
      const date = new Date(2026, 10, 12, 13, 45, 59); // Nov 12 2026
      const result = cmd.formatTimestamp(date);
      expect(result).toBe('20261112134559');
    });
  });

  // =======================================================================
  // 2. mergeDeltaSpecs
  // =======================================================================
  describe('mergeDeltaSpecs()', () => {
    it('returns empty report when no spec files exist', () => {
      const result = cmd.mergeDeltaSpecs('/fake/change', '/fake/stdd');
      expect(result).toEqual([]);
    });

    it('merges delta spec files and returns report', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-merge-unit-'));
      const changeDir = path.join(tmpRoot, 'change');
      const stddDir = path.join(tmpRoot, 'stdd');
      const specsDir = path.join(changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      process.cwd = () => tmpRoot;

      // Write a delta spec file
      fs.writeFileSync(
        path.join(specsDir, 'login.md'),
        '## ADDED\n\nFeature: Login\n## MODIFIED\n\nChanged line\n'
      );

      const report = cmd.mergeDeltaSpecs(changeDir, stddDir);

      expect(report.length).toBe(1);
      expect(report[0].action).toBe('created');
      expect(fs.existsSync(path.join(stddDir, 'specs', 'login.md'))).toBe(true);

      const merged = fs.readFileSync(path.join(stddDir, 'specs', 'login.md'), 'utf8');
      expect(merged).toContain('STDD:ADDED');
      expect(merged).toContain('STDD:MODIFIED');

      cleanupTemp(tmpRoot);
    });

    it('skips contracts/ and api-spec. files', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-merge-skip-'));
      const changeDir = path.join(tmpRoot, 'change');
      const stddDir = path.join(tmpRoot, 'stdd');
      const specsDir = path.join(changeDir, 'specs');
      const contractsDir = path.join(specsDir, 'contracts');
      fs.mkdirSync(contractsDir, { recursive: true });
      process.cwd = () => tmpRoot;

      fs.writeFileSync(path.join(contractsDir, 'api.md'), 'Contract spec\n');
      fs.writeFileSync(path.join(specsDir, 'api-spec.v1.md'), 'API spec\n');
      fs.writeFileSync(path.join(specsDir, 'feature.md'), 'Feature spec\n');

      const report = cmd.mergeDeltaSpecs(changeDir, stddDir);

      // Only feature.md should be included
      expect(report.length).toBe(1);
      expect(report[0].source).toContain('feature.md');

      cleanupTemp(tmpRoot);
    });

    it('merges into existing spec file (action=merged)', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-merge-existing-'));
      const changeDir = path.join(tmpRoot, 'change');
      const stddDir = path.join(tmpRoot, 'stdd');
      const specsDir = path.join(changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.mkdirSync(path.join(stddDir, 'specs'), { recursive: true });
      process.cwd = () => tmpRoot;

      // Existing spec at target
      fs.writeFileSync(path.join(stddDir, 'specs', 'auth.md'), '# Existing Auth\n');
      // Delta spec in change
      fs.writeFileSync(path.join(specsDir, 'auth.md'), '## ADDED\n\nNew section\n');

      const report = cmd.mergeDeltaSpecs(changeDir, stddDir);

      expect(report.length).toBe(1);
      expect(report[0].action).toBe('merged');

      const merged = fs.readFileSync(path.join(stddDir, 'specs', 'auth.md'), 'utf8');
      expect(merged).toContain('Existing Auth');
      expect(merged).toContain('STDD:ADDED');

      cleanupTemp(tmpRoot);
    });
  });

  // =======================================================================
  // 3. generateSummary
  // =======================================================================
  describe('generateSummary()', () => {
    it('generates summary.md with basic task info', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-unit-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n- [x] TASK-002 Done\n');
      fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal: Add Feature\n');

      // Mock cwd for extractWorkspaceInfo
      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const summaryPath = path.join(changeDir, 'summary.md');
      expect(fs.existsSync(summaryPath)).toBe(true);

      const content = fs.readFileSync(summaryPath, 'utf-8');
      expect(content).toContain('Archive Summary: Add Feature');
      expect(content).toContain('2/2 completed');
      expect(content).toContain('100%');
      expect(content).toContain('Verification Passed');

      cleanupTemp(tmpRoot);
    });

    it('shows task completion percentage for partial completion', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-partial-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });

      // 1 of 3 done -> 33%
      fs.writeFileSync(
        path.join(changeDir, 'tasks.md'),
        '- [x] TASK-001 Done\n- [ ] TASK-002 Pending\n- [ ] TASK-003 Pending\n'
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('1/3 completed');
      expect(content).toContain('33%');

      cleanupTemp(tmpRoot);
    });

    it('handles missing proposal.md with Unknown title', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-noprop-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('Archive Summary: Unknown');

      cleanupTemp(tmpRoot);
    });

    it('shows Verification Failed when evidence status is fail', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-fail-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n');
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'verify-999.json'),
        JSON.stringify({
          status: 'fail',
          results: {
            constitution: { status: 'fail' },
          },
          metadata: {},
        })
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('Verification Failed');
      expect(content).toContain('Constitution Status: FAIL');

      cleanupTemp(tmpRoot);
    });

    it('includes constitution score when present in evidence', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-score-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n');
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'verify-100.json'),
        JSON.stringify({
          status: 'pass',
          results: {
            constitution: { status: 'pass', score: 95 },
          },
          metadata: { testRunner: 'jest' },
        })
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('Constitution Status: PASS (Score: 95%)');
      expect(content).toContain('Test Runner: jest');

      cleanupTemp(tmpRoot);
    });

    it('includes spec files in summary', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-specs-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      const specsDir = path.join(changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n');
      fs.writeFileSync(path.join(specsDir, 'login.feature'), 'Feature: Login\n');
      fs.writeFileSync(path.join(specsDir, 'auth.md'), '# Auth\n');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('specs/login.feature');
      expect(content).toContain('specs/auth.md');

      cleanupTemp(tmpRoot);
    });

    it('shows No spec files when specs directory is empty', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-nospecs-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('No spec files');

      cleanupTemp(tmpRoot);
    });

    it('includes workspace test results from evidence', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-ws-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n');
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'verify-100.json'),
        JSON.stringify({
          status: 'pass',
          results: {
            tests: {
              passed: true,
              workspaces: [
                { workspaceName: 'packages/api', passed: true },
                { workspaceName: 'packages/web', passed: false },
              ],
            },
          },
          metadata: {},
        })
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('## Workspaces');
      expect(content).toContain('packages/api');
      expect(content).toContain('packages/api: PASS');
      expect(content).toContain('packages/web: FAIL');

      cleanupTemp(tmpRoot);
    });

    it('handles evidence with workspace passed=null as SKIP', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-skip-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n');
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'verify-100.json'),
        JSON.stringify({
          status: 'pass',
          results: {
            tests: {
              passed: true,
              workspaces: [{ workspaceName: 'packages/api', passed: null }],
            },
          },
          metadata: {},
        })
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('packages/api: SKIP');

      cleanupTemp(tmpRoot);
    });

    it('extracts proposal title from Bug: prefix', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-summary-bug-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n');
      fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Bug: Fix crash\n');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      cmd.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('Archive Summary: Fix crash');

      cleanupTemp(tmpRoot);
    });
  });

  // =======================================================================
  // 4. execute() - main method
  // =======================================================================
  describe('execute()', () => {
    let tmp;
    let projectPath;

    beforeEach(() => {
      tmp = createTempProject();
      projectPath = tmp.projectPath;
      process.cwd = () => projectPath;
      mockCheckTasksCompletion.mockReturnValue({ allDone: true, total: 2, done: 2, pending: [] });
      mockDetectWorkspaces.mockReturnValue([]);
    });

    afterEach(() => {
      cleanupTemp(tmp.tmpRoot);
    });

    // ---- 4a. Successful archive ----
    it('successfully archives a completed change', async () => {
      const changeDir = tmp.changeDir;
      mockFindActiveChange.mockReturnValue(changeDir);

      await cmd.execute('demo');

      // Change should have been renamed to archive
      expect(fs.existsSync(changeDir)).toBe(false);

      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      expect(fs.existsSync(archiveDir)).toBe(true);

      const archived = fs.readdirSync(archiveDir);
      expect(archived.length).toBe(1);
      expect(archived[0]).toMatch(/^demo-\d{14}$/);
    });

    it('creates archive directory if it does not exist', async () => {
      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      expect(fs.existsSync(archiveDir)).toBe(false);

      mockFindActiveChange.mockReturnValue(tmp.changeDir);

      await cmd.execute('demo');

      expect(fs.existsSync(archiveDir)).toBe(true);
    });

    it('generates summary.md in the archived directory', async () => {
      mockFindActiveChange.mockReturnValue(tmp.changeDir);

      await cmd.execute('demo');

      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      const archivedName = fs.readdirSync(archiveDir)[0];
      const summaryPath = path.join(archiveDir, archivedName, 'summary.md');

      expect(fs.existsSync(summaryPath)).toBe(true);
      const content = fs.readFileSync(summaryPath, 'utf-8');
      expect(content).toContain('Archive Summary:');
      expect(content).toContain('Tasks');
    });

    it('writes spec-merge-report.json when delta specs exist', async () => {
      const specsDir = path.join(tmp.changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'feature.md'), '## ADDED\n\nNew feature\n');
      writeVerifyPass(tmp.changeDir, 'verify-2000000000');

      mockFindActiveChange.mockReturnValue(tmp.changeDir);

      await cmd.execute('demo');

      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      const archivedName = fs.readdirSync(archiveDir)[0];
      const reportPath = path.join(archiveDir, archivedName, 'spec-merge-report.json');

      expect(fs.existsSync(reportPath)).toBe(true);
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(report.length).toBe(1);
      expect(report[0].action).toBe('created');
    });

    it('does not write spec-merge-report.json when no delta specs exist', async () => {
      mockFindActiveChange.mockReturnValue(tmp.changeDir);

      await cmd.execute('demo');

      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      const archivedName = fs.readdirSync(archiveDir)[0];
      const reportPath = path.join(archiveDir, archivedName, 'spec-merge-report.json');

      expect(fs.existsSync(reportPath)).toBe(false);
    });

    it('removes specs directory for the change after archiving', async () => {
      const specDir = path.join(projectPath, 'stdd', 'specs', 'demo');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# Spec\n');

      mockFindActiveChange.mockReturnValue(tmp.changeDir);

      await cmd.execute('demo');

      // The stdd/specs/demo directory should be removed
      expect(fs.existsSync(specDir)).toBe(false);
    });

    // ---- 4b. Error: STDD not initialized ----
    it('throws when STDD directory does not exist', async () => {
      const noStddRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-nostdd-unit-'));
      const noStddProject = path.join(noStddRoot, 'empty-project');
      fs.mkdirSync(noStddProject, { recursive: true });
      process.cwd = () => noStddProject;

      await expect(cmd.execute('demo')).rejects.toThrow('STDD not initialized');

      cleanupTemp(noStddRoot);
    });

    // ---- 4c. Error: No active changes ----
    it('throws when no active changes found and no name given', async () => {
      mockFindActiveChange.mockReturnValue(null);

      await expect(cmd.execute()).rejects.toThrow('No active changes found');
    });

    // ---- 4d. Error: Change not found ----
    it('throws when specified change is not found', async () => {
      mockFindActiveChange.mockReturnValue(null);

      await expect(cmd.execute('nonexistent')).rejects.toThrow("Change 'nonexistent' not found");
    });

    // ---- 4e. Error: Tasks incomplete ----
    it('exits with code 1 when tasks are incomplete', async () => {
      mockFindActiveChange.mockReturnValue(tmp.changeDir);
      mockCheckTasksCompletion.mockReturnValue({
        allDone: false,
        total: 2,
        done: 1,
        pending: ['TASK-002 Implement feature'],
      });

      const prevExitCode = process.exitCode;
      await cmd.execute('demo');

      expect(process.exitCode).toBe(1);
      // Change should NOT have been moved
      expect(fs.existsSync(tmp.changeDir)).toBe(true);

      // Cleanup exit code
      process.exitCode = prevExitCode;
    });

    it('lists pending tasks when tasks are incomplete', async () => {
      mockFindActiveChange.mockReturnValue(tmp.changeDir);
      mockCheckTasksCompletion.mockReturnValue({
        allDone: false,
        total: 3,
        done: 1,
        pending: ['TASK-002 Pending task', 'TASK-003 Another pending'],
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await cmd.execute('demo');

      // The output should mention the pending tasks
      const calls = consoleSpy.mock.calls.map(c => c.join(' '));
      const output = calls.join('\n');
      expect(output).toContain('TASK-002 Pending task');
      expect(output).toContain('TASK-003 Another pending');

      consoleSpy.mockRestore();
      process.exitCode = undefined;
    });

    it('refuses to archive when tasks file has zero tasks (nothing verified)', async () => {
      mockFindActiveChange.mockReturnValue(tmp.changeDir);
      mockCheckTasksCompletion.mockReturnValue({
        allDone: true,
        total: 0,
        done: 0,
        pending: [],
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmd.execute('demo');
      const output = callsOf(consoleSpy);
      consoleSpy.mockRestore();

      // D02: 0/0 tasks must not masquerade as a verified change.
      expect(process.exitCode).toBe(1);
      expect(output).toContain('no tasks to verify');
      expect(fs.existsSync(tmp.changeDir)).toBe(true);
      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      expect(fs.existsSync(archiveDir)).toBe(false);
      process.exitCode = undefined;
    });

    // ---- 4f. options.change passthrough ----
    it('resolves change name from options.change', async () => {
      mockFindActiveChange.mockReturnValue(tmp.changeDir);

      await cmd.execute(undefined, { change: 'demo' });

      expect(mockFindActiveChange).toHaveBeenCalledWith(
        path.join(projectPath, 'stdd'),
        'demo'
      );
    });

    it('prefers options.change over positional argument', async () => {
      mockFindActiveChange.mockReturnValue(tmp.changeDir);

      await cmd.execute('positional-name', { change: 'options-name' });

      expect(mockFindActiveChange).toHaveBeenCalledWith(
        path.join(projectPath, 'stdd'),
        'options-name'
      );
    });

    // ---- 4g. Timestamp in archive name ----
    it('uses formatTimestamp to build archive directory name', async () => {
      mockFindActiveChange.mockReturnValue(tmp.changeDir);

      const spy = jest.spyOn(cmd, 'formatTimestamp').mockReturnValue('20260516143000');

      await cmd.execute('demo');

      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      const archivedName = fs.readdirSync(archiveDir)[0];
      expect(archivedName).toBe('demo-20260516143000');

      spy.mockRestore();
    });

    // ---- 4h. Workspace support ----
    it('calls detectWorkspaces during generateSummary', async () => {
      mockFindActiveChange.mockReturnValue(tmp.changeDir);
      mockDetectWorkspaces.mockReturnValue([]);

      await cmd.execute('demo');

      expect(mockDetectWorkspaces).toHaveBeenCalled();
    });

    it('includes workspace names from spec metadata in summary', async () => {
      const specsDir = path.join(tmp.changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(
        path.join(specsDir, 'api.feature'),
        '# Workspace: packages/api\nFeature: API\n'
      );
      writeVerifyPass(tmp.changeDir, 'verify-2000000000');

      mockFindActiveChange.mockReturnValue(tmp.changeDir);
      mockDetectWorkspaces.mockReturnValue([
        { name: 'packages/api', root: path.join(projectPath, 'packages', 'api') },
      ]);

      await cmd.execute('demo');

      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      const archivedName = fs.readdirSync(archiveDir)[0];
      const summaryPath = path.join(archiveDir, archivedName, 'summary.md');
      const content = fs.readFileSync(summaryPath, 'utf-8');

      expect(content).toContain('packages/api');
    });

    // ---- 4i. Console output ----
    it('prints success message with chalk.green', async () => {
      const chalk = require('chalk');
      mockFindActiveChange.mockReturnValue(tmp.changeDir);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmd.execute('demo');

      expect(chalk.green).toHaveBeenCalled();
      expect(chalk.cyan).toHaveBeenCalled();

      const calls = consoleSpy.mock.calls.map(c => c.join(' '));
      const output = calls.join('\n');
      expect(output).toContain('Archived demo');

      consoleSpy.mockRestore();
    });
  });

  // =======================================================================
  // 5. Private helper functions (tested via the module-level functions)
  //    These are not exported, so we test them through the public methods
  //    that exercise them.
  // =======================================================================

  describe('extractProposalTitle (via generateSummary)', () => {
    it('extracts title from Proposal: prefix', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-title-proposal-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal: Great Feature\n');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('Great Feature');

      cleanupTemp(tmpRoot);
    });

    it('returns Unknown for empty proposal content', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-title-empty-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(path.join(changeDir, 'proposal.md'), 'No heading here\n');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('Unknown');

      cleanupTemp(tmpRoot);
    });

    it('extracts title from bare # heading', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-title-bare-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# My Feature\nSome description\n');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('My Feature');

      cleanupTemp(tmpRoot);
    });
  });

  describe('parseTaskStats (via generateSummary)', () => {
    it('counts tasks correctly with mixed statuses', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-stats-mixed-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(
        path.join(changeDir, 'tasks.md'),
        '- [x] TASK-001 Done\n- [ ] TASK-002 Todo\n- [~] TASK-003 Skipped\n'
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      // 1 done out of 3 total = 33%
      expect(content).toContain('1/3 completed');
      expect(content).toContain('33%');

      cleanupTemp(tmpRoot);
    });

    it('returns 0/0 when tasks.md does not exist', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-stats-no-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      // No tasks.md

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('0/0 completed');
      expect(content).toContain('0%');

      cleanupTemp(tmpRoot);
    });
  });

  describe('findLatestEvidence (via generateSummary)', () => {
    it('picks the highest-numbered evidence file', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-evidence-latest-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'verify-100.json'),
        JSON.stringify({ status: 'pass', results: {}, metadata: { testRunner: 'old-runner' } })
      );
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'verify-200.json'),
        JSON.stringify({ status: 'pass', results: {}, metadata: { testRunner: 'new-runner' } })
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('new-runner');

      cleanupTemp(tmpRoot);
    });

    it('picks guard-*.json evidence files too', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-evidence-guard-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'guard-300.json'),
        JSON.stringify({ status: 'fail', results: {}, metadata: {} })
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('Verification Failed');

      cleanupTemp(tmpRoot);
    });

    it('handles no evidence directory gracefully', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-evidence-none-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      // No evidence dir

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('Verification Passed');
      expect(content).toContain('Constitution Status: N/A');

      cleanupTemp(tmpRoot);
    });

    it('handles invalid JSON in evidence file', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-evidence-badjson-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(path.join(changeDir, 'evidence', 'verify-100.json'), 'not valid json{');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      // Should fall back to defaults (no evidence)
      expect(content).toContain('Constitution Status: N/A');

      cleanupTemp(tmpRoot);
    });
  });

  // =======================================================================
  // 6. walkSpecFiles and spec merging edge cases
  // =======================================================================
  describe('spec merging edge cases', () => {
    it('handles nested spec directories', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-nested-specs-'));
      const changeDir = path.join(tmpRoot, 'change');
      const stddDir = path.join(tmpRoot, 'stdd');
      const specsDir = path.join(changeDir, 'specs', 'subdir');
      fs.mkdirSync(specsDir, { recursive: true });
      process.cwd = () => tmpRoot;

      fs.writeFileSync(path.join(specsDir, 'nested.md'), '## ADDED\n\nNested content\n');

      const c = new ArchiveCommand();
      const report = c.mergeDeltaSpecs(changeDir, stddDir);

      expect(report.length).toBe(1);
      expect(fs.existsSync(path.join(stddDir, 'specs', 'subdir', 'nested.md'))).toBe(true);

      cleanupTemp(tmpRoot);
    });

    it('handles delta spec with no recognized sections', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-delta-nosec-'));
      const changeDir = path.join(tmpRoot, 'change');
      const stddDir = path.join(tmpRoot, 'stdd');
      const specsDir = path.join(changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      process.cwd = () => tmpRoot;

      fs.writeFileSync(path.join(specsDir, 'plain.md'), 'Just plain content\n');

      const c = new ArchiveCommand();
      const report = c.mergeDeltaSpecs(changeDir, stddDir);

      expect(report.length).toBe(1);
      const merged = fs.readFileSync(path.join(stddDir, 'specs', 'plain.md'), 'utf8');
      // When no ADDED/MODIFIED/REMOVED sections, the delta content is appended
      expect(merged).toContain('Just plain content');

      cleanupTemp(tmpRoot);
    });

    it('handles delta spec with REMOVED section', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-delta-removed-'));
      const changeDir = path.join(tmpRoot, 'change');
      const stddDir = path.join(tmpRoot, 'stdd');
      const specsDir = path.join(changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      process.cwd = () => tmpRoot;

      fs.writeFileSync(path.join(specsDir, 'removal.md'), '## REMOVED\n\nObsolete feature\n');

      const c = new ArchiveCommand();
      c.mergeDeltaSpecs(changeDir, stddDir);

      const merged = fs.readFileSync(path.join(stddDir, 'specs', 'removal.md'), 'utf8');
      expect(merged).toContain('STDD:REMOVED');

      cleanupTemp(tmpRoot);
    });

    it('handles MODIFIED section in delta spec', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-delta-modified-'));
      const changeDir = path.join(tmpRoot, 'change');
      const stddDir = path.join(tmpRoot, 'stdd');
      const specsDir = path.join(changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      process.cwd = () => tmpRoot;

      fs.writeFileSync(path.join(specsDir, 'change.md'), '## MODIFIED\n\nChanged content\n');

      const c = new ArchiveCommand();
      c.mergeDeltaSpecs(changeDir, stddDir);

      const merged = fs.readFileSync(path.join(stddDir, 'specs', 'change.md'), 'utf8');
      expect(merged).toContain('STDD:MODIFIED');
      expect(merged).toContain('Changed content');

      cleanupTemp(tmpRoot);
    });
  });

  // =======================================================================
  // 7. extractWorkspaceInfo (via generateSummary)
  // =======================================================================
  describe('workspace extraction from spec files', () => {
    it('extracts workspace names from @workspace: tags', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ws-tag-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      const specsDir = path.join(changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(
        path.join(specsDir, 'feat.feature'),
        '@workspace:packages/web Feature: X\n'
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([
        { name: 'packages/web', root: path.join(tmpRoot, 'packages', 'web') },
      ]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('packages/web');

      cleanupTemp(tmpRoot);
    });

    it('extracts workspace names from # Workspace: comments', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ws-comment-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      const specsDir = path.join(changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(
        path.join(specsDir, 'spec.md'),
        '# Workspace: packages/api\nFeature description\n'
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([
        { name: 'packages/api', root: path.join(tmpRoot, 'packages', 'api') },
      ]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('packages/api');

      cleanupTemp(tmpRoot);
    });

    it('extracts workspace from file paths in tasks.md', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ws-path-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });

      fs.writeFileSync(
        path.join(changeDir, 'tasks.md'),
        '- [x] TASK-001 Update packages/api/src/index.ts\n'
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([
        { name: 'packages/api', root: path.join(tmpRoot, 'packages', 'api') },
      ]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('packages/api');

      cleanupTemp(tmpRoot);
    });
  });

  // =======================================================================
  // 8. extractIssuePaths (via generateSummary with evidence)
  // =======================================================================
  describe('issue path extraction from evidence', () => {
    it('extracts file paths from constitution issues', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-issue-paths-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'verify-100.json'),
        JSON.stringify({
          status: 'pass',
          results: {
            constitution: {
              status: 'pass',
              details: {
                blocking: [{ file: 'packages/api/src/index.ts', message: 'issue found' }],
                warning: [],
              },
            },
          },
          metadata: {},
        })
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([
        { name: 'packages/api', root: path.join(tmpRoot, 'packages', 'api') },
      ]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('packages/api');

      cleanupTemp(tmpRoot);
    });

    it('extracts paths from issue.files array', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-issue-files-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'verify-100.json'),
        JSON.stringify({
          status: 'pass',
          results: {
            constitution: {
              status: 'pass',
              issues: {
                blocking: [{ files: ['packages/web/src/app.tsx'] }],
                warning: [],
              },
            },
          },
          metadata: {},
        })
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([
        { name: 'packages/web', root: path.join(tmpRoot, 'packages', 'web') },
      ]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('packages/web');

      cleanupTemp(tmpRoot);
    });
  });

  // =======================================================================
  // 9. Edge cases
  // =======================================================================
  describe('edge cases', () => {
    it('handles change with no tasks.md (allDone=true, total=0)', async () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-edge-notasks-'));
      const projectPath = path.join(tmpRoot, 'project');
      const changeDir = path.join(projectPath, 'stdd', 'changes', 'notasks');
      fs.mkdirSync(changeDir, { recursive: true });
      // No tasks.md at all

      process.cwd = () => projectPath;
      mockFindActiveChange.mockReturnValue(changeDir);
      mockCheckTasksCompletion.mockReturnValue({
        allDone: false,
        total: 0,
        done: 0,
        pending: ['tasks.md not found'],
      });
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      // D02: total=0 (no tasks.md) is now refused — an empty change has
      // nothing verified and must not be archived as if it were.
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await c.execute('notasks');
      const output = callsOf(consoleSpy);
      consoleSpy.mockRestore();

      expect(process.exitCode).toBe(1);
      expect(output).toContain('no tasks to verify');
      expect(fs.existsSync(changeDir)).toBe(true);
      process.exitCode = undefined;

      cleanupTemp(tmpRoot);
    });

    it('handles proposal.md with multiple # headings (uses first)', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-edge-multihead-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(
        path.join(changeDir, 'proposal.md'),
        '# Proposal: First Title\n## Subsection\n# Proposal: Second Title\n'
      );

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      // Should use the first # heading
      expect(content).toContain('First Title');
      expect(content).not.toContain('Second Title');

      cleanupTemp(tmpRoot);
    });

    it('handles empty changes directory (findActiveChange returns null)', async () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-edge-empty-'));
      const projectPath = path.join(tmpRoot, 'project');
      fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });

      process.cwd = () => projectPath;
      mockFindActiveChange.mockReturnValue(null);

      const c = new ArchiveCommand();
      await expect(c.execute()).rejects.toThrow('No active changes found');

      cleanupTemp(tmpRoot);
    });

    it('handles extractWorkspaceInfo with null evidence', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-edge-nullevidence-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      // Should not contain Workspaces section when no workspaces detected
      expect(content).not.toContain('## Workspaces');

      cleanupTemp(tmpRoot);
    });

    it('handles spec files in specs directory alongside non-spec files', () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-edge-specfilter-'));
      const changeDir = path.join(tmpRoot, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      const specsDir = path.join(changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(path.join(specsDir, 'good.feature'), 'Feature: Good\n');
      fs.writeFileSync(path.join(specsDir, 'good.md'), '# Good\n');
      fs.writeFileSync(path.join(specsDir, 'ignore.txt'), 'Not a spec\n');
      fs.writeFileSync(path.join(specsDir, 'ignore.json'), '{}\n');

      process.cwd = () => tmpRoot;
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      c.generateSummary(changeDir);

      const content = fs.readFileSync(path.join(changeDir, 'summary.md'), 'utf-8');
      expect(content).toContain('specs/good.feature');
      expect(content).toContain('specs/good.md');
      expect(content).not.toContain('ignore.txt');
      expect(content).not.toContain('ignore.json');

      cleanupTemp(tmpRoot);
    });
  });

  // =======================================================================
  // 10. Full integration-style execute with real filesystem
  // =======================================================================
  describe('full execute flow with real filesystem', () => {
    it('archives change with evidence and proposal and verifies all outputs', async () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-full-flow-'));
      const projectPath = path.join(tmpRoot, 'project');
      const changeDir = path.join(projectPath, 'stdd', 'changes', 'full-feature');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });
      fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });

      fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal: Full Feature\n');
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n- [x] TASK-002 Done\n');
      fs.writeFileSync(path.join(changeDir, 'specs', 'login.feature'), 'Feature: Login\n');
      fs.writeFileSync(
        path.join(changeDir, 'evidence', 'verify-1000.json'),
        JSON.stringify({
          status: 'pass',
          results: {
            tasks: { allDone: true, done: 2, total: 2 },
            tests: { passed: true },
            constitution: { status: 'pass', score: 100 },
          },
          metadata: { testRunner: 'jest' },
        })
      );

      process.cwd = () => projectPath;
      mockFindActiveChange.mockReturnValue(changeDir);
      mockCheckTasksCompletion.mockReturnValue({ allDone: true, total: 2, done: 2, pending: [] });
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();
      await c.execute('full-feature');

      // Verify change moved to archive
      expect(fs.existsSync(changeDir)).toBe(false);
      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      const archived = fs.readdirSync(archiveDir);
      expect(archived.length).toBe(1);
      expect(archived[0]).toMatch(/^full-feature-\d{14}$/);

      // Verify summary contents
      const summaryPath = path.join(archiveDir, archived[0], 'summary.md');
      const summary = fs.readFileSync(summaryPath, 'utf-8');
      expect(summary).toContain('Full Feature');
      expect(summary).toContain('2/2 completed');
      expect(summary).toContain('100%');
      expect(summary).toContain('Verification Passed');
      expect(summary).toContain('Constitution Status: PASS (Score: 100%)');
      expect(summary).toContain('Test Runner: jest');
      expect(summary).toContain('specs/login.feature');

      // Verify tasks.md is in the archived directory
      expect(fs.existsSync(path.join(archiveDir, archived[0], 'tasks.md'))).toBe(true);

      cleanupTemp(tmpRoot);
    });

    it('archives multiple changes sequentially', async () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-multi-'));
      const projectPath = path.join(tmpRoot, 'project');
      const changeDir1 = path.join(projectPath, 'stdd', 'changes', 'alpha');
      const changeDir2 = path.join(projectPath, 'stdd', 'changes', 'beta');
      fs.mkdirSync(changeDir1, { recursive: true });
      fs.mkdirSync(changeDir2, { recursive: true });
      fs.writeFileSync(path.join(changeDir1, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(path.join(changeDir2, 'tasks.md'), '- [x] Done\n');
      writeVerifyPass(changeDir1);
      writeVerifyPass(changeDir2);

      process.cwd = () => projectPath;
      mockCheckTasksCompletion.mockReturnValue({ allDone: true, total: 1, done: 1, pending: [] });
      mockDetectWorkspaces.mockReturnValue([]);

      const c = new ArchiveCommand();

      // Archive first change
      mockFindActiveChange.mockReturnValue(changeDir1);
      await c.execute('alpha');

      // Archive second change
      mockFindActiveChange.mockReturnValue(changeDir2);
      await c.execute('beta');

      const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
      const archived = fs.readdirSync(archiveDir);
      expect(archived.length).toBe(2);

      cleanupTemp(tmpRoot);
    });
  });
});
