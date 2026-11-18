/**
 * Process-truth gates (过程审计 B-2/B-5):
 *   - gates.confirmation: enforced — apply refuses without a RECORDED
 *     confirm decision; `stdd confirm --yes` unblocks it.
 *   - gates.refinement: off|warn|block — verify probes artifact refinement
 *     depth (ff template shape, single-requirement/single-scenario specs,
 *     OPEN design decisions).
 * Defaults (advisory/warn) preserve the historical behavior.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const cliPath = path.join(__dirname, '..', 'cli.js');
const { readGateConfig, readConfirmEvidence, isConfirmed } = require('../src/utils/gate-config');
const { VerifyCommand } = require('../src/cli/commands/verify');

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

function createProject(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-process-gates-'));
  const projectPath = path.join(root, name);
  fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
    name: 'gates-test',
    scripts: { test: 'node --test' },
  }));
  fs.mkdirSync(path.join(projectPath, 'test'), { recursive: true });
  fs.writeFileSync(path.join(projectPath, 'test', 'ok.test.js'),
    'const {test}=require("node:test");const a=require("node:assert");test("ok",()=>a.ok(true));\n');
  return { root, projectPath };
}

function writeConfig(projectPath, yaml) {
  fs.writeFileSync(path.join(projectPath, 'stdd', 'config.yaml'), yaml, 'utf8');
}

function makeChange(projectPath, name, extras = {}) {
  const changeDir = path.join(projectPath, 'stdd', 'changes', name);
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'tasks.md'),
    extras.tasks || '- [ ] TASK-001: something [phase:red]\n');
  fs.writeFileSync(path.join(changeDir, 'proposal.md'),
    '# Proposal: gated feature\n\n## Description\n\nsome description\n');
  if (extras.confirmDecision) {
    fs.writeFileSync(path.join(changeDir, 'confirm-decision.json'),
      JSON.stringify(extras.confirmDecision));
  }
  if (extras.specs) {
    const specsDir = path.join(changeDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    for (const [file, content] of Object.entries(extras.specs)) {
      fs.writeFileSync(path.join(specsDir, file), content);
    }
  }
  if (extras.design) {
    fs.writeFileSync(path.join(changeDir, 'design.md'), extras.design);
  }
  return changeDir;
}

afterEach(() => {
  fs.rmSync(path.join(os.tmpdir(), 'stdd-process-gates-'), { recursive: true, force: true });
});

describe('gate-config (B-2/B-5)', () => {
  it('defaults to advisory/warn with no config', () => {
    const { projectPath } = createProject('defaults');
    const cfg = readGateConfig(projectPath);
    expect(cfg.confirmation).toBe('advisory');
    expect(cfg.refinement).toBe('warn');
  });

  it('parses enforced/block and fails CLOSED on an invalid confirmation value', () => {
    const { projectPath } = createProject('enforced');
    writeConfig(projectPath, 'gates:\n  confirmation: enforced\n  refinement: block\n');
    const cfg = readGateConfig(projectPath);
    expect(cfg.confirmation).toBe('enforced');
    expect(cfg.refinement).toBe('block');

    writeConfig(projectPath, 'gates:\n  confirmation: "on!"\n');
    const broken = readGateConfig(projectPath);
    expect(broken.confirmation).toBe('enforced'); // fail closed, never silently advisory
    expect(broken.confirmationInvalidValue).toBe('on!');
  });

  it('treats only manual-override / auto-approved as confirmed', () => {
    const { projectPath } = createProject('evidence');
    const changeDir = makeChange(projectPath, 'ev', {
      confirmDecision: { status: 'pending-human', change: 'ev' },
    });
    expect(isConfirmed(readConfirmEvidence(changeDir))).toBe(false);

    fs.writeFileSync(path.join(changeDir, 'confirm-decision.json'),
      JSON.stringify({ status: 'manual-override', change: 'ev' }));
    expect(isConfirmed(readConfirmEvidence(changeDir))).toBe(true);

    expect(readConfirmEvidence(path.join(projectPath, 'stdd', 'changes', 'missing'))).toBeNull();
  });
});

describe('confirmation gate in apply (B-2)', () => {
  it('enforced: refuses without a recorded decision, then unblocks via confirm --yes', () => {
    const { projectPath } = createProject('apply-gate');
    runCli(['init', '--yes', '--skip-skills'], projectPath);
    const changeDir = makeChange(projectPath, 'gated');
    writeConfig(projectPath, 'version: "1.0"\ngates:\n  confirmation: enforced\n');

    const refused = runCli(['apply', 'gated', '--phase', 'red'], projectPath);
    expect(refused.status).toBe(1);
    expect(refused.stdout).toContain('Confirmation gate');
    expect(refused.stdout).toContain('stdd confirm gated --yes');
    // Nothing ran: no RED evidence fabricated by the refusal.
    expect(fs.existsSync(path.join(changeDir, 'apply.log'))).toBe(true);
    expect(fs.readFileSync(path.join(changeDir, 'apply.log'), 'utf8')).toContain('confirmation-gate-blocked');

    const confirmed = runCli(['confirm', 'gated', '--yes'], projectPath);
    expect(confirmed.status).toBe(0);
    expect(fs.existsSync(path.join(changeDir, 'confirm-decision.json'))).toBe(true);

    // With evidence the gate opens: apply proceeds to the real RED verdict
    // (tests are green here, so RED is refused for the RIGHT reason).
    const proceed = runCli(['apply', 'gated', '--phase', 'red'], projectPath);
    expect(proceed.status).toBe(1);
    expect(proceed.stdout).not.toContain('Confirmation gate');
    expect(proceed.stdout).toContain('RED Phase Violation');
  });

  it('advisory (default): no gate — behavior unchanged', () => {
    const { projectPath } = createProject('apply-advisory');
    runCli(['init', '--yes', '--skip-skills'], projectPath);
    makeChange(projectPath, 'free');
    // No gates config at all: apply runs straight to its RED verdict.
    const result = runCli(['apply', 'free', '--phase', 'red'], projectPath);
    expect(result.stdout).not.toContain('Confirmation gate');
  });

  it('enforced: pending-human is NOT a pass', () => {
    const { projectPath } = createProject('pending');
    runCli(['init', '--yes', '--skip-skills'], projectPath);
    makeChange(projectPath, 'pend', {
      confirmDecision: { status: 'pending-human', change: 'pend' },
    });
    writeConfig(projectPath, 'gates:\n  confirmation: enforced\n');
    const refused = runCli(['apply', 'pend', '--phase', 'red'], projectPath);
    expect(refused.status).toBe(1);
    expect(refused.stdout).toContain("decision status 'pending-human'");
  });
});

describe('refinement gate in verify (B-5)', () => {
  const ffSkeletonSpec = [
    '## ADDED Requirements',
    '',
    '### Requirement: add favorites',
    '',
    'The system SHALL add favorites.',
    '',
    '#### Scenario: add favorites',
    '',
    '- **GIVEN** the current system state',
    '- **WHEN** the behavior "add favorites" is exercised',
    '- **THEN** "add favorites" is delivered as specified',
    '',
  ].join('\n');

  const refinedSpec = [
    '### Requirement: Favorite an article',
    'The system SHALL favorite an article.',
    '#### Scenario: Authenticated user favorites',
    '- **GIVEN** an authenticated user',
    '- **WHEN** they favorite an article',
    '- **THEN** the favorite is persisted',
    '#### Scenario: Unauthenticated favorite is rejected',
    '- **GIVEN** an anonymous visitor',
    '- **WHEN** they favorite an article',
    '- **THEN** the API responds 401',
    '',
    '### Requirement: Unfavorite an article',
    'The system SHALL remove favorites.',
    '#### Scenario: Remove existing favorite',
    '- **WHEN** the user unfavorites',
    '- **THEN** the favorite is deleted',
    '',
  ].join('\n');

  it('detects the unrefined ff skeleton', () => {
    const cmd = new VerifyCommand();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-refine-'));
    const changeDir = path.join(root, 'skel');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'specs', 'spec.md'), ffSkeletonSpec);
    fs.writeFileSync(path.join(changeDir, 'design.md'),
      '# Design\n\n### AD-1: approach\n\nStatus: OPEN — fill me\n');
    const result = cmd.checkRefinement(changeDir);
    expect(result.refined).toBe(false);
    expect(result.signals.some(s => s.includes('ff template shape'))).toBe(true);
    expect(result.signals.some(s => s.includes('single requirement'))).toBe(true);
    expect(result.signals.some(s => s.includes('Status: OPEN'))).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('passes a refined change', () => {
    const cmd = new VerifyCommand();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-refine-'));
    const changeDir = path.join(root, 'good');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'specs', 'spec.md'), refinedSpec);
    fs.writeFileSync(path.join(changeDir, 'design.md'),
      '# Design\n\n### AD-1: approach\n\nDecision: event-sourced favorites.\n');
    const result = cmd.checkRefinement(changeDir);
    expect(result.refined).toBe(true);
    expect(result.signals).toEqual([]);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('block mode fails verify on an unrefined skeleton and off mode stays silent', () => {
    const { projectPath } = createProject('modes');
    runCli(['init', '--yes', '--skip-skills'], projectPath);
    makeChange(projectPath, 'skel', {
      tasks: '- [x] TASK-001: done\n',
      specs: { 'spec.md': ffSkeletonSpec },
      design: '# Design\n\n### AD-1: a\n\nStatus: OPEN\n',
    });

    writeConfig(projectPath, 'version: "1.0"\ngates:\n  refinement: block\n');
    const blocked = runCli(['verify', 'skel', '--no-constitution'], projectPath);
    expect(blocked.status).toBe(1);
    expect(blocked.stdout).toContain('Refinement gate (block)');

    writeConfig(projectPath, 'version: "1.0"\ngates:\n  refinement: warn\n');
    const warned = runCli(['verify', 'skel', '--no-constitution'], projectPath);
    expect(warned.stdout).toContain('Refinement (advisory): unrefined skeleton signals');

    writeConfig(projectPath, 'version: "1.0"\ngates:\n  refinement: off\n');
    const off = runCli(['verify', 'skel', '--no-constitution'], projectPath);
    expect(off.stdout).not.toContain('Refinement');
  });
});
