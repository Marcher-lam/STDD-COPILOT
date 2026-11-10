const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock dependencies before requiring apply
jest.mock('../src/utils/command-runner', () => ({
  runCommand: jest.fn(),
}));
jest.mock('../src/utils/reporter-injector', () => ({
  injectReporter: jest.fn((cmd) => ({ command: cmd, env: {} })),
}));
jest.mock('../src/utils/test-command-resolver', () => ({
  resolveTestCommands: jest.fn(),
  getConfigTestCommand: jest.fn(),
}));
jest.mock('../src/cli/commands/fix-packet', () => ({
  FixPacketCommand: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockReturnValue({ output: '/tmp/fix-packet.md' }),
  })),
}));
jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.red = fn;
  fn.dim = fn;
  return fn;
});

const { ApplyCommand } = require('../src/cli/commands/apply');
const { runCommand } = require('../src/utils/command-runner');
const { resolveTestCommands } = require('../src/utils/test-command-resolver');

function setupTempProject(tasksContent, phase) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-tdd-'));
  const stdd = path.join(root, 'stdd');
  const changeDir = path.join(stdd, 'changes', 'test-change');
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(path.join(stdd, 'config.yaml'), 'version: 1\n');
  const taskLine = phase
    ? `- [ ] [phase:${phase}] TASK-001 Test task`
    : `- [ ] TASK-001 Test task`;
  fs.writeFileSync(path.join(changeDir, 'tasks.md'), taskLine + '\n');
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

