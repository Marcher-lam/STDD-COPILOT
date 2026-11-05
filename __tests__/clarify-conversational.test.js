/**
 * Tests for conversational clarify mode (model-strength adaptation P1-2).
 *
 * The old behavior dumped the same 20 boilerplate questions ("expected
 * throughput?", "compliance requirements?") into every proposal regardless
 * of relevance — ceremony that strong models pay for in noise. The default
 * is now conversational: a small core set plus questions selected by
 * proposal signals. --exhaustive restores the full checklist.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('clarify conversational mode', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const roots = [];

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createProject(name, proposalContent) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-clarify-conv-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposalContent, 'utf8');
    return { projectPath, changeDir };
  }

  afterEach(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  const SIMPLE_PROPOSAL = [
    '# Proposal: Add logout button',
    '',
    '## description',
    'Add a logout button to the header that clears the session.',
    '',
    '## scope',
    '- header button',
    '',
    '## success_criteria',
    '- user is logged out',
  ].join('\n');

  const INTEGRATION_PROPOSAL = [
    '# Proposal: Sync with external API',
    '',
    '## description',
    'Sync user data with an external billing API. Performance matters: the',
    'sync must finish within a second.',
    '',
    '## scope',
    '- api client',
    '',
    '## success_criteria',
    '- data synced',
  ].join('\n');

  function questionCount(content) {
    return (content.match(/^- \[ \] /gm) || []).length;
  }

  it('asks a small, focused question set for a simple proposal by default', () => {
    const { projectPath, changeDir } = createProject('conv-simple', SIMPLE_PROPOSAL);

    const result = runCli(['clarify', 'demo'], projectPath);

    expect(result.status).toBe(0);
    const proposal = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    expect(questionCount(proposal)).toBeLessThanOrEqual(6);
    // Irrelevant boilerplate must not appear for a plain UI tweak.
    expect(proposal).not.toContain('throughput');
    expect(proposal).not.toContain('compliance');
    expect(proposal).toMatch(/Mode:\s*conversational/);
  });

  it('surfaces integration and performance questions when the proposal signals them', () => {
    const { projectPath, changeDir } = createProject('conv-integration', INTEGRATION_PROPOSAL);

    const result = runCli(['clarify', 'demo'], projectPath);

    expect(result.status).toBe(0);
    const proposal = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    expect(proposal).toContain('external systems');
    expect(proposal).toContain('response time');
    // Still bounded — conversational, not exhaustive.
    expect(questionCount(proposal)).toBeLessThanOrEqual(9);
  });

  it('keeps the full checklist available via --exhaustive', () => {
    const { projectPath, changeDir } = createProject('conv-exhaustive', SIMPLE_PROPOSAL);

    const result = runCli(['clarify', 'demo', '--exhaustive'], projectPath);

    expect(result.status).toBe(0);
    const proposal = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    expect(questionCount(proposal)).toBe(20);
    expect(proposal).toContain('throughput');
    expect(proposal).toContain('compliance');
    expect(proposal).toMatch(/Mode:\s*exhaustive/);
  });

  it('always asks the core questions (boundaries, empty inputs, failures)', () => {
    const { projectPath, changeDir } = createProject('conv-core', SIMPLE_PROPOSAL);

    runCli(['clarify', 'demo'], projectPath);

    const proposal = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    expect(proposal).toContain('input boundaries');
    expect(proposal).toContain('empty/null');
    expect(proposal).toContain('failure scenarios');
  });
});
