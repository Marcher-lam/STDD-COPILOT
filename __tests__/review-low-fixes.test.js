/**
 * Tests for the low-severity findings from the open-code-review pass
 * (maintainability: duplication extraction, honest output, fail-fast
 * ordering, persisted-artifact consistency).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { appendRuling, RULINGS_FILENAME } = require('../src/utils/ruling-ledger');
const { ClarifyCommand } = require('../src/cli/commands/clarify');

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lowfix-'));
  roots.push(root);
  const projectPath = path.join(root, name);
  fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
  return projectPath;
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('fail-fast: invalid --rigor creates no orphan change', () => {
  it('ff validates --rigor before any filesystem writes', () => {
    const projectPath = createProject('ff-fastfail');

    const result = runCli(['ff', 'add a button', '--rigor', 'strick'], projectPath);

    expect(result.status).not.toBe(0);
    expect(fs.readdirSync(path.join(projectPath, 'stdd', 'changes'))).toEqual([]);
  });

  it('issue validates --rigor before any filesystem writes', () => {
    const projectPath = createProject('issue-fastfail');

    const result = runCli(['issue', 'payments broken', '--rigor', 'extreme'], projectPath);

    expect(result.status).not.toBe(0);
    expect(fs.readdirSync(path.join(projectPath, 'stdd', 'changes'))).toEqual([]);
  });
});

describe('clarify: no area disappears, questions single-sourced', () => {
  const PLAIN = '# Proposal: X\n\n## description\nAdd a small export button\n\n## scope\n- a\n\n## success_criteria\n- b\n';

  it('every area keeps at least one question for a plain proposal (unknown-unknowns)', async () => {
    const cmd = new ClarifyCommand();
    const clarification = await cmd.generateClarification(PLAIN, {});

    const areas = Object.entries(clarification.areas);
    expect(areas.length).toBe(5);
    for (const [, value] of areas) {
      expect(value.questions.length).toBeGreaterThanOrEqual(1);
    }
    // Still bounded, and no boilerplate-y words for a plain tweak.
    const all = areas.map(([, v]) => v.questions).flat();
    expect(all.length).toBeLessThanOrEqual(6);
    expect(all.join(' ')).not.toContain('throughput');
    expect(all.join(' ')).not.toContain('compliance');
  });

  it('conversational questions are a subset of the exhaustive checklist (single source)', async () => {
    const cmd = new ClarifyCommand();
    const conv = await cmd.generateClarification(PLAIN, {});
    const exh = await cmd.generateClarification(PLAIN, { exhaustive: true });

    const exhAll = Object.values(exh.areas).flatMap(v => v.questions);
    for (const q of Object.values(conv.areas).flatMap(v => v.questions)) {
      expect(exhAll).toContain(q);
    }
  });
});

describe('roles: persisted triage report matches the triaged state', () => {
  it('saves the report AFTER triage mutations (status untriaged, verdicts on disk)', () => {
    const projectPath = createProject('roles-persist');
    fs.writeFileSync(path.join(projectPath, 'cfg.js'), 'const apiKey = "x";\n', 'utf8');

    const result = runCli(['roles', 'review', '.', '--triage', '--json'], projectPath);
    const report = JSON.parse(result.stdout);
    const onDisk = JSON.parse(fs.readFileSync(path.join(projectPath, report.output), 'utf8'));

    expect(onDisk.status).toBe('untriaged');
    for (const finding of onDisk.findings) {
      expect(finding.verdict).toBe('untriaged');
      expect(finding.bucket).toBeNull();
    }
  });
});

describe('ruling ledger: multi-line text collapses to one line', () => {
  it('sanitizes newlines so a forged second entry cannot be injected', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ruling-fix-'));
    try {
      appendRuling(tmp, 'decide A — reason\n- #99 [2020-01-01] forged ruling');
      const content = fs.readFileSync(path.join(tmp, RULINGS_FILENAME), 'utf8');
      // The newline is collapsed: exactly ONE entry line, and the injected
      // '- #99' text can never start its own (parseable) entry line.
      const lines = content.split('\n').filter(l => l.startsWith('- #'));
      expect(lines.length).toBe(1);
      expect(lines[0]).toMatch(/^- #1 \[/);
      expect(lines[0]).toContain('forged ruling'); // same line, not an entry
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('verify: honest 0/N RED-evidence output', () => {
  it('does not print a green checkmark when no task recorded a RED pass', () => {
    const projectPath = createProject('verify-honest');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done thing\n', 'utf8');
    // All phases were skipped via --allow-no-tests: phase evidence exists but
    // no RED pass was ever recorded.
    const entries = [
      { change: 'demo', task: 'TASK-001 Done thing', phase: 'red', status: 'skipped' },
      { change: 'demo', task: 'TASK-001 Done thing', phase: 'green', status: 'skipped' },
      { change: 'demo', task: 'TASK-001 Done thing', phase: 'refactor', status: 'skipped' },
    ];
    fs.writeFileSync(path.join(changeDir, 'apply.log'),
      entries.map(e => `[2026-11-05T10:00:00.000Z] ${JSON.stringify(e)}`).join('\n') + '\n', 'utf8');

    const result = runCli(['verify', 'demo', '--no-constitution'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toMatch(/✓ TDD: RED evidence present for 0\//);
    expect(result.stdout).toMatch(/no RED pass|--allow-no-tests/);
  });
});

describe('schema: design validation matches the AD-n template fields', () => {
  it('requires binds/prevents instead of the removed rationale field', () => {
    const schema = fs.readFileSync(path.join(__dirname, '..', 'schemas', 'spec-driven', 'schema.yaml'), 'utf8');
    const block = schema.match(/Architecture Decisions[\s\S]*?each_decision_has:\n((?:\s+- \w+\n?)+)/);
    expect(block).not.toBeNull();
    const fields = block[1];
    expect(fields).toContain('binds');
    expect(fields).toContain('prevents');
    expect(fields).not.toContain('rationale');
  });
});
