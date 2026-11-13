/**
 * Tests for the risk-triggered confirm gate (model-strength adaptation
 * P0-2).
 *
 * With strong base models, stage-triggered human gates interrupt long
 * autonomous runs for no benefit on low-risk work. In
 * `hitl.mode: risk-triggered`, the confirm gate itself decides:
 * auto-approve only when certainty evidence is at/above the auto threshold
 * AND no irreversible/high-risk signal is present; otherwise it records a
 * pending-human decision and leaves the change unconfirmed. Other modes
 * keep the legacy behavior.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('confirm risk-triggered gate', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, options = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-confirm-risk-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    const riskText = options.risky ? 'This change includes a database migration and drops legacy data.' : '';
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), [
      '# Proposal: Add feature',
      '',
      '## description',
      `A well understood small feature. ${riskText}`,
      '',
      '## scope',
      '- one capability',
      '',
      '## success_criteria',
      '- works',
      '',
      '## constraints',
      '- none',
    ].join('\n'), 'utf8');
    if (options.hitlMode) {
      fs.writeFileSync(path.join(projectPath, 'stdd', 'config.yaml'),
        `hitl:\n  mode: "${options.hitlMode}"\n`, 'utf8');
    }
    if (options.certainty !== undefined) {
      const memoryDir = path.join(projectPath, 'stdd', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });
      fs.writeFileSync(path.join(memoryDir, 'certainty-history.jsonl'),
        `${JSON.stringify({ context: 'demo', overall: options.certainty, timestamp: new Date().toISOString() })}\n`,
        'utf8');
    }
    return { projectPath, changeDir };
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  function decision(changeDir) {
    const file = path.join(changeDir, 'confirm-decision.json');
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  }

  function statusYaml(projectPath) {
    const file = path.join(projectPath, 'stdd', '.status.yaml');
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  }

  it('auto-approves a high-certainty, low-risk proposal', () => {
    const { projectPath, changeDir } = createTempProject('risk-auto', {
      hitlMode: 'risk-triggered',
      certainty: 0.97,
    });

    const result = runCli(['confirm', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('auto-approved');
    expect(statusYaml(projectPath)).toContain('status: confirmed');
    const d = decision(changeDir);
    expect(d.status).toBe('auto-approved');
    expect(d.basis.overall).toBe(0.97);
    expect(d.basis.riskSignals).toEqual([]);
  });

  it('requires a human when an irreversible risk signal is present', () => {
    const { projectPath, changeDir } = createTempProject('risk-signal', {
      hitlMode: 'risk-triggered',
      certainty: 0.99,
      risky: true,
    });

    const result = runCli(['confirm', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('needs human confirmation');
    // The change must NOT be confirmed.
    expect(statusYaml(projectPath)).not.toContain('status: confirmed');
    const d = decision(changeDir);
    expect(d.status).toBe('pending-human');
    expect(d.basis.riskSignals.length).toBeGreaterThan(0);
  });

  it('requires a human when certainty is below the confirm threshold', () => {
    const { projectPath, changeDir } = createTempProject('risk-low', {
      hitlMode: 'risk-triggered',
      certainty: 0.6,
    });

    const result = runCli(['confirm', 'demo'], projectPath);

    expect(result.stdout).toContain('needs human confirmation');
    expect(statusYaml(projectPath)).not.toContain('status: confirmed');
    expect(decision(changeDir).status).toBe('pending-human');
  });

  it('requires a human when no certainty evidence exists (conservative default)', () => {
    const { projectPath } = createTempProject('risk-noevidence', {
      hitlMode: 'risk-triggered',
    });

    const result = runCli(['confirm', 'demo'], projectPath);

    expect(result.stdout).toContain('needs human confirmation');
    expect(statusYaml(projectPath)).not.toContain('status: confirmed');
  });

  // 终测 N-confirm: piped stdin used to auto-confirm — recorded as a human
  // decision it never was. Default mode now refuses without a TTY unless the
  // operator passes an explicit flag; --yes records the honest variant.
  it('refuses to confirm non-interactively in default mode (no flag)', () => {
    const { projectPath, changeDir } = createTempProject('default-nontty', {});

    const result = runCli(['confirm', 'demo'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('--yes');
    // Nothing was recorded: the change stays unconfirmed, no decision file.
    expect(statusYaml(projectPath)).not.toContain('status: confirmed');
    expect(decision(changeDir)).toBeNull();
  });

  it('confirms non-interactively with --yes and records a manual-override decision', () => {
    const { projectPath, changeDir } = createTempProject('default-yes', {});

    const result = runCli(['confirm', 'demo', '--yes'], projectPath);

    expect(result.status).toBe(0);
    expect(statusYaml(projectPath)).toContain('status: confirmed');
    const record = decision(changeDir);
    expect(record.status).toBe('manual-override');
    expect(record.basis.override).toBe('confirm --yes');
    expect(record.basis.interactive).toBe(false);
  });

  it('confirms with --skip and records the override basis', () => {
    const { projectPath, changeDir } = createTempProject('default-skip', {});

    const result = runCli(['confirm', 'demo', '--skip'], projectPath);

    expect(result.status).toBe(0);
    expect(statusYaml(projectPath)).toContain('status: confirmed');
    const record = decision(changeDir);
    expect(record.status).toBe('manual-override');
    expect(record.basis.override).toBe('confirm --skip');
  });
});
