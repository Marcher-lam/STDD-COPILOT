/**
 * P1-3 regression: an explicitly skipped check must be recorded as SKIPPED,
 * never as PASS.
 *
 * Real-world report finding: `verify --no-constitution` recorded the
 * constitution result as status 'pass', the evidence carried that status,
 * and the archive summary then printed "Constitution Status: PASS" — a
 * factual distortion of the audit trail.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const EvidenceCapture = require('../src/utils/evidence-capture');
const { ArchiveCommand } = require('../src/cli/commands/archive');

const CLI = path.join(__dirname, '..', 'cli.js');

function runCli(args, cwd) {
  const result = execFileSync('node', [CLI, ...args], { cwd, encoding: 'utf8' });
  return result;
}

function makeProject(setup) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-skipped-status-'));
  setup(root);
  return root;
}

const tempDirs = [];
afterAll(() => {
  for (const d of tempDirs) {
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('EvidenceCapture._determineStatus with skipped constitution', () => {
  const capture = new EvidenceCapture();
  const base = { tasks: { allDone: true }, tests: { passed: true }, lint: null };

  test('skipped constitution does not fail a verify evidence', () => {
    const status = capture._determineStatus(
      { ...base, constitution: { status: 'skipped', reason: '--no-constitution' } },
      'verify'
    );
    expect(status).toBe('pass');
  });

  test('passing constitution still passes', () => {
    const status = capture._determineStatus({ ...base, constitution: { status: 'pass' } }, 'verify');
    expect(status).toBe('pass');
  });

  test('failing constitution still fails', () => {
    const status = capture._determineStatus({ ...base, constitution: { status: 'fail' } }, 'verify');
    expect(status).toBe('fail');
  });
});

describe('verify --no-constitution records SKIPPED end to end', () => {
  test('evidence file carries constitution.status=skipped and verify still passes', () => {
    const root = makeProject((p) => {
      tempDirs.push(p);
      const change = path.join(p, 'stdd', 'changes', 'demo');
      fs.mkdirSync(change, { recursive: true });
      fs.writeFileSync(path.join(change, 'tasks.md'), '- [x] TASK-001 Done\n');
      fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal: demo\n');
    });

    const output = runCli(
      ['verify', 'demo', '--test-command', 'true', '--no-constitution'],
      root
    );

    // Console output distinguishes the three states
    expect(output).toContain('Constitution: SKIPPED');
    expect(output).toContain('Verification passed');

    const evidenceDir = path.join(root, 'stdd', 'changes', 'demo', 'evidence');
    const files = fs.readdirSync(evidenceDir).filter(f => f.startsWith('verify-'));
    expect(files.length).toBeGreaterThan(0);
    files.sort();
    const evidence = JSON.parse(
      fs.readFileSync(path.join(evidenceDir, files[files.length - 1]), 'utf8')
    );
    expect(evidence.results.constitution.status).toBe('skipped');
    expect(evidence.results.constitution.reason).toBe('--no-constitution');
    // The skip is a recorded decision, not a failure of verification itself
    expect(evidence.status).toBe('pass');
  });
});

describe('archive summary renders SKIPPED (not PASS)', () => {
  test('generateSummary maps skipped constitution to SKIPPED', () => {
    const root = makeProject((p) => {
      tempDirs.push(p);
      const change = path.join(p, 'stdd', 'changes', 'demo');
      fs.mkdirSync(path.join(change, 'evidence'), { recursive: true });
      fs.writeFileSync(path.join(change, 'tasks.md'), '- [x] TASK-001 Done\n');
      fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal: demo\n');
      fs.writeFileSync(
        path.join(change, 'evidence', 'verify-1000.json'),
        JSON.stringify({
          type: 'verify',
          status: 'pass',
          results: {
            tasks: { allDone: true },
            tests: { passed: true },
            constitution: { status: 'skipped', reason: '--no-constitution' },
          },
          metadata: { changeName: 'demo' },
        })
      );
    });

    const cmd = new ArchiveCommand();
    cmd.generateSummary(path.join(root, 'stdd', 'changes', 'demo'));

    const summary = fs.readFileSync(
      path.join(root, 'stdd', 'changes', 'demo', 'summary.md'),
      'utf8'
    );
    expect(summary).toContain('Constitution Status: SKIPPED');
    expect(summary).not.toContain('Constitution Status: PASS');
  });
});