describe('ApplyCommand TDD Phases', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('phase transition validation', () => {
    it('rejects invalid phase', async () => {
      const root = setupTempProject(null, 'red');
      const origCwd = process.cwd;
      process.cwd = () => root;
      try {
        const cmd = new ApplyCommand();
        await expect(cmd.execute('test-change', { phase: 'invalid' }))
          .rejects.toThrow("Invalid phase 'invalid'");
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });

    it('rejects backward phase transition', async () => {
      const root = setupTempProject(null, 'green');
      const origCwd = process.cwd;
      process.cwd = () => root;
      try {
        const cmd = new ApplyCommand();
        await expect(cmd.execute('test-change', { phase: 'red' }))
          .rejects.toThrow("Cannot go back to phase 'red'");
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });

    it('rejects skipping phases', async () => {
      const root = setupTempProject(null, 'red');
      const origCwd = process.cwd;
      process.cwd = () => root;
      try {
        const cmd = new ApplyCommand();
        await expect(cmd.execute('test-change', { phase: 'refactor' }))
          .rejects.toThrow("Cannot skip phase");
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });

    it('rejects executing done phase directly', async () => {
      const root = setupTempProject(null, 'green');
      const origCwd = process.cwd;
      process.cwd = () => root;
      try {
        const cmd = new ApplyCommand();
        await expect(cmd.execute('test-change', { phase: 'done' }))
          .rejects.toThrow("Cannot execute 'done' phase directly");
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });
  });

  describe('_executeRedPhase', () => {
    it('advances to green when all tests fail', async () => {
      const root = setupTempProject(null, 'red');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 1 });

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'red' });
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[phase:green]');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('RED phase'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });

    it('fails when tests pass in RED phase', async () => {
      const root = setupTempProject(null, 'red');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 0 });

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'red' });
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('RED Phase Violation'));
        expect(process.exitCode).toBe(1);
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });

    it('skips with --allow-no-tests when no test command', async () => {
      const root = setupTempProject(null, 'red');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'red', allowNoTests: true });
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[phase:green]');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('skipped'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });

    it('fails when no test command without --allow-no-tests', async () => {
      const root = setupTempProject(null, 'red');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'red' });
        expect(process.exitCode).toBe(1);
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });
  });

  describe('_executeGreenPhase', () => {
    it('advances to refactor when tests pass', async () => {
      const root = setupTempProject(null, 'green');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 0 });

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'green' });
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[phase:refactor]');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GREEN phase'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });

    it('stays on green when tests fail', async () => {
      const root = setupTempProject(null, 'green');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 1 });

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'green' });
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[phase:green]');
        expect(tasksContent).not.toContain('[phase:refactor]');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('still failing'));
        expect(process.exitCode).toBe(1);
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });

    it('skips with --allow-no-tests when no test command', async () => {
      const root = setupTempProject(null, 'green');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'green', allowNoTests: true });
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[phase:refactor]');
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });
  });

  describe('_executeRefactorPhase', () => {
    it('marks task done when tests pass', async () => {
      const root = setupTempProject(null, 'refactor');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 0 });

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'refactor' });
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[phase:done]');
        expect(tasksContent).toContain('[x]');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('complete'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });

    it('fails when tests fail during refactor', async () => {
      const root = setupTempProject(null, 'refactor');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 1 });

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'refactor' });
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('failing after refactoring'));
        expect(process.exitCode).toBe(1);
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });

    it('marks done with --allow-no-tests when no test command', async () => {
      const root = setupTempProject(null, 'refactor');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'refactor', allowNoTests: true });
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[x]');
        expect(tasksContent).toContain('[phase:done]');
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });
  });

  describe('_runTests', () => {
    it('retries without reporter on injection failure', async () => {
      const root = setupTempProject(null, 'green');
      const origCwd = process.cwd;
      process.cwd = () => root;

      const { injectReporter } = require('../src/utils/reporter-injector');
      injectReporter.mockReturnValueOnce({ command: 'npx stdd-reporter npm test', env: { FORCE_COLOR: '1' } });
      runCommand.mockReturnValueOnce({ status: 1 });

      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'green' });
        // Should retry with original command
        expect(runCommand).toHaveBeenCalledTimes(2);
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });
  });

  describe('runE2EProbe', () => {
    it('runs E2E command and captures evidence', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-e2e-'));
      const changeDir = path.join(root, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      runCommand.mockReturnValue({ status: 0 });

      const cmd = new ApplyCommand();
      const report = cmd.runE2EProbe('npx cypress run', root, changeDir);

      expect(report.status).toBe('pass');
      expect(report.command).toBe('npx cypress run');
      expect(report.evidence).toBeDefined();

      cleanup(root);
    });

    it('captures failure status', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-e2e-'));
      const changeDir = path.join(root, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      runCommand.mockReturnValue({ status: 1 });

      const cmd = new ApplyCommand();
      const report = cmd.runE2EProbe('npx cypress run', root, changeDir);
      expect(report.status).toBe('fail');

      cleanup(root);
    });
  });

  describe('dryRun mode', () => {
    it('prints test commands without executing in TDD mode', async () => {
      const root = setupTempProject(null, 'red');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'red', dryRun: true });
        expect(runCommand).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });

    it('prints no test configured in dryRun', async () => {
      const root = setupTempProject(null, 'red');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { phase: 'red', dryRun: true });
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No test command'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });
  });

  describe('branch coverage: updateTaskPhase adds phase to line without existing tag', () => {
    it('adds phase tag to task line that has no existing phase', async () => {
      const root = setupTempProject(null, 'red');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 1 }); // Tests fail = RED pass

      try {
        const cmd = new ApplyCommand();
        // The task line "- [ ] TASK-001 Test task" has NO [phase:...] tag
        // RED phase should add [phase:green] via the else branch at line 88
        await cmd.execute('test-change', { phase: 'red' });

        const tasksContent = fs.readFileSync(
          path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8'
        );
        // Phase should be added (line 88 branch: adds phase to line without existing tag)
        expect(tasksContent).toContain('[phase:green]');
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });
  });

  describe('branch coverage: legacy mode dryRun with no test commands', () => {
    it('prints no test command message in legacy dryRun mode', async () => {
      const root = setupTempProject(null, null);
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { dryRun: true });
        // Line 255: console.log(`  ${chalk.dim('No test command configured.')}`)
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No test command'));
        expect(runCommand).not.toHaveBeenCalled();
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });
  });

  describe('branch coverage: GREEN phase no test command without allow-no-tests', () => {
    it('fails GREEN phase when no test command and allowNoTests is false', async () => {
      const root = setupTempProject(null, 'green');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change');
        // Lines 419-420: failNoTestCommand(TDD_PHASES.GREEN) and return
        expect(process.exitCode).toBe(1);
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GREEN Phase'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });
  });

  describe('branch coverage: REFACTOR phase no test command without allow-no-tests', () => {
    it('fails REFACTOR phase when no test command and allowNoTests is false', async () => {
      const root = setupTempProject(null, 'refactor');
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change');
        // Lines 500-501: failNoTestCommand(TDD_PHASES.REFACTOR) and return
        expect(process.exitCode).toBe(1);
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('REFACTOR Phase'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });
  });

  describe('legacy mode (no phase tags)', () => {
    it('blocks a green suite when no RED evidence exists for the task (P0-1 anti fake-green)', async () => {
      const root = setupTempProject(null, null);
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 0 }); // old suite is green

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change');
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        // Task must stay pending: a green suite without a recorded RED
        // proves nothing about unimplemented work.
        expect(tasksContent).toContain('[ ]');
        expect(tasksContent).not.toContain('[x]');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Green without RED'));
        expect(process.exitCode).toBe(1);
        // The block is auditable in the apply log
        const applyLog = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'apply.log'), 'utf8');
        expect(applyLog).toContain('blocked-no-red-evidence');
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });

    it('completes the task once a failed run recorded RED evidence, then tests go green', async () => {
      const root = setupTempProject(null, null);
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);

      try {
        const cmd = new ApplyCommand();
        // 1. RED: the new test fails against missing implementation —
        //    recorded in the log (fix-packet flow), task reverts to pending.
        runCommand.mockReturnValue({ status: 1 });
        await cmd.execute('test-change');

        // 2. GREEN: same task now passes and has prior RED evidence.
        runCommand.mockReturnValue({ status: 0 });
        await cmd.execute('test-change');

        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[x]');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('passed tests'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });

    it('a no-test-command config failure does NOT count as RED evidence (OCR high finding)', async () => {
      const root = setupTempProject(null, null);
      const origCwd = process.cwd;
      process.cwd = () => root;

      try {
        const changeDir = path.join(root, 'stdd', 'changes', 'test-change');
        // Simulate the legacy no-test-command failure entry verbatim:
        // status failed, command '(none)', error set — never ran a test.
        fs.writeFileSync(path.join(changeDir, 'apply.log'),
          `[${new Date().toISOString()}] ${JSON.stringify({
            change: 'test-change',
            task: 'TASK-001 Test task',
            command: '(none)',
            workspaces: [],
            status: 'failed',
            error: 'No test command configured. TDD requires tests to run.',
          })}\n`);

        resolveTestCommands.mockReturnValue([{
          command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
        }]);
        runCommand.mockReturnValue({ status: 0 }); // suite green

        const cmd = new ApplyCommand();
        await cmd.execute('test-change');
        const tasksContent = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
        // The config failure must not unlock completion — still blocked.
        expect(tasksContent).toContain('[ ]');
        expect(tasksContent).not.toContain('[x]');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Green without RED'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });

    it('completes without RED evidence only via --allow-no-tests, recorded in the log', async () => {
      const root = setupTempProject(null, null);
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 0 });

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { allowNoTests: true });
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[x]');
        const applyLog = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'apply.log'), 'utf8');
        expect(applyLog).toContain('--allow-no-tests');
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });

    it('reverts task when tests fail in legacy mode', async () => {
      const root = setupTempProject(null, null);
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);
      runCommand.mockReturnValue({ status: 1 });

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change');
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[ ]');
        expect(tasksContent).not.toContain('[x]');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('reverted'));
        expect(process.exitCode).toBe(1);
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });

    it('fails in legacy mode when no test command configured', async () => {
      const root = setupTempProject(null, null);
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change');
        expect(process.exitCode).toBe(1);
        const tasksContent = fs.readFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), 'utf8');
        expect(tasksContent).toContain('[ ]');
      } finally {
        process.cwd = origCwd;
        cleanup(root);
        process.exitCode = 0;
      }
    });

    it('dry runs in legacy mode', async () => {
      const root = setupTempProject(null, null);
      const origCwd = process.cwd;
      process.cwd = () => root;
      resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: root, workspaceName: 'root', source: 'root',
      }]);

      try {
        const cmd = new ApplyCommand();
        await cmd.execute('test-change', { dryRun: true });
        expect(runCommand).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
      } finally {
        process.cwd = origCwd;
        cleanup(root);
      }
    });
  });
});
