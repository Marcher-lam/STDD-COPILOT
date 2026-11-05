/**
 * Tests for the interruption budget (model-strength adaptation P2-2).
 *
 * Audit finding: the config's four pause layers were mostly theater —
 * certainty check_points, auto_skip_when, and phases_requiring_confirm had
 * zero consumers; hitl.mode was read by nothing until the P0 risk-triggered
 * confirm. Instead of merging phantom layers, this builds the REAL unified
 * pause accounting: gates that need a human record an interruption on the
 * change (.state.yaml), against a budget; exceeding the budget escalates
 * with restructuring guidance instead of silently pausing forever.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const {
  recordInterruption,
  readInterruptions,
  readBudget,
  budgetState,
} = require('../src/utils/interruption');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

function createProject(name, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-interrupt-'));
  roots.push(root);
  const projectPath = path.join(root, name);
  const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'proposal.md'),
    '# Proposal: X\n\n## description\nA feature\n\n## scope\n- a\n\n## success_criteria\n- b\n', 'utf8');
  const configLines = [];
  if (options.hitlMode) configLines.push(`hitl:\n  mode: "${options.hitlMode}"`);
  if (options.budget !== undefined) configLines.push(`interruption:\n  budget: ${options.budget}`);
  if (configLines.length > 0) {
    fs.writeFileSync(path.join(projectPath, 'stdd', 'config.yaml'), configLines.join('\n') + '\n', 'utf8');
  }
  return { projectPath, changeDir };
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('interruption module', () => {
  let tmp;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-interrupt-unit-')); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  it('counts interruptions and preserves sibling state lines', () => {
    fs.writeFileSync(path.join(tmp, '.state.yaml'), '# STDD change state\nrigor: strict\nbaseline_commit: "abc"\n', 'utf8');

    expect(readInterruptions(tmp).used).toBe(0);
    recordInterruption(tmp, 'confirm-needs-human');
    recordInterruption(tmp, '3-strikes');

    const state = fs.readFileSync(path.join(tmp, '.state.yaml'), 'utf8');
    expect(state).toContain('rigor: strict');
    expect(state).toContain('baseline_commit: "abc"');
    expect(readInterruptions(tmp).used).toBe(2);
    expect(readInterruptions(tmp).lastReason).toBe('3-strikes');
  });

  it('reads the budget from config with a default of 3', () => {
    const plain = createProject('budget-default');
    expect(readBudget(plain.projectPath)).toBe(3);

    const tight = createProject('budget-tight', { budget: 1 });
    expect(readBudget(tight.projectPath)).toBe(1);
  });

  it('reports budget exceeded state', () => {
    const { projectPath, changeDir } = createProject('budget-state', { budget: 1 });
    recordInterruption(changeDir, 'first');
    expect(budgetState(changeDir, projectPath)).toMatchObject({ used: 1, budget: 1, exceeded: false });
    recordInterruption(changeDir, 'second');
    expect(budgetState(changeDir, projectPath)).toMatchObject({ used: 2, budget: 1, exceeded: true });
  });
});

describe('gates record interruptions end to end', () => {
  it('confirm pending-human increments the counter and warns past budget', () => {
    const { projectPath, changeDir } = createProject('confirm-budget', { hitlMode: 'risk-triggered', budget: 1 });

    // First pending-human (no certainty evidence) — within budget.
    const first = runCli(['confirm', 'demo'], projectPath);
    expect(first.status).toBe(0);
    expect(readInterruptions(changeDir).used).toBe(1);

    const decision1 = JSON.parse(fs.readFileSync(path.join(changeDir, 'confirm-decision.json'), 'utf8'));
    expect(decision1.budgetExceeded).toBeUndefined();

    // Reset the decision file to force a second evaluation; second pause
    // exceeds the budget of 1.
    fs.rmSync(path.join(changeDir, 'confirm-decision.json'));
    const second = runCli(['confirm', 'demo'], projectPath);

    expect(readInterruptions(changeDir).used).toBe(2);
    expect(second.stdout).toContain('budget');
    const decision2 = JSON.parse(fs.readFileSync(path.join(changeDir, 'confirm-decision.json'), 'utf8'));
    expect(decision2.budgetExceeded).toBe(true);
  });

  it('apply 3-strikes escalation records an interruption', () => {
    const { projectPath, changeDir } = createProject('apply-budget');

    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] [phase:green] TASK-001 Stubborn\n', 'utf8');
    for (let i = 0; i < 3; i++) {
      runCli(['apply', 'demo', '--test-command', 'node -e process.exit(1)'], projectPath);
    }

    expect(readInterruptions(changeDir).used).toBeGreaterThanOrEqual(1);
  });
});
