/**
 * 终测复验 F1 regression: `stdd init` writes declarative `${VAR:-default}`
 * placeholders into stdd/config.yaml when tech-stack detection fails
 * (fresh projects without a package.json). Consumers MUST interpolate them
 * before use — pre-fix, `stdd verify` spawned the literal
 * `${TEST_COMMAND:-npm test}` string (spawnSync ENOENT) and a fresh
 * project's first verify reported Tests FAIL until the config was edited
 * by hand.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { getConfigTestCommand, resolveTestCommands } = require('../src/utils/test-command-resolver');

const PLACEHOLDER_CONFIG = [
  '# STDD Copilot Configuration',
  'version: "1.0"',
  'project:',
  '  type: "${PROJECT_TYPE:-typescript}"',
  '  language: "${LANGUAGE:-typescript}"',
  'test:',
  '  command: "${TEST_COMMAND:-npm test}"',
  '  runner: "unknown"',
].join('\n');

function createTempProject(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-f1-'));
  const projectPath = path.join(root, name);
  fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
  fs.writeFileSync(path.join(projectPath, 'stdd', 'config.yaml'), PLACEHOLDER_CONFIG, 'utf8');
  return projectPath;
}

describe('config placeholder interpolation (F1)', () => {
  const roots = [];
  const originalTestCommand = process.env.TEST_COMMAND;

  function tmp(name) {
    const p = createTempProject(name);
    roots.push(p);
    return p;
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
    if (originalTestCommand === undefined) delete process.env.TEST_COMMAND;
    else process.env.TEST_COMMAND = originalTestCommand;
  });

  it('getConfigTestCommand interpolates ${TEST_COMMAND:-npm test} to npm test', () => {
    delete process.env.TEST_COMMAND;
    const p = tmp('interp-default');
    expect(getConfigTestCommand(p)).toBe('npm test');
  });

  it('getConfigTestCommand honors an explicit TEST_COMMAND env override', () => {
    process.env.TEST_COMMAND = 'pnpm test';
    const p = tmp('interp-env');
    expect(getConfigTestCommand(p)).toBe('pnpm test');
  });

  it('plain configured commands pass through unchanged', () => {
    const p = tmp('interp-plain');
    fs.writeFileSync(path.join(p, 'stdd', 'config.yaml'),
      'test:\n  command: "npm run spec"\n', 'utf8');
    expect(getConfigTestCommand(p)).toBe('npm run spec');
  });

  it('the verify call chain resolves a placeholder config to a runnable command', () => {
    delete process.env.TEST_COMMAND;
    const p = tmp('interp-chain');
    const commands = resolveTestCommands(p, { configCommand: getConfigTestCommand(p) });
    expect(commands).toHaveLength(1);
    expect(commands[0].command).toBe('npm test');
    expect(commands[0].command).not.toContain('${');
  });

  it('product-proposal interpolates project.type/language before generating text', () => {
    const { ProductProposalCommand } = require('../src/cli/commands/product-proposal');
    const p = tmp('interp-product');
    const cmd = new ProductProposalCommand(p);
    cmd.scanArtifacts();
    expect(cmd.artifacts.config.project.language).toBe('typescript');
    expect(cmd.artifacts.config.project.type).toBe('typescript');
    expect(JSON.stringify(cmd.artifacts.config)).not.toContain('${');
  });

  // The real F1 acceptance: a fresh `stdd init` project (placeholder config
  // on disk, untouched by hand) runs its actual test command on verify.
  it('CLI: init → verify runs npm test without manual config edits', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-f1-cli-'));
    roots.push(root);
    const p = path.join(root, 'proj');
    fs.mkdirSync(p, { recursive: true });

    const init = spawnSync(process.execPath, [cliPath, 'init'], {
      cwd: p, encoding: 'utf8', env: { ...process.env, CI: '1' },
    });
    expect(init.status).toBe(0);

    // init without a package.json writes the placeholder — assert the defect
    // precondition is really on disk, then add a minimal testable project.
    const config = fs.readFileSync(path.join(p, 'stdd', 'config.yaml'), 'utf8');
    expect(config).toContain('${TEST_COMMAND:-npm test}');

    fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({
      name: 'fresh-project', private: true, scripts: { test: 'node -e "console.log(42)"' },
    }, null, 2), 'utf8');

    const created = spawnSync(process.execPath, [cliPath, 'new', 'change', 'demo'], {
      cwd: p, encoding: 'utf8', env: { ...process.env, CI: '1' },
    });
    expect(created.status).toBe(0);
    const changeDir = path.join(p, 'stdd', 'changes', 'demo');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001: done\n', 'utf8');

    const verify = spawnSync(process.execPath, [cliPath, 'verify', 'demo', '--no-constitution'], {
      cwd: p, encoding: 'utf8', env: { ...process.env, CI: '1' },
    });

    expect(verify.stdout).not.toContain('ENOENT');
    expect(verify.stdout).not.toContain('${TEST_COMMAND');
    expect(verify.stdout).toMatch(/Tests:\s+PASS/);
  });
});
