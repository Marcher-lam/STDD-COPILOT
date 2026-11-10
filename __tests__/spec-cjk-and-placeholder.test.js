/**
 * P0-3 regression: Chinese task descriptions must produce spec files, and
 * placeholder-only specs must be blocked by validation.
 *
 * Real-world report finding: `stdd spec` skipped every pure-CJK task
 * ("description sanitizes to an empty filename") because toSafeFilename
 * stripped all non-ASCII; the single spec that survived (its description
 * happened to contain digits) was a generic placeholder scenario with no
 * business semantics, and it sailed through validate into stdd/specs/.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'cli.js');

function runCli(args, cwd, expectFail = false) {
  const result = require('child_process').spawnSync('node', [CLI, ...args], {
    cwd,
    encoding: 'utf8',
  });
  if (!expectFail && result.status !== 0) {
    throw new Error(`CLI failed: ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  }
  return { status: result.status, stdout: result.stdout || '' };
}

const tempDirs = [];

function makeProject(setup) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-p03-'));
  tempDirs.push(root);
  setup(root);
  return root;
}

afterAll(() => {
  for (const d of tempDirs) {
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('P0-3a: CJK task descriptions get spec files', () => {
  test('pure-Chinese tasks are not skipped by stdd spec', () => {
    const root = makeProject((p) => {
      const change = path.join(p, 'stdd', 'changes', 'demo');
      fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
      fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal: demo\n');
      fs.writeFileSync(
        path.join(change, 'tasks.md'),
        [
          '# Tasks',
          '- [ ] TASK-001: 环境准备与脚手架搭建',
          '- [ ] TASK-002: 订单阶梯折扣核心逻辑实现',
          '- [ ] TASK-003: 单元测试编写与验证',
          '',
        ].join('\n')
      );
    });

    const out = runCli(['spec', 'demo'], root);
    expect(out.stdout).toContain('Generated 3 spec(s)');

    const specsDir = path.join(root, 'stdd', 'changes', 'demo', 'specs');
    const features = fs.readdirSync(specsDir).filter(f => f.endsWith('.feature'));
    expect(features.length).toBe(3);
    // Filenames keep the Chinese description instead of vanishing
    expect(features.some(f => f.includes('环境准备与脚手架搭建'))).toBe(true);
  });
});

describe('P0-3b: placeholder-only specs fail validation', () => {
  test('default template steps are flagged as blocking', () => {
    const root = makeProject((p) => {
      const change = path.join(p, 'stdd', 'changes', 'demo');
      fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
      fs.writeFileSync(
        path.join(change, 'specs', 'generic.feature'),
        [
          'Feature: Tiered Discount',
          '  Scenario: Main functionality',
          '    Given the system is ready',
          '    When the user performs the action',
          '    Then the result is expected',
          '',
        ].join('\n')
      );
    });

    const result = runCli(['validate', 'demo', '--json'], root, true);
    const report = JSON.parse(result.stdout);
    expect(report.status).toBe('fail');
    expect(report.blocking).toBeGreaterThan(0);
    expect(report.diagnostics.some(d => d.rule === 'generic-placeholder-steps')).toBe(true);
    expect(result.status).toBe(1); // CI can block on empty-semantics specs
  });

  test('a spec with real business steps is not flagged', () => {
    const root = makeProject((p) => {
      const change = path.join(p, 'stdd', 'changes', 'demo');
      fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
      fs.writeFileSync(
        path.join(change, 'specs', 'tiered.feature'),
        [
          'Feature: Tiered Discount',
          '  Scenario: 100 yuan threshold applies 10 percent off',
          '    Given the order subtotal is 100 yuan',
          '    When the discount is calculated',
          '    Then the payable total is 90.00 yuan',
          '',
        ].join('\n')
      );
    });

    const out = runCli(['validate', 'demo', '--json'], root);
    const report = JSON.parse(out.stdout);
    expect(report.diagnostics.some(d => d.rule === 'generic-placeholder-steps')).toBe(false);
  });
});
