/**
 * Tests for AD-n stable decision ID validation in `stdd validate --strict`
 * (BMAD stable ID family: AD numbers are never renumbered or reused;
 * superseding decisions must reference an existing AD).
 *
 * design.md is checked for AD header format, duplicate numbers, and valid
 * Supersedes references. Design files are NOT run through the spec leakage
 * rules (design documents implementation detail by design).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ValidateCommand } = require('../src/cli/commands/validate');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-validate-ad-'));
}

function setupChange(tmp, designContent) {
  const changeDir = path.join(tmp, 'stdd', 'changes', 'demo');
  fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001 Do work\n', 'utf8');
  fs.writeFileSync(path.join(changeDir, 'specs', 'spec.md'),
    '## ADDED Requirements\n\n### Requirement: Thing\n\nThe system SHALL do the thing.\n\n#### Scenario: Works\n- **WHEN** x\n- **THEN** y\n', 'utf8');
  if (designContent !== undefined) {
    fs.writeFileSync(path.join(changeDir, 'design.md'), designContent, 'utf8');
  }
  return changeDir;
}

const VALID_DESIGN = [
  '# Design: Feature',
  '',
  '## Architecture Decisions',
  '',
  '### AD-1: Use SQLite',
  '**Context:** Local-first tool.',
  '**Decision:** SQLite storage.',
  '**Binds:** All persistence code.',
  '**Prevents:** Custom file formats.',
  '',
  '### AD-2: Supersede SQLite with Postgres',
  'Supersedes: AD-1',
  '**Context:** Multi-user now.',
  '**Decision:** Postgres.',
  '**Binds:** All persistence code.',
  '**Prevents:** Embedded databases in production.',
].join('\n');

describe('validate --strict AD-n checks', () => {
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

  const run = () => new ValidateCommand(tmp).execute('demo', { json: true, strict: true });
  const rules = report => report.diagnostics.map(d => d.rule);

  it('passes a design with unique AD numbers and a valid Supersedes reference', () => {
    setupChange(tmp, VALID_DESIGN);
    const report = run();
    expect(report.status).toBe('pass');
  });

  it('flags duplicate AD numbers as blocking', () => {
    setupChange(tmp, VALID_DESIGN + '\n\n### AD-2: Duplicate number\n**Decision:** Clash.\n');
    const report = run();
    expect(report.status).toBe('fail');
    expect(rules(report)).toContain('ad-duplicate');
  });

  it('flags Supersedes references to non-existent AD numbers as blocking', () => {
    setupChange(tmp, [
      '# Design: Feature',
      '',
      '### AD-1: Solo decision',
      'Supersedes: AD-9',
      '**Decision:** Something.',
    ].join('\n'));
    const report = run();
    expect(report.status).toBe('fail');
    expect(rules(report)).toContain('ad-supersedes-missing');
  });

  it('warns on the legacy "### Decision:" heading format', () => {
    setupChange(tmp, [
      '# Design: Feature',
      '',
      '## Architecture Decisions',
      '',
      '### Decision: Old style',
      '**Context:** Before stable IDs.',
      '**Decision:** Whatever.',
    ].join('\n'));
    const report = run();
    expect(rules(report)).toContain('ad-legacy-format');
  });

  it('skips AD checks when no design.md exists', () => {
    setupChange(tmp, undefined);
    const report = run();
    expect(report.status).toBe('pass');
    expect(rules(report)).not.toContain('ad-duplicate');
  });
});
