/**
 * Tests for config-section wiring (round 4 audit):
 *
 * - test_pipeline  -> stdd pipeline reads output/ir dirs + placeholder mode
 * - mutation_review-> stdd mutation quick honors config enabled/threshold
 * - sprint_spec    -> spec-generator warns when a change exceeds
 *                     max_scenarios_per_feature
 * - update         -> npm latest-version check with offline graceful fallback
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { PipelineCommand } = require('../src/cli/commands/pipeline');
const { SpecGenerator } = require('../src/cli/commands/spec-generator');
const { compareVersions } = require('../src/utils/version-check');

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-cfg-'));
  roots.push(root);
  const projectPath = path.join(root, name);
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

describe('test_pipeline -> stdd pipeline', () => {
  it('honors configured output_dir and ir_dir', () => {
    const projectPath = createProject('pipe-cfg', {
      'stdd/config.yaml': 'test_pipeline:\n  output_dir: builds/tests\n  ir_dir: builds/ir\n',
      'stdd/specs/login.feature': 'Feature: Login\n  Scenario: ok\n    Given a\n    When b\n    Then c\n',
    });

    const result = new PipelineCommand(projectPath).execute(null, {});
    expect(result.files.some(f => f.includes(path.join('builds', 'tests')))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'builds', 'ir', 'ir.json'))).toBe(true);
  });
});

describe('mutation_review -> stdd mutation quick', () => {
  it('picks up enabled=false and threshold from config', () => {
    const projectPath = createProject('mut-cfg', {
      'stdd/config.yaml': 'mutation_review:\n  enabled: false\n',
      'stdd/changes/demo/tasks.md': '- [x] TASK-001 done\n',
    });

    const result = runCli(['mutation', 'demo', '--json'], projectPath);
    const report = JSON.parse(result.stdout);
    expect(report.mode).toBe('quick');
    expect(report.config).toMatchObject({ enabled: false });
  });

  it('a configured threshold overrides the default 80', () => {
    const projectPath = createProject('mut-th', {
      'stdd/config.yaml': 'mutation_review:\n  enabled: true\n  threshold: 55\n',
      'stdd/changes/demo/tasks.md': '- [x] TASK-001 done\n',
    });

    const result = runCli(['mutation', 'demo', '--json'], projectPath);
    const report = JSON.parse(result.stdout);
    expect(report.threshold).toBe(55);
  });
});

describe('sprint_spec -> spec-generator scenario budget', () => {
  it('warns when a change exceeds max_scenarios_per_feature', async () => {
    const projectPath = createProject('spec-cap', {
      'stdd/config.yaml': 'sprint_spec:\n  max_scenarios_per_feature: 2\n',
      'stdd/changes/demo/tasks.md': '- [ ] TASK-001: alpha task\n- [ ] TASK-002: beta task\n- [ ] TASK-003: gamma task\n',
    });

    const logs = [];
    const orig = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    const origCwd = process.cwd();
    process.chdir(projectPath);
    try {
      await new SpecGenerator().generateFromTasks('demo', {});
    } finally {
      process.chdir(origCwd);
      console.log = orig;
    }
    const all = logs.join('\n');
    expect(all).toMatch(/max_scenarios_per_feature|sprint_spec/);
  });
});

describe('stdd update version check', () => {
  it('compares semver versions correctly', () => {
    expect(compareVersions('1.2.2', '1.2.3')).toBe(-1);
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('2.0.0-rc.1', '2.0.0')).toBeLessThan(0);
  });

  it('reports gracefully when the registry is unreachable', () => {
    const projectPath = createProject('upd-off', {
      'stdd/config.yaml': 'version: "1.0"\n',
      'package.json': JSON.stringify({ name: 'x', version: '1.0.0' }),
    });

    // npm view against a nonexistent package with a short timeout: fails fast.
    const result = runCli(['update', '--check-version', '--json'], projectPath);
    const out = (result.stdout || '') + (result.stderr || '');
    expect(result.status).toBe(0); // graceful: never hard-fail the update
    expect(out).toMatch(/latest|up.to.date|unreachable|offline|registry/i);
  });
});
