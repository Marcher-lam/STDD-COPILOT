/**
 * Regression tests for the open-code-review findings
 * (1 critical, 5 high, and the medium gate-interlock / security class).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { parseTasks } = require('../src/utils/change-utils');
const { applyDelta } = require('../src/utils/delta-spec');
const { rigorNodeOptions } = require('../src/utils/rigor');
const { recordInterruption } = require('../src/utils/interruption');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

function createProject(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-review-fix-'));
  roots.push(root);
  const projectPath = path.join(root, name);
  fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });
  return projectPath;
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('CRITICAL plan: fed-back deferred items must not be tasks', () => {
  it('writes intelligence items in a non-checkbox format that parseTasks ignores', () => {
    const projectPath = createProject('plan-intel');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'next');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'),
      '# Proposal: Next\n\n## description\nNext feature\n', 'utf8');
    // Older and newer archives: lexicographic sort would pick zeta (Jan),
    // timestamp sort must pick alpha (Nov).
    for (const [name, item] of [
      ['zeta-login-20260101000000', true],
      ['alpha-auth-20261105120000', true],
      ['no-timestamp-dir', false],
    ]) {
      const dir = path.join(projectPath, 'stdd', 'changes', 'archive', name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');
      if (item) {
        fs.writeFileSync(path.join(dir, 'deferred-work.md'),
          `# Deferred Work\n\n- [ ] #1 [${name.slice(0, 4) === 'zet' ? '2026-01-01' : '2026-11-05'}] From ${name} (source: verify)\n`, 'utf8');
      }
    }

    const result = runCli(['plan', 'next'], projectPath);

    expect(result.status).toBe(0);
    const tasks = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
    // The fed-back item must NOT look like a task checkbox.
    const parsed = parseTasks(path.join(changeDir, 'tasks.md')) || [];
    const intelTasks = parsed.filter(t => /From /.test(t.description));
    expect(intelTasks).toEqual([]);
    // Latest = by trailing timestamp, not lexicographic: alpha (Nov), not zeta (Jan).
    expect(tasks).toContain('From alpha-auth-20261105120000');
    expect(tasks).not.toContain('From zeta-login-20260101000000');
  });
});

describe('HIGH confirm: pending-human has an exit path', () => {
  function setup(name, options = {}) {
    const projectPath = createProject(name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'),
      '# Proposal: X\n\n## description\nA feature\n\n## scope\n- a\n\n## success_criteria\n- b\n', 'utf8');
    fs.writeFileSync(path.join(projectPath, 'stdd', 'config.yaml'),
      `hitl:\n  mode: "risk-triggered"\n${options.certainty !== undefined
        ? `certainty:\n  confirm_threshold: ${options.confirmThreshold ?? 'weird-nan'}\n  auto_threshold: 0.95\n`
        : ''}`, 'utf8');
    if (options.certainty !== undefined) {
      const memDir = path.join(projectPath, 'stdd', 'memory');
      fs.mkdirSync(memDir, { recursive: true });
      fs.writeFileSync(path.join(memDir, 'certainty-history.jsonl'),
        `not-json{{{ corrupted line\n${JSON.stringify({ context: 'demo', overall: options.certainty })}\n`, 'utf8');
    }
    return { projectPath, changeDir };
  }

  it('--skip resolves pending-human as an explicit human override', () => {
    const { projectPath, changeDir } = setup('confirm-skip');
    const result = runCli(['confirm', 'demo', '--skip'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.readFileSync(path.join(projectPath, 'stdd', '.status.yaml'), 'utf8')).toContain('status: confirmed');
    const decision = JSON.parse(fs.readFileSync(path.join(changeDir, 'confirm-decision.json'), 'utf8'));
    expect(decision.status).toBe('manual-override');
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  it('non-numeric thresholds fall back to defaults instead of failing open', () => {
    const { projectPath } = setup('confirm-nan', { certainty: 0.5, confirmThreshold: '"abc"' });

    const result = runCli(['confirm', 'demo'], projectPath);

    // With the default confirm threshold 0.7 and certainty 0.5, the gate must
    // still demand a human (no NaN fail-open).
    expect(result.stdout).toContain('needs human confirmation');
  });

  it('skips corrupt JSONL lines and matches context by basename', () => {
    const { projectPath } = setup('confirm-jsonl', { certainty: 0.5, confirmThreshold: 0.7 });

    const result = runCli(['confirm', 'demo'], projectPath);

    // The valid line (overall 0.5 < 0.7) is read despite the corrupt first
    // line — the reason cites the threshold, not "no certainty on record".
    expect(result.stdout).toContain('0.5 < confirm threshold');
  });

  it('no longer blocks on common words like auth in the change wording', () => {
    const projectPath = createProject('confirm-authword');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'),
      '# Proposal: add-user-auth\n\n## description\nSmall auth polish on the login form\n\n## scope\n- a\n\n## success_criteria\n- b\n', 'utf8');
    fs.writeFileSync(path.join(projectPath, 'stdd', 'config.yaml'), 'hitl:\n  mode: "risk-triggered"\n', 'utf8');
    const memDir = path.join(projectPath, 'stdd', 'memory');
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(path.join(memDir, 'certainty-history.jsonl'),
      `${JSON.stringify({ context: 'demo', overall: 0.97 })}\n`, 'utf8');

    const result = runCli(['confirm', 'demo'], projectPath);

    expect(result.stdout).toContain('auto-approved');
  });
});

describe('HIGH graph-run: exitCode failures are not checkpoints', () => {
  // Mock all node commands (same style as graph-run-dag.test.js) so graph-run
  // tests never execute real workflows in this repository.
  jest.mock('../src/cli/commands/ff');
  jest.mock('../src/cli/commands/spec-generator');
  jest.mock('../src/cli/commands/apply');
  jest.mock('../src/cli/commands/verify');
  jest.mock('../src/cli/commands/archive');
  jest.mock('../src/cli/commands/fix-packet');
  jest.mock('../src/cli/commands/outside-in');

  const { FFCommand } = require('../src/cli/commands/ff');
  const { SpecGenerator } = require('../src/cli/commands/spec-generator');
  const { ApplyCommand } = require('../src/cli/commands/apply');
  const { VerifyCommand } = require('../src/cli/commands/verify');
  const { ArchiveCommand } = require('../src/cli/commands/archive');
  const { FixPacketCommand } = require('../src/cli/commands/fix-packet');
  const { OutsideInCommand } = require('../src/cli/commands/outside-in');
  const { GraphRunCommand } = require('../src/cli/commands/graph-run');

  let tempRoot;
  let originalCwd;
  let logSpy;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-grfix-'));
    fs.mkdirSync(path.join(tempRoot, 'stdd', 'changes'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'stdd', 'specs'), { recursive: true });
    process.chdir(tempRoot);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    FFCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
    SpecGenerator.mockImplementation(() => ({ generateFromTasks: jest.fn().mockResolvedValue({}) }));
    ApplyCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
    VerifyCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
    ArchiveCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
    FixPacketCommand.mockImplementation(() => ({ execute: jest.fn().mockReturnValue({ output: 'x', jsonOutput: {} }) }));
    OutsideInCommand.mockImplementation(() => ({ execute: jest.fn().mockReturnValue({}) }));
    process.exitCode = 0;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    logSpy.mockRestore();
    fs.rmSync(tempRoot, { recursive: true, force: true });
    jest.restoreAllMocks();
    process.exitCode = 0;
  });

  it('a verify node that sets exitCode=1 fails the node and is not cached', async () => {
    VerifyCommand.mockImplementation(() => ({
      execute: jest.fn(async () => { process.exitCode = 1; }),
    }));

    const cmd = new GraphRunCommand();
    const result = await cmd.execute('feature', { changeName: 'exitcode-demo' });

    expect(result.failedAt).toBe('stdd-verify');
    const step = result.steps.find(s => s.node === 'stdd-verify');
    expect(step.status).toBe('failed');
    expect(step.delegation).toBeDefined();
    // Nothing cached for the failed node: a re-run re-executes (fails again,
    // not "cached").
    const again = await cmd.execute('feature', { changeName: 'exitcode-demo' });
    const againStep = again.steps.find(s => s.node === 'stdd-verify');
    expect(againStep.status).toBe('failed');
  });

  it('rejects a path-traversal --change-name before any filesystem write', () => {
    const cmd = new GraphRunCommand();
    return expect(cmd.execute('feature', { changeName: '../../evil' })).rejects.toThrow(/change name/i);
  });

  it('negative --retry is clamped (no TypeError, single attempt)', async () => {
    let attempts = 0;
    VerifyCommand.mockImplementation(() => ({
      execute: jest.fn(async () => { attempts++; throw new Error('boom'); }),
    }));

    const cmd = new GraphRunCommand();
    const result = await cmd.execute('feature', { changeName: 'negretry-demo', noCache: true, retry: -1 });

    expect(result.failedAt).toBe('stdd-verify');
    expect(attempts).toBe(1);
    const step = result.steps.find(s => s.node === 'stdd-verify');
    expect(step.error).toBe('boom');
  });

  it('skipped nodes are not checkpointed, and skipApply affects the cache key', async () => {
    const first = await new GraphRunCommand().execute('feature', { changeName: 'flagkey-demo', skipApply: true });
    expect(first.steps.find(s => s.node === 'stdd-apply').status).toBe('skipped');
    // A skip is not a completed checkpoint: apply/verify must be absent from
    // the cache (other successful nodes may be cached).
    const cacheDir = path.join(tempRoot, 'stdd', 'graph', 'cache', 'flagkey-demo');
    const cachedNodes = fs.readdirSync(cacheDir).map(file =>
      JSON.parse(fs.readFileSync(path.join(cacheDir, file), 'utf8')).nodeName
    );
    expect(cachedNodes).not.toContain('stdd-apply');
    expect(cachedNodes).not.toContain('stdd-verify');

    // A full run (different key: skipApply=false) re-executes apply (it runs
    // the skip branch again in-run, but NOT from cache).
    const second = await new GraphRunCommand().execute('feature', { changeName: 'flagkey-demo' });
    const applyStep = second.steps.find(s => s.node === 'stdd-apply');
    // Different cache key (skipApply=false) → re-executed for real, not from cache.
    expect(applyStep.status).toBe('success');
    expect(applyStep.cachedAt).toBeUndefined();
  });
});

describe('HIGH validate/archive: rename-aware, structure-only gate', () => {
  it('strict accepts MODIFIED-by-new-name of an in-delta RENAMED entry', () => {
    const projectPath = createProject('val-rename');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] T Done\n', 'utf8');
    fs.writeFileSync(path.join(changeDir, 'specs', 'auth', 'auth.md'), [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: User login`',
      '- TO: `### Requirement: Login flow`',
      '',
      '## MODIFIED Requirements',
      '',
      '### Requirement: Login flow',
      'The system SHALL use passkeys.',
      '',
      '#### Scenario: S',
      '- **WHEN** x',
      '- **THEN** y',
    ].join('\n'), 'utf8');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'specs', 'auth'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'stdd', 'specs', 'auth', 'auth.md'),
      '# Auth\n\n### Requirement: User login\n\nThe system SHALL login.\n\n#### Scenario: Old\n- **WHEN** a\n- **THEN** b\n', 'utf8');

    const result = runCli(['validate', 'demo', '--strict', '--json'], projectPath);
    const report = JSON.parse(result.stdout);

    expect(report.diagnostics.map(d => d.rule)).not.toContain('modified-target-missing');
  });

  it('the archive strict gate no longer blocks already-applied REMOVEDs (structure rules only)', () => {
    const projectPath = createProject('arch-reapply');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] T Done\n', 'utf8');
    // REMOVED targeting a requirement that a previous (aborted) run already
    // removed — the merge engine calls this already-removed; the gate must
    // not turn it into a blocking refusal on the re-run.
    fs.writeFileSync(path.join(changeDir, 'specs', 'auth', 'auth.md'),
      '## REMOVED Requirements\n\n### Requirement: Gone requirement\n\n(already applied)\n\n#### Scenario: S\n- **WHEN** x\n- **THEN** y\n', 'utf8');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'specs', 'auth'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'stdd', 'specs', 'auth', 'auth.md'), '# Auth\n');

    const result = runCli(['archive', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Archived');
  });
});

describe('HIGH delta-spec: legacy content never silently lost or duplicated', () => {
  it('warns when a headerless MODIFIED/REMOVED section carries raw content', () => {
    const main = '# Spec\n\n### Requirement: A\n\nBody A\n';
    const delta = '## MODIFIED Requirements\n\nSome free-form modification text\n';
    const result = applyDelta(main, delta);

    expect(result.conflicts).toEqual([]);
    expect(result.warnings.some(w => w.type === 'legacy-section-ignored')).toBe(true);
  });

  it('legacy raw ADDED marker blocks are idempotent across re-archives', () => {
    const main = '# Spec\n\n### Requirement: A\n\nBody A\n';
    const delta = '## ADDED\n\nLegacy block content\n';
    const first = applyDelta(main, delta);
    expect(first.conflicts).toEqual([]);
    const second = applyDelta(first.content, delta);

    expect(second.conflicts).toEqual([]);
    expect(second.warnings.some(w => w.type === 'already-synced')).toBe(true);
    expect(second.content.match(/Legacy block content/g).length).toBe(1);
  });
});

describe('MEDIUM verify/clarify/rigor/interruption hardening', () => {
  it('verify: --no-lint escapes the strict-rigor lint default', () => {
    const projectPath = createProject('verify-nolint');
    runCli(['ff', 'x', '--rigor', 'strict', '--change-name', 's'], projectPath);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 's');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] T Done\n', 'utf8');

    const withLint = runCli(['verify', 's'], projectPath);
    expect(withLint.stdout).toMatch(/Lint:\s+(PASS|FAIL)/);

    const result = runCli(['verify', 's', '--no-lint'], projectPath);

    expect(result.stdout).not.toContain('Lint:        PASS');
    expect(result.stdout).not.toContain('Lint:        FAIL');
  });

  it('clarify: signal selection is not self-perpetuating across runs', () => {
    const projectPath = createProject('clarify-stable');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'),
      '# Proposal: X\n\n## description\nAdd a small export button\n\n## scope\n- a\n\n## success_criteria\n- b\n', 'utf8');

    runCli(['clarify', 'demo'], projectPath);
    const first = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    runCli(['clarify', 'demo'], projectPath);
    const second = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');

    const count = c => (c.match(/^- \[ \] /gm) || []).length;
    expect(count(second)).toBe(count(first));
    // A plain button tweak stays small even after the Clarification section
    // exists (its own question text must not re-trigger signals).
    expect(count(second)).toBeLessThanOrEqual(6);
  });

  it('rigor: strict explicitly forces the archive gate on', () => {
    expect(rigorNodeOptions('stdd-archive', 'strict')).toEqual({ skipStrict: false });
  });

  it('interruption: accounting failures never break the gate', () => {
    expect(() => recordInterruption('/nonexistent-path-xyz', 'reason')).not.toThrow();
  });
});
