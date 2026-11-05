/**
 * Tests for legacy notices on simulation-style capabilities
 * (model-strength adaptation P2-1).
 *
 * Single-model role simulation, SudoLang pseudo-code interpretation, and
 * Party-Mode debate are weak-model-era compensation layers. With strong
 * base models they are optional analysis tools, not recommended defaults —
 * the CLI now says so in their output, once, in a dim line.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('legacy notices on simulation capabilities', () => {
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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-legacy-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
    return projectPath;
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  it('roles list carries the legacy notice', () => {
    const projectPath = createProject('legacy-roles');

    const result = runCli(['roles', 'list'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('legacy');
    expect(result.stdout).toContain('optional');
  });

  it('roles party carries the legacy notice', () => {
    const projectPath = createProject('legacy-party');

    const result = runCli(['roles', 'party', 'login flow'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('legacy');
  });

  it('runtime agent start carries the legacy notice', () => {
    const projectPath = createProject('legacy-agent');

    const result = runCli(['runtime', 'agent', 'start', 'design review'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('legacy');
  });
});
