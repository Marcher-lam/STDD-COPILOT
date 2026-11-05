/**
 * Tests for the adaptive task budget in `stdd plan` (model-strength
 * adaptation P0-1).
 *
 * The hardcoded 6-task / 30-minute micro-task cap was a weak-model
 * compensation ("prevent context loss"). With strong base models the cap
 * costs more coordination than it saves, so the budget becomes a function
 * of change scale (proposal size, scope items, risk signals) and can be
 * pinned or widened via stdd/config.yaml `planning.max_tasks`.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('plan adaptive task budget', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, proposalContent) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-budget-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposalContent, 'utf8');
    return { projectPath, changeDir };
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  const SMALL_PROPOSAL = [
    '# Proposal: Add logout button',
    '',
    '## description',
    'Add a logout button to the header that clears the session.',
    '',
    '## scope',
    '- place button in header',
    '',
    '## success_criteria',
    '- clicking logs the user out',
  ].join('\n');

  function largeProposal() {
    const scopeItems = Array.from({ length: 6 }, (_, i) => `- capability ${i} covering area ${i}`).join('\n');
    const filler = Array.from({ length: 120 }, (_, i) => `detail line ${i} about the migration and auth integration`).join(' ');
    return [
      '# Proposal: Billing migration with auth integration',
      '',
      '## description',
      `Migrate billing to the new provider. ${filler}`,
      '',
      '## scope',
      scopeItems,
      '',
      '## success_criteria',
      '- billing works',
      '- api stays compatible',
    ].join('\n');
  }

  function budgetFrom(output) {
    const match = output.match(/Task Budget:\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  it('assigns a small budget to a small proposal', () => {
    const { projectPath, changeDir } = createTempProject('budget-small', SMALL_PROPOSAL);

    const result = runCli(['plan', 'demo'], projectPath);

    expect(result.status).toBe(0);
    const tasks = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
    const taskCount = (tasks.match(/- \[ \] \*\*TASK-/g) || []).length;
    expect(taskCount).toBeLessThanOrEqual(4);
    expect(result.stdout).toMatch(/Task Budget:\s*\d+/);
  });

  it('assigns a larger budget to a large, risky proposal', () => {
    const { projectPath } = createTempProject('budget-large', largeProposal());

    const result = runCli(['plan', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(budgetFrom(result.stdout)).toBeGreaterThanOrEqual(7);
    // Basis line mentions the signals used.
    expect(result.stdout).toMatch(/basis:/i);
  });

  it('honors an explicit planning.max_tasks from config', () => {
    const { projectPath, changeDir } = createTempProject('budget-config', largeProposal());
    fs.writeFileSync(path.join(projectPath, 'stdd', 'config.yaml'),
      'planning:\n  max_tasks: 3\n', 'utf8');

    const result = runCli(['plan', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(budgetFrom(result.stdout)).toBe(3);
    const tasks = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
    expect((tasks.match(/- \[ \] \*\*TASK-/g) || []).length).toBe(3);
  });

  it('falls back to auto when config has no planning section', () => {
    const { projectPath } = createTempProject('budget-noconf', SMALL_PROPOSAL);
    fs.writeFileSync(path.join(projectPath, 'stdd', 'config.yaml'),
      'project:\n  type: web\n', 'utf8');

    const result = runCli(['plan', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(budgetFrom(result.stdout)).not.toBeNull();
  });
});
