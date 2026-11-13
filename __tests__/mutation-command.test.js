const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('mutation CLI command', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createProject() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-mutation-'));
    fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
    return root;
  }

  function writeFile(root, relPath, content) {
    const fullPath = path.join(root, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  it('passes quick mode for high quality tests', () => {
    const projectPath = createProject();
    writeFile(projectPath, 'src/math.js', 'exports.add = (a, b) => a + b;\n');
    writeFile(projectPath, 'src/__tests__/math.test.js', `
      const { add } = require('../math');
      test('adds numbers', () => {
        expect(add(1, 2)).toBe(3);
        expect(add(2, 2)).toEqual(4);
      });
    `);

    const result = runCli(['mutation', '--mode', 'quick', '--threshold', '80'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Mutation Gate');
    expect(result.stdout).toContain('Status:');
    expect(result.stdout).toContain('PASS');
  });

  it('fails quick mode when placeholder tests dominate', () => {
    const projectPath = createProject();
    writeFile(projectPath, 'src/service.js', 'exports.run = () => true;\n');
    writeFile(projectPath, 'src/__tests__/service.test.js', `
      test('placeholder', () => { expect(true).toBe(true); });
      test('empty', () => {});
    `);

    const result = runCli(['mutation', '--mode', 'quick', '--threshold', '80'], projectPath);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('FAIL');
  });

  it('limits quick scan to selected workspace', () => {
    const projectPath = createProject();
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
    writeFile(projectPath, 'packages/api/package.json', JSON.stringify({ name: '@demo/api' }));
    writeFile(projectPath, 'packages/api/src/api.js', 'exports.ok = () => true;\n');
    writeFile(projectPath, 'packages/api/src/__tests__/api.test.js', `
      test('api', () => { expect(1 + 1).toBe(2); expect('api').toContain('api'); });
    `);
    writeFile(projectPath, 'packages/web/package.json', JSON.stringify({ name: '@demo/web' }));
    writeFile(projectPath, 'packages/web/src/web.js', 'exports.ok = () => true;\n');
    writeFile(projectPath, 'packages/web/src/__tests__/web.test.js', `
      test('web placeholder', () => { expect(true).toBe(true); });
    `);

    const result = runCli(['mutation', '--workspace', 'packages/api', '--threshold', '80', '--json'], projectPath);
    const data = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(data.status).toBe('pass');
    expect(data.workspace).toEqual(expect.objectContaining({ name: '@demo/api', path: 'packages/api' }));
    expect(data.results.testFiles).toBe(1);
    expect(data.placeholders).toBe(0);
  });

  it('generates change-scoped evidence file', () => {
    const projectPath = createProject();
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'demo'), { recursive: true });
    writeFile(projectPath, 'src/math.js', 'exports.add = (a, b) => a + b;\n');
    writeFile(projectPath, 'src/__tests__/math.test.js', `test('adds', () => { expect(1 + 2).toBe(3); });\n`);

    const result = runCli(['mutation', 'demo', '--threshold', '80'], projectPath);

    expect(result.status).toBe(0);
    const evidenceDir = path.join(projectPath, 'stdd', 'changes', 'demo', 'evidence');
    const evidenceFile = fs.readdirSync(evidenceDir).find(file => file.startsWith('mutation-'));
    expect(evidenceFile).toBeTruthy();
    const evidence = JSON.parse(fs.readFileSync(path.join(evidenceDir, evidenceFile), 'utf8'));
    expect(evidence).toEqual(expect.objectContaining({
      type: 'mutation',
      changeName: 'demo',
      mode: 'quick',
      threshold: 80,
      status: 'pass',
    }));
  });

  it('prints pure json with --json', () => {
    const projectPath = createProject();
    writeFile(projectPath, 'src/math.js', 'exports.add = (a, b) => a + b;\n');
    writeFile(projectPath, 'src/__tests__/math.test.js', `test('adds', () => { expect(1 + 2).toBe(3); });\n`);

    const result = runCli(['mutation', '--json'], projectPath);
    const data = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(data).toEqual(expect.objectContaining({
      type: 'mutation',
      schemaVersion: 1,
      tool: 'quick',
      mode: 'quick',
      // Quick is a heuristic health check, not real mutation testing —
      // scoreKind is the durable marker of that distinction (P1-1).
      scoreKind: 'heuristic',
      killed: null,
      survived: null,
      threshold: 80,
      assertions: expect.any(Number),
      placeholders: expect.any(Number),
      status: 'pass',
    }));
  });

  it('labels the quick score as Heuristic Score in text output (P1-1)', () => {
    const projectPath = createProject();
    writeFile(projectPath, 'src/math.js', 'exports.add = (a, b) => a + b;\n');
    writeFile(projectPath, 'src/__tests__/math.test.js', `test('adds', () => { expect(1 + 2).toBe(3); });\n`);

    const result = runCli(['mutation'], projectPath);

    expect(result.stdout).toContain('Heuristic Score:');
    expect(result.stdout).not.toMatch(/^ {2}Score:/m);
  });

  it('rejects path traversal change names without writing evidence outside changes', () => {
    const projectPath = createProject();
    writeFile(projectPath, 'src/math.js', 'exports.add = (a, b) => a + b;\n');
    writeFile(projectPath, 'src/__tests__/math.test.js', `test('adds', () => { expect(1 + 2).toBe(3); });\n`);

    const result = runCli(['mutation', '../evil'], projectPath);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid change name');
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'evil'))).toBe(false);
  });
});
