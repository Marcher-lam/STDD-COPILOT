/**
 * Tests for `stdd validate --strict` (OpenSpec-style delta structure checks).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ValidateCommand } = require('../src/cli/commands/validate');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-validate-strict-'));
}

function setupChange(tmp, deltaContent, mainContent) {
  const changeDir = path.join(tmp, 'stdd', 'changes', 'demo');
  fs.mkdirSync(path.join(changeDir, 'specs', 'auth'), { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001 Do work\n', 'utf8');
  fs.writeFileSync(path.join(changeDir, 'specs', 'auth', 'auth.md'), deltaContent, 'utf8');
  if (mainContent !== undefined) {
    fs.mkdirSync(path.join(tmp, 'stdd', 'specs', 'auth'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'stdd', 'specs', 'auth', 'auth.md'), mainContent, 'utf8');
  }
  return changeDir;
}

const MAIN = [
  '# Auth',
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

const CLEAN_DELTA = [
  '## ADDED Requirements',
  '',
  '### Requirement: OAuth login',
  '',
  'The system SHALL support OAuth.',
  '',
  '#### Scenario: Provider redirect',
  '- **WHEN** the user picks an OAuth provider',
  '- **THEN** the system redirects to the provider',
].join('\n');

describe('ValidateCommand --strict', () => {
  let logSpy;
  let tmp;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = 0;
    tmp = makeTmp();
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = 0;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function run(options = {}) {
    return new ValidateCommand(tmp).execute('demo', { json: true, strict: true, ...options });
  }

  function rules(report) {
    return report.diagnostics.map(d => d.rule);
  }

  it('reports strict mode in the report', () => {
    setupChange(tmp, CLEAN_DELTA);
    const report = run();
    expect(report.mode).toBe('strict');
  });

  it('combines strict and spec-guardian modes', () => {
    setupChange(tmp, CLEAN_DELTA);
    const report = run({ specGuardian: true });
    expect(report.mode).toBe('strict+spec-guardian');
  });

  it('passes a clean delta', () => {
    setupChange(tmp, CLEAN_DELTA, MAIN);
    const report = run();
    expect(report.status).toBe('pass');
    expect(report.blocking).toBe(0);
  });

  it('does not run strict checks when --strict is omitted (backward compatible)', () => {
    setupChange(tmp, '## ADDED Requirements\n\n### Requirement: Broken\n\nNo scenario here.\n', MAIN);
    const report = new ValidateCommand(tmp).execute('demo', { json: true });
    expect(rules(report)).not.toContain('requirement-scenario');
  });

  it('flags requirements without scenarios as blocking', () => {
    setupChange(tmp, '## ADDED Requirements\n\n### Requirement: OAuth login\n\nThe system SHALL support OAuth.\n', MAIN);
    const report = run();
    expect(report.status).toBe('fail');
    expect(rules(report)).toContain('requirement-scenario');
    const diagnostic = report.diagnostics.find(d => d.rule === 'requirement-scenario');
    expect(diagnostic.severity).toBe('blocking');
  });

  it('warns when a requirement body lacks a SHALL/MUST statement', () => {
    setupChange(tmp, [
      '## ADDED Requirements',
      '',
      '### Requirement: OAuth login',
      '',
      'Supports OAuth providers.',
      '',
      '#### Scenario: Provider redirect',
      '- **WHEN** the user picks a provider',
      '- **THEN** the redirect happens',
    ].join('\n'), MAIN);
    const report = run();
    expect(report.status).toBe('pass');
    expect(rules(report)).toContain('shall-statement');
  });

  it('flags duplicate requirement headers in one delta file as blocking', () => {
    setupChange(tmp, [
      '## ADDED Requirements',
      '',
      '### Requirement: OAuth login',
      '',
      'The system SHALL support OAuth.',
      '',
      '#### Scenario: A',
      '- **WHEN** x',
      '- **THEN** y',
      '',
      '### Requirement: OAuth login',
      '',
      'The system SHALL support OAuth via SSO.',
      '',
      '#### Scenario: B',
      '- **WHEN** x',
      '- **THEN** y',
    ].join('\n'), MAIN);
    const report = run();
    expect(report.status).toBe('fail');
    expect(rules(report)).toContain('duplicate-header');
  });

  it('flags MODIFIED targets missing from the main spec as blocking', () => {
    setupChange(tmp, [
      '## MODIFIED Requirements',
      '',
      '### Requirement: Ghost requirement',
      '',
      'The system SHALL do something.',
      '',
      '#### Scenario: Ghost',
      '- **WHEN** x',
      '- **THEN** y',
    ].join('\n'), MAIN);
    const report = run();
    expect(report.status).toBe('fail');
    expect(rules(report)).toContain('modified-target-missing');
  });

  it('flags REMOVED targets missing from the main spec as blocking', () => {
    setupChange(tmp, [
      '## REMOVED Requirements',
      '',
      '### Requirement: Ghost requirement',
      '',
      '(Removed.)',
    ].join('\n'), MAIN);
    const report = run();
    expect(report.status).toBe('fail');
    expect(rules(report)).toContain('removed-target-missing');
  });

  it('flags ADDED headers that conflict with the main spec as blocking', () => {
    setupChange(tmp, [
      '## ADDED Requirements',
      '',
      '### Requirement: User login',
      '',
      'The system SHALL authenticate with magic links.',
      '',
      '#### Scenario: Magic link',
      '- **WHEN** the user requests a magic link',
      '- **THEN** the system emails it',
    ].join('\n'), MAIN);
    const report = run();
    expect(report.status).toBe('fail');
    expect(rules(report)).toContain('added-conflict');
  });

  it('warns when an ADDED requirement is already synced with the main spec', () => {
    setupChange(tmp, [
      '## ADDED Requirements',
      '',
      '### Requirement: User login',
      '',
      'The system SHALL authenticate users with email and password.',
      '',
      '#### Scenario: Valid credentials',
      '- **WHEN** the user submits valid credentials',
      '- **THEN** the system grants a session',
    ].join('\n'), MAIN);
    const report = run();
    expect(report.status).toBe('pass');
    expect(rules(report)).toContain('already-synced');
  });

  it('flags RENAMED sources missing from the main spec as blocking', () => {
    setupChange(tmp, [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: Ghost requirement`',
      '- TO: `### Requirement: Phantom requirement`',
    ].join('\n'), MAIN);
    const report = run();
    expect(report.status).toBe('fail');
    expect(rules(report)).toContain('renamed-source-missing');
  });

  it('flags delta files without recognized sections as a warning', () => {
    setupChange(tmp, 'Just a plain draft with no sections.\n', MAIN);
    const report = run();
    expect(rules(report)).toContain('delta-structure');
  });

  it('skips target checks gracefully when no main spec exists yet', () => {
    setupChange(tmp, CLEAN_DELTA, undefined);
    const report = run();
    expect(report.status).toBe('pass');
    expect(report.blocking).toBe(0);
  });

  it('checks main specs for duplicate headers in repo mode', () => {
    const specsDir = path.join(tmp, 'stdd', 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'auth.md'), [
      '### Requirement: User login',
      '',
      'The system SHALL authenticate.',
      '',
      '#### Scenario: A',
      '- **WHEN** x',
      '- **THEN** y',
      '',
      '### Requirement: User login',
      '',
      'The system SHALL authenticate twice.',
      '',
      '#### Scenario: B',
      '- **WHEN** x',
      '- **THEN** y',
      '',
    ].join('\n'), 'utf8');

    const report = new ValidateCommand(tmp).execute(null, { json: true, strict: true });
    expect(report.status).toBe('fail');
    const diagnostics = report.diagnostics.filter(d => d.rule === 'duplicate-header');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('blocking');
  });
});
