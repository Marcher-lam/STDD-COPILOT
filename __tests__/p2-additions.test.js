/**
 * P2 additions: issue --change-name, ui/design workspace scoping, graph
 * global timeout.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

function createProject(name, files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-p2-'));
  roots.push(root);
  const projectPath = path.join(root, name);
  fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(projectPath, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
  }
  return projectPath;
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('P2: issue --change-name', () => {
  it('creates the bug change under the requested name', () => {
    const projectPath = createProject('p2-issue');
    const result = runCli(['issue', 'payments broken', '--change-name', 'pay-bug'], projectPath);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'pay-bug', 'proposal.md'))).toBe(true);
  });
});

describe('P2: ui --workspace output scoping', () => {
  it('defaults output into <workspace>/src/components', () => {
    const projectPath = createProject('p2-ws', {
      'package.json': JSON.stringify({ private: true, workspaces: ['packages/*'] }),
      'packages/api/package.json': JSON.stringify({ name: '@demo/api' }),
      'packages/api/src/index.js': 'export {};\n',
    });

    const result = runCli(['ui', 'generate', 'Widget', '--workspace', '@demo/api'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'packages', 'api', 'src', 'components', 'Widget.tsx'))).toBe(true);
  });

  it('still rejects an unknown workspace', () => {
    const projectPath = createProject('p2-ws-bad');
    const result = runCli(['ui', 'generate', 'Widget', '--workspace', '@nope/ghost'], projectPath);
    expect(result.status).not.toBe(0);
  });
});

describe('P2: design reverse --workspace scans the workspace root', () => {
  it('extracts tokens from the workspace, not the repo root', () => {
    const projectPath = createProject('p2-dr', {
      'package.json': JSON.stringify({ private: true, workspaces: ['packages/*'] }),
      'packages/ui/package.json': JSON.stringify({ name: '@demo/ui' }),
      'packages/ui/tailwind.config.js': "module.exports = { theme: { extend: { colors: { wsink: '#432198' } } } };",
    });

    const result = runCli(['design', 'reverse', '--workspace', '@demo/ui'], projectPath);

    expect(result.status).toBe(0);
    const design = fs.readFileSync(path.join(projectPath, 'DESIGN.md'), 'utf8');
    expect(design).toContain('#432198');
  });
});

describe('P2: graph global timeout', () => {
  it('aborts the run when graph.timeout is exceeded', async () => {
    jest.mock('../src/cli/commands/ff');
    jest.mock('../src/cli/commands/spec-generator');
    jest.mock('../src/cli/commands/apply');
    jest.mock('../src/cli/commands/verify');
    jest.mock('../src/cli/commands/archive');
    jest.mock('../src/cli/commands/fix-packet');
    jest.mock('../src/cli/commands/outside-in');
    jest.mock('../src/cli/commands/explore');
    jest.mock('../src/cli/commands/elicitation');
    const { FFCommand } = require('../src/cli/commands/ff');
    const { ExploreCommand } = require('../src/cli/commands/explore');
    const { ElicitationCommand } = require('../src/cli/commands/elicitation');
    const { GraphRunCommand } = require('../src/cli/commands/graph-run');

    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-gto-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'stdd', 'changes'), { recursive: true });
    fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), 'graph:\n  timeout: 1\n'); // 1ms
    const originalCwd = process.cwd();
    process.chdir(root);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    FFCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));
    ExploreCommand.mockImplementation(() => ({ execute: jest.fn(async () => { await new Promise(r => setTimeout(r, 5)); }) }));
    ElicitationCommand.mockImplementation(() => ({ execute: jest.fn().mockResolvedValue({}) }));

    try {
      const result = await new GraphRunCommand().execute('research', { changeName: 'gto-demo', noCache: true });
      expect(result.failedAt).toBe('graph-timeout');
      expect(result.steps.some(s => s.node === 'graph-timeout')).toBe(true);
    } finally {
      process.chdir(originalCwd);
      logSpy.mockRestore();
      jest.restoreAllMocks();
    }
  });
});
