/**
 * Tests for triage-mode adversarial review (`stdd roles review --triage`)
 * (BMAD triage review: lens reviewers do not assign severity; a verified
 * triage step assigns verdicts and routes findings).
 *
 * In triage mode findings are emitted as `untriaged` with a verdict/bucket
 * worksheet instead of auto-failing on pattern severity; the worksheet
 * documents the verdict scale, the four routing buckets, and the
 * deferred-work integration.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('roles review --triage', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, fileName, content) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-roles-triage-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    fs.writeFileSync(path.join(projectPath, fileName), content, 'utf8');
    return projectPath;
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  const SECRET_FILE = 'const config = {\n  apiKey: "hardcoded-value",\n};\n';

  it('does not auto-fail in triage mode and marks findings untriaged', () => {
    const projectPath = createTempProject('triage-mode', 'config.js', SECRET_FILE);

    const result = runCli(['roles', 'review', '.', '--triage', '--json'], projectPath);
    const report = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(report.status).toBe('untriaged');
    expect(report.findings.length).toBeGreaterThan(0);
    for (const finding of report.findings) {
      expect(finding.verdict).toBe('untriaged');
      expect(finding.bucket).toBeNull();
    }
    expect(report.triageSheet).toBeDefined();
  });

  it('writes a triage worksheet with verdicts, buckets, and ledger routing', () => {
    const projectPath = createTempProject('triage-sheet', 'config.js', SECRET_FILE);

    const result = runCli(['roles', 'review', '.', '--triage', '--json'], projectPath);
    const report = JSON.parse(result.stdout);
    const sheetPath = path.join(projectPath, report.triageSheet);
    expect(fs.existsSync(sheetPath)).toBe(true);

    const sheet = fs.readFileSync(sheetPath, 'utf8');
    expect(sheet).toContain('# Review Triage Worksheet');
    // Verdict scale
    expect(sheet).toContain('high');
    expect(sheet).toContain('maybe-false');
    // Routing buckets
    expect(sheet).toContain('intent-gap');
    expect(sheet).toContain('plan-defect');
    expect(sheet).toContain('patch');
    expect(sheet).toContain('defer');
    // Deferred-work ledger integration hint
    expect(sheet).toContain('stdd verify <change> --defer');
    // One row per finding, with an empty verdict slot
    expect(sheet).toMatch(/#1 \| .* \| verdict:___ \| bucket:___/);
  });

  it('keeps the legacy auto-fail behavior without --triage', () => {
    const projectPath = createTempProject('triage-legacy', 'config.js', SECRET_FILE);

    const result = runCli(['roles', 'review', '.', '--json'], projectPath);
    const report = JSON.parse(result.stdout);

    expect(result.status).not.toBe(0);
    expect(report.status).toBe('fail');
    for (const finding of report.findings) {
      expect(finding.verdict).toBeUndefined();
    }
  });
});
