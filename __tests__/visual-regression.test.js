/**
 * Tests for the visual regression gate (frontend item 2).
 *
 * `stdd browser baseline <url>` stores a named screenshot baseline;
 * `stdd browser diff <url>` re-captures and compares (strict hash equality —
 * any pixel change fails the gate unless --allow-changed), archiving the
 * diff evidence under stdd/evidence/visual/diffs/.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const {
  baselinesDir,
  diffsDir,
  saveBaseline,
  compareWithBaseline,
  archiveDiff,
} = require('../src/utils/visual-regression');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

function tmpProject(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-visual-'));
  roots.push(root);
  const projectPath = path.join(root, name);
  fs.mkdirSync(projectPath, { recursive: true });
  return projectPath;
}

describe('visual-regression engine (pure)', () => {
  it('saves a baseline with a manifest and compares identical buffers as identical', () => {
    const cwd = tmpProject('vr-engine');
    const buf = Buffer.from('PNGDATA-abc');

    const saved = saveBaseline(cwd, 'home', buf, { url: 'https://x.test' });
    expect(fs.existsSync(path.join(baselinesDir(cwd), 'home.png'))).toBe(true);
    const meta = JSON.parse(fs.readFileSync(path.join(baselinesDir(cwd), 'home.meta.json'), 'utf8'));
    expect(meta.url).toBe('https://x.test');
    expect(saved.hash).toBe(meta.hash);

    const result = compareWithBaseline(cwd, 'home', buf);
    expect(result.status).toBe('identical');
  });

  it('detects changes and archives diff evidence', () => {
    const cwd = tmpProject('vr-change');
    saveBaseline(cwd, 'home', Buffer.from('PNG-v1'), { url: 'u' });

    const result = compareWithBaseline(cwd, 'home', Buffer.from('PNG-v2'));
    expect(result.status).toBe('changed');

    const evidencePath = archiveDiff(cwd, 'home', Buffer.from('PNG-v2'), result);
    expect(fs.existsSync(evidencePath.png)).toBe(true);
    expect(JSON.parse(fs.readFileSync(evidencePath.json, 'utf8')).status).toBe('changed');
    expect(fs.readdirSync(diffsDir(cwd)).length).toBeGreaterThanOrEqual(2);
  });

  it('reports missing baselines explicitly', () => {
    const cwd = tmpProject('vr-none');
    expect(compareWithBaseline(cwd, 'ghost', Buffer.from('x')).status).toBe('no-baseline');
  });
});

describe('browser baseline/diff CLI (without playwright installed)', () => {
  it('diff without a baseline reports no-baseline (non-crashing guidance)', () => {
    const cwd = tmpProject('vr-cli');
    const result = runCli(['browser', 'diff', 'https://example.test', '--name', 'home'], cwd);
    const out = (result.stdout || '') + (result.stderr || '');
    expect(result.status).not.toBe(0);
    expect(out).toMatch(/baseline/i);
  });

  it('exposes baseline and diff in the command help', () => {
    const result = runCli(['browser', '--help'], tmpProject('vr-help'));
    const out = (result.stdout || '') + (result.stderr || '');
    expect(out).toMatch(/baseline/);
    expect(out).toMatch(/diff/);
  });
});
