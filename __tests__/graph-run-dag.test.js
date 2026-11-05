/**
 * Tests for the DAG engine enhancements in graph run
 * (cross-framework adoption):
 *
 * - D1 Progressive rigor (OpenSpec): intents map to a rigor level
 *   (light/standard/strict); rigor scales per-node gates instead of
 *   applying identical ceremony to every intent. Explicit --rigor wins.
 * - D2 Node retry + delegation evidence (superpowers fix-loop): failed
 *   nodes retry up to N times; a final failure records a delegation
 *   suggestion and persists the run result for resume.
 * - D3 Idempotent checkpoint cache (wiring the existing GraphCacheManager
 *   into graph run): successful nodes are cached per change+intent+rigor
 *   and skipped on re-runs (checkpoint resume); cache lives in the
 *   project's stdd/graph/cache, not the package root.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { GraphRunCommand } = require('../src/cli/commands/graph-run');
const { FFCommand } = require('../src/cli/commands/ff');
const { SpecGenerator } = require('../src/cli/commands/spec-generator');
const { ApplyCommand } = require('../src/cli/commands/apply');
const { VerifyCommand } = require('../src/cli/commands/verify');
const { ArchiveCommand } = require('../src/cli/commands/archive');
const { FixPacketCommand } = require('../src/cli/commands/fix-packet');
const { OutsideInCommand } = require('../src/cli/commands/outside-in');

jest.mock('../src/cli/commands/ff');
jest.mock('../src/cli/commands/spec-generator');
jest.mock('../src/cli/commands/apply');
jest.mock('../src/cli/commands/verify');
jest.mock('../src/cli/commands/archive');
jest.mock('../src/cli/commands/fix-packet');
jest.mock('../src/cli/commands/outside-in');

function mockAllNodesOk() {
  FFCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
  SpecGenerator.mockImplementation(() => ({ generateFromTasks: jest.fn().mockResolvedValue({}) }));
  ApplyCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
  VerifyCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
  ArchiveCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
  FixPacketCommand.mockImplementation(() => ({ execute: jest.fn().mockReturnValue({ output: 'x', jsonOutput: {} }) }));
  OutsideInCommand.mockImplementation(() => ({ execute: jest.fn().mockReturnValue({}) }));
}

describe('GraphRunCommand DAG enhancements', () => {
  let tempRoot;
  let originalCwd;
  let logSpy;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-dag-'));
    fs.mkdirSync(path.join(tempRoot, 'stdd', 'changes'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'stdd', 'specs'), { recursive: true });
    process.chdir(tempRoot);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAllNodesOk();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    logSpy.mockRestore();
    fs.rmSync(tempRoot, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('D1: progressive rigor', () => {
    it('maps intents to default rigor levels', () => {
      const cmd = new GraphRunCommand();
      expect(cmd._resolveRigor('hotfix', {})).toBe('light');
      expect(cmd._resolveRigor('research', {})).toBe('light');
      expect(cmd._resolveRigor('feature', {})).toBe('standard');
      expect(cmd._resolveRigor('repair', {})).toBe('standard');
    });

    it('lets an explicit --rigor override the intent default', () => {
      const cmd = new GraphRunCommand();
      expect(cmd._resolveRigor('hotfix', { rigor: 'strict' })).toBe('strict');
      expect(cmd._resolveRigor('feature', { rigor: 'light' })).toBe('light');
    });

    it('rejects an invalid rigor level', () => {
      const cmd = new GraphRunCommand();
      expect(() => cmd._resolveRigor('feature', { rigor: 'extreme' })).toThrow(/rigor/);
    });

    it('scales verify/archive gates by rigor (light loosens, strict tightens)', async () => {
      const verifyCalls = [];
      const archiveCalls = [];
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async (name, opts) => { verifyCalls.push(opts); }),
      }));
      ArchiveCommand.mockImplementation(() => ({
        execute: jest.fn(async (name, opts) => { archiveCalls.push(opts); }),
      }));

      await new GraphRunCommand().execute('hotfix', { changeName: 'rigor-light', noCache: true });

      expect(verifyCalls[0]).toMatchObject({ constitution: false });
      expect(archiveCalls[0]).toMatchObject({ skipStrict: true });

      verifyCalls.length = 0;
      archiveCalls.length = 0;

      // hotfix includes the archive node; explicit strict overrides its light default.
      await new GraphRunCommand().execute('hotfix', { changeName: 'rigor-strict', rigor: 'strict', noCache: true });

      expect(verifyCalls[0]).toMatchObject({ lint: true });
      expect(archiveCalls[0]).toEqual(expect.not.objectContaining({ skipStrict: true }));
    });

    it('keeps explicit user node options over rigor defaults', async () => {
      const verifyCalls = [];
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async (name, opts) => { verifyCalls.push(opts); }),
      }));

      await new GraphRunCommand().execute('hotfix', {
        changeName: 'rigor-user-wins',
        noCache: true,
        verifyOptions: { constitution: true },
      });

      expect(verifyCalls[0]).toMatchObject({ constitution: true });
    });
  });

  describe('D2: node retry + delegation evidence', () => {
    it('retries a failing node until it succeeds', async () => {
      let calls = 0;
      ApplyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => {
          calls++;
          if (calls < 3) throw new Error('flaky');
          return {};
        }),
      }));

      const cmd = new GraphRunCommand();
      const result = await cmd.execute('feature', { changeName: 'retry-ok', noCache: true, retry: 2 });

      const applyStep = result.steps.find(s => s.node === 'stdd-apply');
      expect(applyStep.status).toBe('success');
      expect(applyStep.attempts).toBe(3);
      expect(result.failedAt).toBeNull();
    });

    it('records delegation guidance and persists the run result on final failure', async () => {
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => { throw new Error('tests exploded'); }),
      }));

      const cmd = new GraphRunCommand();
      process.exitCode = 0;
      const result = await cmd.execute('feature', { changeName: 'retry-fail', noCache: true, retry: 1 });

      expect(result.failedAt).toBe('stdd-verify');
      const failedStep = result.steps.find(s => s.node === 'stdd-verify');
      expect(failedStep.status).toBe('failed');
      expect(failedStep.attempts).toBe(2);
      expect(failedStep.delegation).toBeDefined();
      expect(failedStep.delegation.suggestedEngines.length).toBeGreaterThan(0);

      // Run result persisted for resume / handoff.
      const persisted = JSON.parse(fs.readFileSync(
        path.join(tempRoot, 'stdd', 'changes', 'retry-fail', 'graph-run-result.json'), 'utf8'
      ));
      expect(persisted.failedAt).toBe('stdd-verify');
      process.exitCode = 0;
    });
  });

  describe('D3: checkpoint cache resume', () => {
    it('skips previously successful nodes on a re-run (checkpoint resume)', async () => {
      let verifyRuns = 0;
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => { verifyRuns++; }),
      }));

      const first = await new GraphRunCommand().execute('feature', { changeName: 'cache-demo' });
      expect(first.steps.find(s => s.node === 'stdd-verify').status).toBe('success');

      const second = await new GraphRunCommand().execute('feature', { changeName: 'cache-demo' });
      const cachedStep = second.steps.find(s => s.node === 'stdd-verify');
      expect(cachedStep.status).toBe('cached');
      expect(verifyRuns).toBe(1); // not re-executed

      // Cache lives in the project, not the package root.
      expect(fs.existsSync(path.join(tempRoot, 'stdd', 'graph', 'cache'))).toBe(true);
    });

    it('re-executes everything with --no-cache', async () => {
      let verifyRuns = 0;
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => { verifyRuns++; }),
      }));

      await new GraphRunCommand().execute('feature', { changeName: 'nocache-demo', noCache: true });
      await new GraphRunCommand().execute('feature', { changeName: 'nocache-demo', noCache: true });

      expect(verifyRuns).toBe(2);
    });

    it('treats a different rigor as a different checkpoint', async () => {
      await new GraphRunCommand().execute('feature', { changeName: 'rigor-cache', rigor: 'standard' });
      const second = await new GraphRunCommand().execute('feature', { changeName: 'rigor-cache', rigor: 'strict' });
      expect(second.steps.find(s => s.node === 'stdd-verify').status).toBe('success'); // re-executed
    });
  });
});
