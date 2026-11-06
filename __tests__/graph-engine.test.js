/**
 * Tests for the Skill Graph engine enhancements:
 *
 * - E1 Layered parallel execution: nodes in the same topological layer run
 *   concurrently (bounded by graph.max_parallel); --sequential forces the
 *   old linear behavior. Node option injection must be isolated per node so
 *   concurrent verify/archive options never race.
 * - E2 Project-defined intents: stdd/graph/intents.yaml lets a project add
 *   or override intent pathways without touching the package.
 * - E3 Retry safety: --retry only applies to read-only nodes; side-effect
 *   nodes (propose/spec/apply/...) fail fast instead of re-running blind.
 *   Node failures run through ErrorPropagator to locate the re-planning
 *   decision point.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('../src/cli/commands/ff');
jest.mock('../src/cli/commands/spec-generator');
jest.mock('../src/cli/commands/apply');
jest.mock('../src/cli/commands/verify');
jest.mock('../src/cli/commands/archive');
jest.mock('../src/cli/commands/fix-packet');
jest.mock('../src/cli/commands/outside-in');
jest.mock('../src/cli/commands/explore');
jest.mock('../src/cli/commands/elicitation');

const { FFCommand } = require('../src/cli/commands/ff');
const { SpecGenerator } = require('../src/cli/commands/spec-generator');
const { ApplyCommand } = require('../src/cli/commands/apply');
const { VerifyCommand } = require('../src/cli/commands/verify');
const { ArchiveCommand } = require('../src/cli/commands/archive');
const { FixPacketCommand } = require('../src/cli/commands/fix-packet');
const { OutsideInCommand } = require('../src/cli/commands/outside-in');
const { ExploreCommand } = require('../src/cli/commands/explore');
const { ElicitationCommand } = require('../src/cli/commands/elicitation');
const { GraphRunCommand } = require('../src/cli/commands/graph-run');
const DynamicGraphRouter = require('../src/utils/dynamic-router');

function mockAllOk() {
  FFCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
  SpecGenerator.mockImplementation(() => ({ generateFromTasks: jest.fn().mockResolvedValue({}) }));
  ApplyCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
  VerifyCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
  ArchiveCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
  FixPacketCommand.mockImplementation(() => ({ execute: jest.fn().mockReturnValue({ output: 'x', jsonOutput: {} }) }));
  OutsideInCommand.mockImplementation(() => ({ execute: jest.fn().mockReturnValue({}) }));
  ExploreCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
  ElicitationCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
}

describe('Skill Graph engine enhancements', () => {
  let tempRoot;
  let originalCwd;
  let logSpy;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-engine-'));
    fs.mkdirSync(path.join(tempRoot, 'stdd', 'changes'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'stdd', 'specs'), { recursive: true });
    process.chdir(tempRoot);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAllOk();
    process.exitCode = 0;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    logSpy.mockRestore();
    fs.rmSync(tempRoot, { recursive: true, force: true });
    jest.restoreAllMocks();
    process.exitCode = 0;
  });

  function writeIntentsYaml(spec) {
    const dir = path.join(tempRoot, 'stdd', 'graph');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'intents.yaml'), spec, 'utf8');
  }

  describe('E2: project-defined intents', () => {
    it('adds a custom intent pathway from stdd/graph/intents.yaml', () => {
      writeIntentsYaml([
        'intents:',
        '  release:',
        '    description: release gate',
        '    path:',
        '      - stdd-verify',
        '      - stdd-archive',
        '      - stdd-commit',
      ].join('\n'));

      const router = new DynamicGraphRouter();
      const graph = router.compile('release');

      expect(Object.keys(graph.skills)).toEqual(['stdd-verify', 'stdd-archive', 'stdd-commit']);
      expect(graph.name).toContain('RELEASE');
    });

    it('a project intent overrides a built-in of the same name', () => {
      writeIntentsYaml([
        'intents:',
        '  hotfix:',
        '    path:',
        '      - stdd-verify',
      ].join('\n'));

      const router = new DynamicGraphRouter();
      expect(Object.keys(router.compile('hotfix').skills)).toEqual(['stdd-verify']);
    });

    it('graph run executes a custom intent end to end', async () => {
      writeIntentsYaml([
        'intents:',
        '  release:',
        '    path:',
        '      - stdd-verify',
        '      - stdd-archive',
      ].join('\n'));

      const result = await new GraphRunCommand().execute('release', { changeName: 'rel-demo', noCache: true });

      expect(result.steps.map(s => s.node)).toEqual(['stdd-verify', 'stdd-archive']);
      expect(result.failedAt).toBeNull();
    });

    it('accepts the array shorthand and rejects invalid pathway shapes', () => {
      writeIntentsYaml([
        'intents:',
        '  arrayshorthand:',
        '    - stdd-verify',
        '  badnode:',
        '    path: [stdd-verify, 42]',
        '  emptypath:',
        '    path: []',
        '  nopath: {}',
      ].join('\n'));

      const router = new DynamicGraphRouter();
      // Array shorthand accepted.
      expect(Object.keys(router.compile('arrayshorthand').skills)).toEqual(['stdd-verify']);
      // Invalid shapes are not registered: compile falls back to the feature pathway.
      const featureNodes = Object.keys(router.compile('feature').skills);
      expect(Object.keys(router.compile('badnode').skills)).toEqual(featureNodes);
      expect(Object.keys(router.compile('emptypath').skills)).toEqual(featureNodes);
      expect(Object.keys(router.compile('nopath').skills)).toEqual(featureNodes);
    });

    it('tolerates an empty file and null intent definitions', () => {
      const dir = path.join(tempRoot, 'stdd', 'graph');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'intents.yaml'), '', 'utf8');
      let router = new DynamicGraphRouter();
      expect(Object.keys(router.compile('feature').skills).length).toBeGreaterThan(0);

      writeIntentsYaml('intents:\n  nul:\n');
      router = new DynamicGraphRouter();
      const featureNodes = Object.keys(router.compile('feature').skills);
      expect(Object.keys(router.compile('nul').skills)).toEqual(featureNodes);
    });

    it('ignores a malformed intents.yaml (built-ins still work)', () => {
      const dir = path.join(tempRoot, 'stdd', 'graph');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'intents.yaml'), 'intents: [broken', 'utf8');

      const router = new DynamicGraphRouter();
      expect(Object.keys(router.compile('feature').skills).length).toBeGreaterThan(0);
    });
  });

  describe('E1: layered parallel execution', () => {
    it('runs independent nodes of the same layer concurrently', async () => {
      // Custom intent with a fan-out: after verify, archive and commit are
      // independent of each other -> same topological layer.
      writeIntentsYaml([
        'intents:',
        '  fan:',
        '    path:',
        '      - stdd-verify',
        '      - stdd-archive',
      ].join('\n'));
      const running = new Set();
      const peak = { value: 0 };
      const track = name => jest.fn(async () => {
        running.add(name);
        peak.value = Math.max(peak.value, running.size);
        await new Promise(r => setTimeout(r, 40));
        running.delete(name);
      });
      // Layer 2 of the fan graph: explore + brainstorm run concurrently.
      ExploreCommand.mockImplementation(() => ({ execute: track('explore') }));
      ElicitationCommand.mockImplementation(() => ({ execute: track('brainstorm') }));

      const cmd = new GraphRunCommand();
      // Override the router with the fan graph (verify -> [archive]) by
      // injecting dependencies manually: use a custom pathway where two
      // nodes share the same single dependency.
      const origCompile = DynamicGraphRouter.prototype.compile;
      DynamicGraphRouter.prototype.compile = function (intent) {
        if (intent === 'fan') {
          const graph = {
            version: '1.0', name: 'FAN', config: {},
            skills: {
              'stdd-verify': { depends_on: [] },
              'stdd-explore': { depends_on: ['stdd-verify'] },
              'stdd-brainstorm': { depends_on: ['stdd-verify'] },
            },
          };
          return graph;
        }
        return origCompile.call(this, intent);
      };

      try {
        const result = await cmd.execute('fan', { changeName: 'fan-demo', noCache: true });
        // explore and brainstorm share layer 2 -> concurrent (peak 2).
        expect(peak.value).toBe(2);
        expect(result.steps.map(s => s.node)).toContain('stdd-explore');
        expect(result.steps.map(s => s.node)).toContain('stdd-brainstorm');
      } finally {
        DynamicGraphRouter.prototype.compile = origCompile;
      }
    });

    it('--sequential forces linear execution (no concurrency)', async () => {
      const origCompile = DynamicGraphRouter.prototype.compile;
      DynamicGraphRouter.prototype.compile = function (intent) {
        if (intent === 'fan') {
          return {
            version: '1.0', name: 'FAN', config: {},
            skills: {
              'stdd-verify': { depends_on: [] },
              'stdd-explore': { depends_on: ['stdd-verify'] },
              'stdd-brainstorm': { depends_on: ['stdd-verify'] },
            },
          };
        }
        return origCompile.call(this, intent);
      };
      const running = new Set();
      const peak = { value: 0 };
      const track = () => jest.fn(async () => {
        running.add('n');
        peak.value = Math.max(peak.value, running.size);
        await new Promise(r => setTimeout(r, 40));
        running.delete('n');
      });
      ExploreCommand.mockImplementation(() => ({ execute: track() }));
      ElicitationCommand.mockImplementation(() => ({ execute: track() }));

      try {
        const result = await new GraphRunCommand().execute('fan', { changeName: 'seq-demo', noCache: true, sequential: true });
        expect(result.failedAt).toBeNull();
        expect(peak.value).toBe(1); // strictly linear
      } finally {
        DynamicGraphRouter.prototype.compile = origCompile;
      }
    });

    it('per-node rigor options do not leak across concurrent nodes', async () => {
      const origCompile = DynamicGraphRouter.prototype.compile;
      const seenOpts = {};
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async (name, opts) => { seenOpts.verify = { ...opts }; }),
      }));
      ArchiveCommand.mockImplementation(() => ({
        execute: jest.fn(async (name, opts) => { seenOpts.archive = { ...opts }; }),
      }));
      DynamicGraphRouter.prototype.compile = function (intent) {
        if (intent === 'duo') {
          return {
            version: '1.0', name: 'DUO', config: {},
            skills: { 'stdd-verify': { depends_on: [] }, 'stdd-archive': { depends_on: [] } },
          };
        }
        return origCompile.call(this, intent);
      };

      try {
        // light rigor: verify gets constitution:false, archive skipStrict:true.
        await new GraphRunCommand().execute('duo', { changeName: 'iso-demo', noCache: true, rigor: 'light' });
        expect(seenOpts.verify.constitution).toBe(false);
        expect(seenOpts.verify.skipStrict).toBeUndefined();
        expect(seenOpts.archive.skipStrict).toBe(true);
        expect(seenOpts.archive.constitution).toBeUndefined();
      } finally {
        DynamicGraphRouter.prototype.compile = origCompile;
      }
    });
  });

  describe('E4: node timeout', () => {
    it('fails a node that exceeds --node-timeout and records the timeout', async () => {
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(() => new Promise(r => setTimeout(r, 500))),
      }));

      const result = await new GraphRunCommand().execute('feature', {
        changeName: 'timeout-demo', noCache: true, nodeTimeout: 0.1,
      });

      expect(result.failedAt).toBe('stdd-verify');
      const step = result.steps.find(s => s.node === 'stdd-verify');
      expect(step.status).toBe('failed');
      expect(step.error).toMatch(/timed out/i);
      expect(step.timedOut).toBe(true);
    });

    it('no timeout by default (long node completes)', async () => {
      let done = false;
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => { await new Promise(r => setTimeout(r, 120)); done = true; }),
      }));

      const result = await new GraphRunCommand().execute('feature', { changeName: 'slow-demo', noCache: true });
      expect(result.failedAt).toBeNull();
      expect(done).toBe(true);
    });
  });

  describe('E5: content-level retry classification', () => {
    it('retries a side-effect node whose error is transient (network/timeout)', async () => {
      let calls = 0;
      ApplyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => {
          calls++;
          if (calls < 2) throw new Error('ETIMEDOUT network blip');
          return {};
        }),
      }));

      const result = await new GraphRunCommand().execute('feature', { changeName: 'transient-demo', noCache: true, retry: 2 });

      expect(result.failedAt).toBeNull();
      expect(calls).toBe(2);
    });

    it('does not retry a side-effect node on a deterministic error', async () => {
      let calls = 0;
      ApplyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => { calls++; throw new Error('syntax error in config'); }),
      }));

      const result = await new GraphRunCommand().execute('feature', { changeName: 'det-demo', noCache: true, retry: 2 });

      expect(result.failedAt).toBe('stdd-apply');
      expect(calls).toBe(1);
    });
  });

  describe('E6: graph run writes execution history evidence', () => {
    it('persists an evidence entry visible to stdd graph history', async () => {
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => { process.exitCode = 1; }),
      }));

      // Simulate the real flow: the propose node has created the change dir.
      fs.mkdirSync(path.join(tempRoot, 'stdd', 'changes', 'hist-demo'), { recursive: true });
      const cmd = new GraphRunCommand();
      await cmd.execute('feature', { changeName: 'hist-demo', noCache: true });
      process.exitCode = 0;

      const evDir = path.join(tempRoot, 'stdd', 'changes', 'hist-demo', 'evidence');
      const files = fs.readdirSync(evDir).filter(f => f.startsWith('graph-run'));
      expect(files.length).toBe(1);
      const payload = JSON.parse(fs.readFileSync(path.join(evDir, files[0]), 'utf8'));
      expect(payload.results.failedAt).toBe('stdd-verify');
      expect(payload.metadata.changeName).toBe('hist-demo');

      // Visible to the history scanner.
      const { GraphHistoryCommand } = require('../src/cli/commands/graph-history');
      const entries = new GraphHistoryCommand(tempRoot).scanEvidence();
      expect(entries.some(e => e.changeName === 'hist-demo')).toBe(true);
    });

    it('records successful runs too', async () => {
      fs.mkdirSync(path.join(tempRoot, 'stdd', 'changes', 'hist-ok'), { recursive: true });
      await new GraphRunCommand().execute('feature', { changeName: 'hist-ok', noCache: true });
      const evDir = path.join(tempRoot, 'stdd', 'changes', 'hist-ok', 'evidence');
      const files = fs.readdirSync(evDir).filter(f => f.startsWith('graph-run'));
      expect(files.length).toBe(1);
      const payload = JSON.parse(fs.readFileSync(path.join(evDir, files[0]), 'utf8'));
      expect(payload.results.failedAt).toBeNull();
    });
  });

  describe('E7: precise failure attribution in parallel layers', () => {
    it('verify/archive failures throw via throwOnFailure — no sibling mis-attribution', async () => {
      // Two concurrent verify-like nodes; one fails via exitCode, one is clean.
      const origCompile = DynamicGraphRouter.prototype.compile;
      DynamicGraphRouter.prototype.compile = function (intent) {
        if (intent === 'duo') {
          return {
            version: '1.0', name: 'DUO', config: {},
            skills: { 'stdd-verify': { depends_on: [] }, 'stdd-archive': { depends_on: [] } },
          };
        }
        return origCompile.call(this, intent);
      };
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async function (name, opts) {
          await new Promise(r => setTimeout(r, 30));
          if (opts && opts.throwOnFailure) {
            // Simulate the real verify behavior under throwOnFailure: fail.
            process.exitCode = 1;
            throw new Error('verification failed');
          }
        }),
      }));
      ArchiveCommand.mockImplementation(() => ({
        execute: jest.fn(async function (name, opts) {
          await new Promise(r => setTimeout(r, 10));
          // Clean node resolving AFTER the sibling set exitCode=1 must NOT
          // be failed by the outer exit-code heuristic.
          void opts;
        }),
      }));

      try {
        const result = await new GraphRunCommand().execute('duo', { changeName: 'attr-demo', noCache: true });
        expect(result.failedAt).toBe('stdd-verify');
        const archiveStep = result.steps.find(s => s.node === 'stdd-archive');
        expect(archiveStep.status).toBe('success');
      } finally {
        DynamicGraphRouter.prototype.compile = origCompile;
        process.exitCode = 0;
      }
    });
  });

  describe('E3: retry safety + error propagation', () => {
    it('does NOT retry side-effect nodes (fail fast, one attempt)', async () => {
      let applyCalls = 0;
      ApplyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => { applyCalls++; throw new Error('impl failed'); }),
      }));

      const result = await new GraphRunCommand().execute('feature', { changeName: 'noretry-demo', noCache: true, retry: 3 });

      expect(result.failedAt).toBe('stdd-apply');
      expect(applyCalls).toBe(1);
      const step = result.steps.find(s => s.node === 'stdd-apply');
      expect(step.deployment).toBeUndefined();
      expect(step.retrySkipped).toBe(true);
    });

    it('still retries read-only nodes (verify)', async () => {
      let verifyCalls = 0;
      VerifyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => { verifyCalls++; throw new Error('flaky'); }),
      }));

      const result = await new GraphRunCommand().execute('feature', { changeName: 'retry-ro', noCache: true, retry: 2 });

      expect(result.failedAt).toBe('stdd-verify');
      expect(verifyCalls).toBe(3); // 1 + 2 retries
    });

    it('records a re-planning decision point via the error propagator', async () => {
      ApplyCommand.mockImplementation(() => ({
        execute: jest.fn(async () => { throw new Error('boom'); }),
      }));

      const result = await new GraphRunCommand().execute('feature', { changeName: 'prop-demo', noCache: true });

      const step = result.steps.find(s => s.node === 'stdd-apply');
      expect(step.propagation).toBeDefined();
      expect(typeof step.propagation.decisionPoint).toBe('string');
    });
  });
});
