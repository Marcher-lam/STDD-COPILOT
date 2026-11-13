/**
 * End-to-end tests for change-level rigor flowing through the main workflow
 * (model-strength adaptation P1-1).
 *
 * ff/issue record a rigor level on the change (auto-escalating to strict on
 * irreversible signals); verify and archive honor the recorded level unless
 * explicitly overridden — the same semantics as graph run --rigor, applied
 * to the plain CLI workflow.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('change-level rigor in the main workflow', () => {
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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-wfrigor-'));
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

  function stateRigor(projectPath, changeDirName) {
    const state = fs.readFileSync(path.join(projectPath, 'stdd', 'changes', changeDirName, '.state.yaml'), 'utf8');
    const match = state.match(/^rigor:\s*(\w+)$/m);
    return match ? match[1] : null;
  }

  it('ff records strict for a risky description', () => {
    const projectPath = createProject('ff-risky');
    const result = runCli(['ff', 'migrate database to postgres', '--change-name', 'risky-demo'], projectPath);
    const changeName = 'risky-demo';

    expect(stateRigor(projectPath, changeName)).toBe('strict');
    expect(result.stdout).toContain('Rigor: strict');
  });

  it('ff records standard for a routine description', () => {
    const projectPath = createProject('ff-routine');
    runCli(['ff', 'add a logout button', '--change-name', 'routine-demo'], projectPath);
    const changeName = 'routine-demo';

    expect(stateRigor(projectPath, changeName)).toBe('standard');
  });

  it('ff honors an explicit --rigor', () => {
    const projectPath = createProject('ff-explicit');
    runCli(['ff', 'add a logout button', '--rigor', 'light', '--change-name', 'explicit-demo'], projectPath);
    const changeName = 'explicit-demo';

    expect(stateRigor(projectPath, changeName)).toBe('light');
  });

  it('issue escalates on high severity', () => {
    const projectPath = createProject('issue-sev');
    runCli(['issue', 'payments double-charged', '--severity', 'critical'], projectPath);
    const changeName = fs.readdirSync(path.join(projectPath, 'stdd', 'changes'))[0];

    expect(stateRigor(projectPath, changeName)).toBe('strict');
  });

  it('verify honors a light change: constitution skipped, noted in output', () => {
    const projectPath = createProject('verify-light');
    runCli(['ff', 'add a logout button', '--rigor', 'light'], projectPath);
    const changeName = fs.readdirSync(path.join(projectPath, 'stdd', 'changes'))[0];
    // Mark the task done so verify passes the tasks check.
    fs.writeFileSync(path.join(projectPath, 'stdd', 'changes', changeName, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');

    const result = runCli(['verify', changeName], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Rigor: light');
    expect(result.stdout).toContain('Constitution: skipped');
  });

  it('verify keeps constitution for a standard change', () => {
    const projectPath = createProject('verify-standard');
    runCli(['ff', 'add a logout button'], projectPath);
    const changeName = fs.readdirSync(path.join(projectPath, 'stdd', 'changes'))[0];
    fs.writeFileSync(path.join(projectPath, 'stdd', 'changes', changeName, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');

    const result = runCli(['verify', changeName], projectPath);

    expect(result.stdout).not.toContain('Constitution: skipped');
  });

  it('archive honors a light change: strict gate relaxed end to end', () => {
    const projectPath = createProject('archive-light');
    runCli(['ff', 'add a logout button', '--rigor', 'light'], projectPath);
    const changeName = fs.readdirSync(path.join(projectPath, 'stdd', 'changes'))[0];
    const changeDir = path.join(projectPath, 'stdd', 'changes', changeName);
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');
    // A delta that would fail the strict pre-archive gate (no scenario).
    fs.writeFileSync(path.join(changeDir, 'specs', 'billing.md'),
      '## ADDED Requirements\n\n### Requirement: Invoice issuance\nThe system SHALL issue invoices.\n', 'utf8');

    // D02: the archive gate requires fresh passing verify evidence.
    runCli(['verify', changeName], projectPath);

    const result = runCli(['archive', changeName], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Rigor: light');
    // Archived despite the missing scenario because the change is light.
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'archive'))).toBe(true);
  });

  it('archive still enforces the strict gate for a standard change', () => {
    const projectPath = createProject('archive-standard');
    runCli(['ff', 'add a logout button'], projectPath);
    const changeName = fs.readdirSync(path.join(projectPath, 'stdd', 'changes'))[0];
    const changeDir = path.join(projectPath, 'stdd', 'changes', changeName);
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');
    fs.writeFileSync(path.join(changeDir, 'specs', 'billing.md'),
      '## ADDED Requirements\n\n### Requirement: Invoice issuance\nThe system SHALL issue invoices.\n', 'utf8');

    // D02: record passing verify evidence directly (a real verify in this
    // bare fixture would fail constitution for unrelated reasons), so the
    // refusal below comes from the STRICT gate, not the evidence gate.
    const evidenceDir = path.join(changeDir, 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(evidenceDir, 'verify-1000000000.json'),
      JSON.stringify({ type: 'verify', status: 'pass', results: {}, metadata: {} })
    );

    const result = runCli(['archive', changeName], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('requirement-scenario');
  });
});
