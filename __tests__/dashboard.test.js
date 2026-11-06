/**
 * Tests for the zero-dependency dashboard (frontend item 1).
 *
 * `stdd dashboard generate` reads the stdd/ directory (changes, state,
 * evidence, deferred/rulings ledgers, history) and renders a SINGLE-FILE
 * HTML dashboard (inline JSON + vanilla JS, no build step, no CDN).
 * `--serve` starts a tiny local http server on the generated file.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { buildDashboardData, renderDashboardHtml } = require('../src/utils/dashboard');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

function createProject(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-dash-'));
  roots.push(root);
  return path.join(root, name);
}

describe('buildDashboardData', () => {
  it('aggregates changes, ledgers, and evidence', () => {
    const cwd = createProject('dash-data');
    const changeDir = path.join(cwd, 'stdd', 'changes', 'add-auth');
    fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] A\n- [ ] B\n', 'utf8');
    fs.writeFileSync(path.join(changeDir, '.state.yaml'), 'rigor: strict\ninterruptions_used: 1\n', 'utf8');
    fs.writeFileSync(path.join(changeDir, 'deferred-work.md'),
      '# Deferred Work\n\n- [ ] #1 [2026-11-06] Fix a11y (source: verify)\n', 'utf8');
    fs.writeFileSync(path.join(changeDir, 'rulings.md'),
      '# Rulings\n\n- #1 [2026-11-06] Inline it — stable — copy cost\n', 'utf8');
    fs.writeFileSync(path.join(changeDir, 'evidence', 'verify-100.json'),
      JSON.stringify({ status: 'pass', results: { constitution: { status: 'pass' } } }), 'utf8');

    const data = buildDashboardData(cwd);

    expect(data.changes).toHaveLength(1);
    const change = data.changes[0];
    expect(change.name).toBe('add-auth');
    expect(change.rigor).toBe('strict');
    expect(change.tasks).toMatchObject({ done: 1, total: 2 });
    expect(change.deferred.open).toBe(1);
    expect(change.rulings.total).toBe(1);
    expect(change.lastVerifyStatus).toBe('pass');
    expect(data.generatedAt).toBeTruthy();
  });

  it('handles an empty stdd/ gracefully', () => {
    const cwd = createProject('dash-empty');
    fs.mkdirSync(path.join(cwd, 'stdd', 'changes'), { recursive: true });
    const data = buildDashboardData(cwd);
    expect(data.changes).toEqual([]);
  });
});

describe('renderDashboardHtml', () => {
  it('embeds the data and renders key sections with vanilla JS', () => {
    const data = {
      generatedAt: '2026-11-06T00:00:00Z',
      changes: [{ name: 'demo', rigor: 'light', tasks: { done: 1, total: 2 }, deferred: { open: 0, total: 0 }, rulings: { total: 0 }, lastVerifyStatus: 'pass', interruptionsUsed: 0 }],
    };
    const html = renderDashboardHtml(data);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('STDD Dashboard');
    expect(html).toContain('window.STDD_DATA');
    expect(html).toContain('demo');
    expect(html).toMatch(/<script>/);
    // No external network dependencies.
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});

describe('stdd dashboard (CLI)', () => {
  it('generate writes stdd/dashboard.html from a real project', () => {
    const cwd = createProject('dash-cli');
    const changeDir = path.join(cwd, 'stdd', 'changes', 'feat');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] A\n', 'utf8');

    const result = spawnSync(process.execPath, [cliPath, 'dashboard', 'generate'], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const html = fs.readFileSync(path.join(cwd, 'stdd', 'dashboard.html'), 'utf8');
    expect(html).toContain('feat');
    expect(html).toContain('STDD Dashboard');
    expect(result.stdout).toMatch(/dashboard\.html/);
  });

  it('serve responds with the generated dashboard over http', async () => {
    const http = require('http');
    const { DashboardCommand } = require('../src/cli/commands/dashboard');
    const cwd = createProject('dash-serve');
    const changeDir = path.join(cwd, 'stdd', 'changes', 'feat');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] A\n', 'utf8');

    const cmd = new DashboardCommand(cwd);
    const { server } = await cmd.serve({ port: 0 });
    const port = server.address().port;

    const body = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/`, res => {
        let data = '';
        res.on('data', d => { data += d; });
        res.on('end', () => resolve({ code: res.statusCode, data }));
      }).on('error', reject);
    });

    expect(body.code).toBe(200);
    expect(body.data).toContain('STDD Dashboard');
    expect(body.data).toContain('feat');
    server.close();
  });

  it('generate is the default action', () => {
    const cwd = createProject('dash-default');
    fs.mkdirSync(path.join(cwd, 'stdd', 'changes'), { recursive: true });
    const result = spawnSync(process.execPath, [cliPath, 'dashboard'], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(cwd, 'stdd', 'dashboard.html'))).toBe(true);
  });
});
