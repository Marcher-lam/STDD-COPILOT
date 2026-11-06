/**
 * Tests for the schema-driven validation DSL executor (P1a) and env
 * interpolation (P1b).
 *
 * schema.yaml's `validation:` section (min_length / min_items on change
 * artifacts) was declarative theater — zero consumers. The executor makes
 * it real: `stdd validate <change> --schema-driven` runs the declared rules
 * against the change's artifacts. Rules already enforced elsewhere (red
 * line, scenario shape) stay with their engines — the DSL mapping is
 * documented in schema.yaml.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { interpolateString, interpolateObject } = require('../src/utils/env-interpolate');
const { runSchemaRules } = require('../src/utils/schema-rules');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('P1b: env interpolation', () => {
  it('resolves set vars, defaults for unset, and empty for unknown', () => {
    process.env.STDD_TEST_SET = 'yes';
    delete process.env.STDD_TEST_UNSET;
    expect(interpolateString('${STDD_TEST_SET:-no}')).toBe('yes');
    expect(interpolateString('${STDD_TEST_UNSET:-fallback}')).toBe('fallback');
    expect(interpolateString('${STDD_TEST_UNKNOWN}')).toBe('');
    expect(interpolateString('model=${STDD_TEST_SET}!')).toBe('model=yes!');
  });

  it('interpolates deep objects', () => {
    process.env.STDD_ENG = 'on';
    expect(interpolateObject({
      a: '${STDD_ENG:-off}',
      nested: { b: ['${STDD_ENG:-off}', 42] },
      n: null,
    })).toEqual({ a: 'on', nested: { b: ['on', 42] }, n: null });
  });
});

describe('P1a: schema-rules executor', () => {
  function writeProject(rulesYaml, artifacts) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-sch-'));
    roots.push(root);
    const cwd = path.join(root, 'p');
    fs.mkdirSync(path.join(cwd, 'stdd', 'changes', 'demo'), { recursive: true });
    fs.mkdirSync(path.join(cwd, 'stdd', 'schemas', 'spec-driven'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'stdd', 'schemas', 'spec-driven', 'schema.yaml'),
      `name: spec-driven\nvalidation:\n${rulesYaml}`, 'utf8');
    for (const [rel, content] of Object.entries(artifacts)) {
      const target = path.join(cwd, 'stdd', 'changes', 'demo', rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
    }
    return cwd;
  }

  it('enforces min_length on proposal sections', () => {
    const cwd = writeProject('  proposal:\n    - field: Intent\n      required: true\n      min_length: 50\n', {
      'proposal.md': '# Proposal\n\n## Intent\n\nshort\n',
    });

    const findings = runSchemaRules(cwd, 'demo');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]).toMatchObject({ rule: 'min_length', severity: 'blocking' });
    expect(findings[0].field).toContain('Intent');
  });

  it('passes when the rule is satisfied', () => {
    const long = 'x'.repeat(60);
    const cwd = writeProject('  proposal:\n    - field: Intent\n      required: true\n      min_length: 50\n', {
      'proposal.md': `# Proposal\n\n## Intent\n\n${long}\n`,
    });
    expect(runSchemaRules(cwd, 'demo')).toEqual([]);
  });

  it('enforces min_items on scope lists and required presence', () => {
    const cwd = writeProject('  proposal:\n    - field: Scope.In Scope\n      required: true\n      min_items: 2\n', {
      'proposal.md': '# Proposal\n\n## Scope\n\n### In Scope\n\n- only one item\n',
    });

    const findings = runSchemaRules(cwd, 'demo');
    expect(findings.some(f => f.rule === 'min_items')).toBe(true);
  });

  it('reports a missing section as required', () => {
    const cwd = writeProject('  proposal:\n    - field: Intent\n      required: true\n', {
      'proposal.md': '# Proposal\n\nnothing here\n',
    });
    const findings = runSchemaRules(cwd, 'demo');
    expect(findings.some(f => f.rule === 'required')).toBe(true);
  });

  it('CLI: stdd validate demo --schema-driven surfaces findings', () => {
    const cwd = writeProject('  proposal:\n    - field: Intent\n      required: true\n      min_length: 50\n', {
      'proposal.md': '# Proposal\n\n## Intent\n\nshort\n',
      'specs/ok.feature': 'Feature: X\n  Scenario: S\n    Given a\n    When b\n    Then c\n',
    });

    const result = spawnSync(process.execPath, [cliPath, 'validate', 'demo', '--schema-driven', '--json'], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    const report = JSON.parse(result.stdout);
    expect(report.status).toBe('fail');
    expect(report.diagnostics.some(d => d.rule === 'min_length')).toBe(true);
    expect(report.mode).toBe('schema-driven');
  });
});
