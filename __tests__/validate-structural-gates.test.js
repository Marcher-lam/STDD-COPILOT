/**
 * P0-2 regression: validate must fail (non-zero exit) when a change has
 * tasks but no specs, or specs that cover none of its tasks.
 *
 * Real-world report finding: the first `validate --json` on a freshly
 * ff'd change returned status=pass with specFiles=[] and 0/3 tasks
 * covered, the process exited 0, and the evidence file's top-level status
 * was 'unknown' while the inner result said 'pass'.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ValidateCommand } = require('../src/cli/commands/validate');
const EvidenceCapture = require('../src/utils/evidence-capture');

const tempDirs = [];

function makeChange(setupSpecs) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-p02-'));
  tempDirs.push(root);
  const change = path.join(root, 'stdd', 'changes', 'tiered');
  fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
  fs.writeFileSync(path.join(change, 'tasks.md'),
    '- [ ] TASK-001: 环境准备与脚手架搭建\n- [ ] TASK-002: 订单阶梯折扣核心逻辑实现\n- [ ] TASK-003: 单元测试编写与验证\n');
  setupSpecs(path.join(change, 'specs'));
  return root;
}

afterAll(() => {
  for (const d of tempDirs) {
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('P0-2: structural gates', () => {
  test('tasks with zero specs → fail + no-specs blocking + exit 1', () => {
    const root = makeChange(() => { /* specs dir left empty */ });
    process.exitCode = 0;
    try {
      const cmd = new ValidateCommand(root);
      const report = cmd.execute('tiered', { json: true });

      expect(report.status).toBe('fail');
      expect(report.specFiles).toEqual([]);
      expect(report.tasks.total).toBe(3);
      expect(report.tasks.covered).toBe(0);
      expect(report.diagnostics.some(d => d.rule === 'no-specs' && d.severity === 'blocking')).toBe(true);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = 0;
    }

    // Evidence top-level status must agree with the inner result
    const evidenceDir = path.join(root, 'stdd', 'changes', 'tiered', 'evidence');
    const files = fs.readdirSync(evidenceDir).filter(f => f.startsWith('validate-')).sort();
    const evidence = JSON.parse(fs.readFileSync(path.join(evidenceDir, files[files.length - 1]), 'utf8'));
    expect(evidence.status).toBe('fail');
    expect(evidence.results.status).toBe('fail');
  });

  test('specs covering none of the tasks → loud zero-task-coverage WARNING (heuristic, not blocking)', () => {
    const root = makeChange((specsDir) => {
      fs.writeFileSync(path.join(specsDir, 'unrelated.feature'),
        'Feature: Something Else\n  Scenario: other\n    Given an order of 5 yuan\n    When checkout runs\n    Then the total is 5 yuan\n');
    });
    process.exitCode = 0;
    try {
      const cmd = new ValidateCommand(root);
      const report = cmd.execute('tiered', { json: true });
      // Coverage is a word-match heuristic: it must surface, but a
      // well-worded legit change must not be blocked by it.
      const finding = report.diagnostics.find(d => d.rule === 'zero-task-coverage');
      expect(finding).toBeDefined();
      expect(finding.severity).toBe('warning');
      expect(report.status).toBe('pass');
      expect(process.exitCode).toBe(0);
    } finally {
      process.exitCode = 0;
    }
  });

  test('specs covering the tasks still pass', () => {
    const root = makeChange((specsDir) => {
      fs.writeFileSync(path.join(specsDir, 'tiered.feature'),
        'Feature: 订单阶梯折扣核心逻辑实现\n  Scenario: threshold\n    Given the order subtotal is 100 yuan\n    When the discount is calculated\n    Then the payable total is 90.00 yuan\n');
    });
    process.exitCode = 0;
    try {
      const cmd = new ValidateCommand(root);
      const report = cmd.execute('tiered', { json: true });
      expect(report.tasks.covered).toBeGreaterThan(0);
      expect(report.status).toBe('pass');
      expect(process.exitCode).toBe(0);
    } finally {
      process.exitCode = 0;
    }
  });

  test('main-spec mode (no change) without specs still passes — gate is change-scoped', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-p02-main-'));
    tempDirs.push(root);
    fs.mkdirSync(path.join(root, 'stdd', 'specs'), { recursive: true });

    const cmd = new ValidateCommand(root);
    const report = cmd.execute(null, { json: true });
    expect(report.status).toBe('pass');
  });
});

describe('EvidenceCapture._determineStatus validate branch', () => {
  const capture = new EvidenceCapture();

  test("mirrors the report's pass status", () => {
    expect(capture._determineStatus({ status: 'pass' }, 'validate')).toBe('pass');
  });

  test("mirrors the report's fail status (was 'unknown' before)", () => {
    expect(capture._determineStatus({ status: 'fail' }, 'validate')).toBe('fail');
  });
});
