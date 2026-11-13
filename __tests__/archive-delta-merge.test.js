/**
 * Integration tests for OpenSpec-aligned delta spec merging on archive.
 *
 * Verifies that archiving a change with delta specs against an existing
 * main spec performs a real header-based merge (MODIFIED replaces,
 * REMOVED deletes, RENAMED renames), that conflicts abort the archive,
 * and that the legacy "created" path keeps its marker-based behavior.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('archive delta spec merging (OpenSpec semantics)', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, changeName) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-delta-merge-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', changeName);
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001 Done\n');
    return { projectPath, changeDir };
  }


  // D02: the archive gate requires fresh passing verify evidence; write it
  // as the LAST fixture step so it stays newer than the delta specs.
  function writeVerifyPass(projectPath, changeName) {
    const evidenceDir = path.join(projectPath, 'stdd', 'changes', changeName, 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(evidenceDir, 'verify-1000000000.json'),
      JSON.stringify({ type: 'verify', status: 'pass', results: {}, metadata: {} })
    );
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  const MAIN_AUTH_SPEC = [
    '# Auth Capability',
    '',
    '### Requirement: User login',
    '',
    'The system SHALL authenticate users with email and password.',
    '',
    '#### Scenario: Valid credentials',
    '- **WHEN** the user submits valid credentials',
    '- **THEN** the system grants a session',
    '',
  ].join('\n');

  function writeMainSpec(projectPath, rel, content) {
    const target = path.join(projectPath, 'stdd', 'specs', rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
    return target;
  }

  function writeDeltaSpec(changeDir, rel, content) {
    const target = path.join(changeDir, 'specs', rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
    return target;
  }

  it('applies MODIFIED deltas to an existing main spec for real', () => {
    const { projectPath, changeDir } = createTempProject('merge-modify', 'login-mfa');
    const mainSpec = writeMainSpec(projectPath, 'auth/auth.md', MAIN_AUTH_SPEC);
    writeDeltaSpec(changeDir, 'auth/auth.md', [
      '## MODIFIED Requirements',
      '',
      '### Requirement: User login',
      'The system SHALL authenticate users with email, password, and MFA.',
      '',
      '#### Scenario: Valid credentials with MFA',
      '- **WHEN** the user submits valid credentials and an MFA code',
      '- **THEN** the system grants a session',
    ].join('\n'));

    writeVerifyPass(projectPath, path.basename(changeDir));
    const result = runCli(['archive', 'login-mfa'], projectPath);

    expect(result.status).toBe(0);
    const merged = fs.readFileSync(mainSpec, 'utf8');
    expect(merged).toContain('email, password, and MFA');
    expect(merged).not.toContain('email and password.');
    expect(merged).toContain('### Requirement: User login');

    const report = JSON.parse(
      fs.readFileSync(path.join(projectPath, 'stdd', 'changes', 'archive', fs.readdirSync(path.join(projectPath, 'stdd', 'changes', 'archive'))[0], 'spec-merge-report.json'), 'utf8')
    );
    expect(report[0].status).toBe('merged');
    expect(report[0].operations.join(' ')).toContain('modified "User login"');
  });

  it('applies REMOVED deltas by deleting the requirement block', () => {
    const { projectPath, changeDir } = createTempProject('merge-remove', 'drop-login');
    const mainSpec = writeMainSpec(projectPath, 'auth/auth.md', MAIN_AUTH_SPEC);
    writeDeltaSpec(changeDir, 'auth/auth.md', [
      '## REMOVED Requirements',
      '',
      '### Requirement: User login',
      '(Deprecated because passkeys replace passwords.)',
    ].join('\n'));

    writeVerifyPass(projectPath, path.basename(changeDir));
    const result = runCli(['archive', 'drop-login'], projectPath);

    expect(result.status).toBe(0);
    const merged = fs.readFileSync(mainSpec, 'utf8');
    expect(merged).not.toContain('### Requirement: User login');
    expect(merged).not.toContain('grants a session');
    expect(merged).toContain('# Auth Capability');
  });

  it('applies RENAMED deltas by renaming the requirement header', () => {
    const { projectPath, changeDir } = createTempProject('merge-rename', 'rename-login');
    const mainSpec = writeMainSpec(projectPath, 'auth/auth.md', MAIN_AUTH_SPEC);
    writeDeltaSpec(changeDir, 'auth/auth.md', [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: User login`',
      '- TO: `### Requirement: Login flow`',
    ].join('\n'));

    writeVerifyPass(projectPath, path.basename(changeDir));
    const result = runCli(['archive', 'rename-login'], projectPath);

    expect(result.status).toBe(0);
    const merged = fs.readFileSync(mainSpec, 'utf8');
    expect(merged).toContain('### Requirement: Login flow');
    expect(merged).not.toContain('### Requirement: User login');
    expect(merged).toContain('grants a session');
  });

  it('aborts the archive when a delta conflicts with the main spec', () => {
    const { projectPath, changeDir } = createTempProject('merge-conflict', 'bad-delta');
    const mainSpec = writeMainSpec(projectPath, 'auth/auth.md', MAIN_AUTH_SPEC);
    writeDeltaSpec(changeDir, 'auth/auth.md', [
      '## MODIFIED Requirements',
      '',
      '### Requirement: Requirement that does not exist',
      'The system SHALL do something else.',
      '',
      '#### Scenario: Ghost',
      '- **WHEN** x',
      '- **THEN** y',
    ].join('\n'));

    // --skip-strict keeps this test focused on the merge engine's conflict
    // path (the strict gate would also flag the missing target first).
    writeVerifyPass(projectPath, path.basename(changeDir));
    const result = runCli(['archive', 'bad-delta', '--skip-strict'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('conflict');

    // Change must stay active (not archived).
    expect(fs.existsSync(changeDir)).toBe(true);
    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    expect(fs.existsSync(archiveDir)).toBe(false);

    // Main spec must be untouched.
    expect(fs.readFileSync(mainSpec, 'utf8')).toBe(MAIN_AUTH_SPEC);

    // A merge report with conflict details must be written for manual resolution.
    const report = JSON.parse(fs.readFileSync(path.join(changeDir, 'spec-merge-report.json'), 'utf8'));
    expect(report[0].status).toBe('conflict');
    expect(report[0].conflicts[0].type).toBe('modified-target-missing');
  });

  it('keeps the legacy marker behavior when creating a brand-new spec', () => {
    const { projectPath, changeDir } = createTempProject('merge-create', 'fresh-capability');
    writeDeltaSpec(changeDir, 'billing/billing.md', [
      '## ADDED Requirements',
      '',
      '### Requirement: Invoice issuance',
      'The system SHALL issue invoices.',
      '',
      '#### Scenario: Invoice generated after purchase',
      '- **WHEN** a purchase completes',
      '- **THEN** the system issues an invoice',
    ].join('\n'));

    writeVerifyPass(projectPath, path.basename(changeDir));
    const result = runCli(['archive', 'fresh-capability'], projectPath);

    expect(result.status).toBe(0);
    const created = path.join(projectPath, 'stdd', 'specs', 'billing', 'billing.md');
    expect(fs.existsSync(created)).toBe(true);
    const content = fs.readFileSync(created, 'utf8');
    expect(content).toContain('### Requirement: Invoice issuance');
    expect(content).toContain('The system SHALL issue invoices.');
  });

  it('allows re-archiving an identical ADDED requirement (idempotent)', () => {
    const { projectPath, changeDir } = createTempProject('merge-idempotent', 'add-oauth');
    const mainSpec = writeMainSpec(projectPath, 'auth/auth.md', MAIN_AUTH_SPEC);
    const delta = [
      '## ADDED Requirements',
      '',
      '### Requirement: OAuth login',
      'The system SHALL support OAuth.',
      '',
      '#### Scenario: Provider redirect',
      '- **WHEN** the user picks an OAuth provider',
      '- **THEN** the system redirects to the provider',
    ].join('\n');
    writeDeltaSpec(changeDir, 'auth/auth.md', delta);

    writeVerifyPass(projectPath, path.basename(changeDir));
    expect(runCli(['archive', 'add-oauth'], projectPath).status).toBe(0);
    const afterFirst = fs.readFileSync(mainSpec, 'utf8');
    expect(afterFirst).toContain('### Requirement: OAuth login');

    // Second change re-adds the exact same requirement.
    const changeDir2 = path.join(projectPath, 'stdd', 'changes', 'add-oauth-again');
    fs.mkdirSync(path.join(changeDir2, 'specs', 'auth'), { recursive: true });
    fs.writeFileSync(path.join(changeDir2, 'tasks.md'), '- [x] TASK-001 Done\n', 'utf8');
    fs.writeFileSync(path.join(changeDir2, 'specs', 'auth', 'auth.md'), delta, 'utf8');

    writeVerifyPass(projectPath, path.basename(changeDir2));
    const result = runCli(['archive', 'add-oauth-again'], projectPath);

    expect(result.status).toBe(0);
    const afterSecond = fs.readFileSync(mainSpec, 'utf8');
    expect(afterSecond).toBe(afterFirst);
  });

  it('blocks archive when delta specs fail the strict pre-archive gate', () => {
    const { projectPath, changeDir } = createTempProject('merge-strict-block', 'spec-no-scenario');
    // New capability spec (no main spec): the merge engine would not complain,
    // but the strict gate must reject requirements without scenarios.
    writeDeltaSpec(changeDir, 'billing/billing.md', [
      '## ADDED Requirements',
      '',
      '### Requirement: Invoice issuance',
      'The system SHALL issue invoices.',
    ].join('\n'));

    writeVerifyPass(projectPath, path.basename(changeDir));
    const result = runCli(['archive', 'spec-no-scenario'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('strict');
    expect(result.stdout).toContain('requirement-scenario');

    // Change must stay active.
    expect(fs.existsSync(changeDir)).toBe(true);
    const archiveDir = path.join(projectPath, 'stdd', 'changes', 'archive');
    expect(fs.existsSync(archiveDir)).toBe(false);
    // No spec must have been written.
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'specs', 'billing'))).toBe(false);
  });

  it('allows archiving past strict issues with --skip-strict', () => {
    const { projectPath, changeDir } = createTempProject('merge-strict-skip', 'spec-skip-strict');
    writeDeltaSpec(changeDir, 'billing/billing.md', [
      '## ADDED Requirements',
      '',
      '### Requirement: Invoice issuance',
      'The system SHALL issue invoices.',
    ].join('\n'));

    writeVerifyPass(projectPath, path.basename(changeDir));
    const result = runCli(['archive', 'spec-skip-strict', '--skip-strict'], projectPath);

    expect(result.status).toBe(0);
    const created = path.join(projectPath, 'stdd', 'specs', 'billing', 'billing.md');
    expect(fs.existsSync(created)).toBe(true);
  });
});
