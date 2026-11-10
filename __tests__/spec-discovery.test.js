/**
 * Shared spec discovery (P1-4 regression).
 *
 * Real-world report finding: after `stdd spec` generated a `.feature` file,
 * `status --json` still reported hasSpecs=false and the phase stayed at
 * "Phase 2: Specification", because status only looked for top-level `.md`
 * files. status and recommend now share one recursive .feature/.md
 * discovery rule with validate/archive.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { findSpecFiles, hasSpecFiles } = require('../src/utils/spec-discovery');
const { StatusCommand } = require('../src/cli/commands/status');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.dim = fn;
  fn.red = fn;
  return fn;
});

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-spec-discovery-'));
}

describe('spec-discovery util', () => {
  const dirs = [];

  function makeProject(setup) {
    const root = makeTmp();
    dirs.push(root);
    setup(root);
    return root;
  }

  afterAll(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });

  test('finds flat .feature files (SpecGenerator layout)', () => {
    const root = makeProject((p) => {
      fs.mkdirSync(path.join(p, 'specs'), { recursive: true });
      fs.writeFileSync(path.join(p, 'specs', '100-100-200-200.feature'), 'Feature: x\n');
    });
    expect(hasSpecFiles(path.join(root, 'specs'))).toBe(true);
    expect(findSpecFiles(path.join(root, 'specs')).length).toBe(1);
  });

  test('finds spec.md inside domain subdirectories (spec command layout)', () => {
    const root = makeProject((p) => {
      fs.mkdirSync(path.join(p, 'specs', 'business'), { recursive: true });
      fs.writeFileSync(path.join(p, 'specs', 'business', 'spec.md'), '# spec\n');
    });
    expect(hasSpecFiles(path.join(root, 'specs'))).toBe(true);
  });

  test('domain dirs named like build artifacts are NOT pruned (OCR finding)', () => {
    const root = makeProject((p) => {
      fs.mkdirSync(path.join(p, 'specs', 'build'), { recursive: true });
      fs.mkdirSync(path.join(p, 'specs', 'reports'), { recursive: true });
      fs.writeFileSync(path.join(p, 'specs', 'build', 'spec.md'), '# spec\n');
      fs.writeFileSync(path.join(p, 'specs', 'reports', 'x.feature'), 'Feature: x\n');
    });
    expect(findSpecFiles(path.join(root, 'specs')).length).toBe(2);
  });

  test('empty / missing directory has no specs', () => {
    const root = makeProject((p) => {
      fs.mkdirSync(path.join(p, 'specs'), { recursive: true });
    });
    expect(hasSpecFiles(path.join(root, 'specs'))).toBe(false);
    expect(hasSpecFiles(path.join(root, 'does-not-exist'))).toBe(false);
  });
});

describe('StatusCommand spec detection (P1-4)', () => {
  const roots = [];

  function makeStddChange(specsSetup) {
    const root = makeTmp();
    roots.push(root);
    const stdd = path.join(root, 'stdd');
    fs.mkdirSync(path.join(stdd, 'specs'), { recursive: true });
    fs.mkdirSync(path.join(stdd, 'changes'), { recursive: true });
    const change = path.join(stdd, 'changes', 'demo');
    fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal: demo\n');
    specsSetup(path.join(change, 'specs'));
    return { root, change };
  }

  afterEach(() => {
    for (const r of roots) fs.rmSync(r, { recursive: true, force: true });
    roots.length = 0;
    jest.restoreAllMocks();
  });

  test('a generated .feature file counts as specs and advances the phase', async () => {
    const { change } = makeStddChange((specsDir) => {
      fs.writeFileSync(path.join(specsDir, 'tiered-order-discount.feature'), 'Feature: demo\n');
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = new StatusCommand();
    const status = await cmd.getDetailedStatus(change);

    expect(status.hasSpecs).toBe(true);
    expect(status.phase).toContain('Phase 3');
    logSpy.mockRestore();
  });

  test('spec.md in a domain subdirectory counts as specs', async () => {
    const { change } = makeStddChange((specsDir) => {
      fs.mkdirSync(path.join(specsDir, 'business'), { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'business', 'spec.md'), '# spec\n');
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = new StatusCommand();
    const status = await cmd.getDetailedStatus(change);

    expect(status.hasSpecs).toBe(true);
    logSpy.mockRestore();
  });

  test('no specs still reports hasSpecs=false (Phase 2)', async () => {
    const { change } = makeStddChange(() => {});

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = new StatusCommand();
    const status = await cmd.getDetailedStatus(change);

    expect(status.hasSpecs).toBe(false);
    expect(status.phase).toContain('Phase 2');
    logSpy.mockRestore();
  });
});
