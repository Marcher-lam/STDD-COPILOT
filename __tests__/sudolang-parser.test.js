const fs = require('fs');
const path = require('path');
const os = require('os');
const { SudoLangParser } = require('../src/runtime/sudolang-parser');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-sudo-'));
}

function writeInput(dir, content) {
  const filePath = path.join(dir, 'input.sudo');
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

describe('SudoLangParser', () => {
  let parser;
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmp();
    parser = new SudoLangParser(tmpDir);
  });

  describe('parse', () => {
    it('throws when cwd-local file does not exist', () => {
      expect(() => parser.parse('missing.sudo')).toThrow('File not found');
    });

    it('rejects absolute paths outside cwd', () => {
      const outside = path.join(os.tmpdir(), 'outside.sudo');
      fs.writeFileSync(outside, 'goal: outside\n  nope', 'utf8');
      try {
        expect(() => parser.parse(outside)).toThrow('Unsafe SudoLang source path');
      } finally {
        fs.rmSync(outside, { force: true });
      }
    });

    it('rejects traversal paths outside cwd', () => {
      expect(() => parser.parse('../outside.sudo')).toThrow('Unsafe SudoLang source path');
    });

    it('parses a single interface', () => {
      const filePath = writeInput(tmpDir, [
        'interface User',
        '  name: string',
        '  email: string',
      ].join('\n'));

      const result = parser.parse(filePath);

      expect(result.interfaces).toHaveLength(1);
      expect(result.interfaces[0].name).toBe('User');
      expect(result.interfaces[0].properties).toContain('name: string');
    });

    it('parses multiple interfaces', () => {
      const filePath = writeInput(tmpDir, [
        'interface User',
        '  name: string',
        'interface Product',
        '  title: string',
      ].join('\n'));

      const result = parser.parse(filePath);

      expect(result.interfaces).toHaveLength(2);
      expect(result.interfaces[0].name).toBe('User');
      expect(result.interfaces[1].name).toBe('Product');
    });

    it('parses constraints', () => {
      const filePath = writeInput(tmpDir, [
        'constraint: max 100 items per page',
        '  enforce with pagination middleware',
      ].join('\n'));

      const result = parser.parse(filePath);

      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].description).toBe('max 100 items per page');
      expect(result.constraints[0].body).toContain('pagination');
    });

    it('parses commands', () => {
      const filePath = writeInput(tmpDir, [
        'command: deploy',
        '  run npm run build && npm run deploy',
      ].join('\n'));

      const result = parser.parse(filePath);

      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].name).toBe('deploy');
      expect(result.commands[0].action).toContain('npm run build');
    });

    it('parses goals', () => {
      const filePath = writeInput(tmpDir, [
        'goal: user authentication',
        '  implement JWT-based auth',
      ].join('\n'));

      const result = parser.parse(filePath);

      expect(result.goals).toHaveLength(1);
      expect(result.goals[0].description).toBe('user authentication');
      expect(result.goals[0].details).toContain('JWT');
    });

    it('skips blank lines and comments', () => {
      const filePath = writeInput(tmpDir, [
        '// This is a comment',
        '# This is also a comment',
        '',
        'goal: something',
        '  detail line',
      ].join('\n'));

      const result = parser.parse(filePath);

      expect(result.goals).toHaveLength(1);
      expect(result.raw).not.toContain('// This is a comment');
      expect(result.raw).not.toContain('# This is also a comment');
    });

    it('handles mixed block types', () => {
      const filePath = writeInput(tmpDir, [
        'interface User',
        '  name: string',
        'constraint: no PII in logs',
        '  sanitize all fields',
        'command: cleanup',
        '  rm -rf /tmp/stdd',
        'goal: zero downtime',
        '  use blue-green deployment',
      ].join('\n'));

      const result = parser.parse(filePath);

      expect(result.interfaces).toHaveLength(1);
      expect(result.constraints).toHaveLength(1);
      expect(result.commands).toHaveLength(1);
      expect(result.goals).toHaveLength(1);
    });

    it('includes raw lines in output', () => {
      const filePath = writeInput(tmpDir, [
        'goal: test raw',
        '  detail',
      ].join('\n'));

      const result = parser.parse(filePath);

      expect(result.raw).toContain('goal: test raw');
      expect(result.raw).toContain('detail');
    });
  });

  describe('normalize', () => {
    it('adds extractedAt ISO timestamp', () => {
      const filePath = writeInput(tmpDir, 'goal: x\n  y\n');
      const result = parser.parse(filePath);

      expect(result.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('computes complexityScore as total blocks', () => {
      const filePath = writeInput(tmpDir, [
        'interface A', '  x: int',
        'constraint: B', '  body',
        'command: C', '  action',
        'goal: D', '  detail',
      ].join('\n'));

      const result = parser.parse(filePath);

      expect(result.complexityScore).toBe(4);
    });

    it('returns 0 complexity for empty input', () => {
      const filePath = writeInput(tmpDir, '// just a comment\n');
      const result = parser.parse(filePath);

      expect(result.complexityScore).toBe(0);
      expect(result.interfaces).toHaveLength(0);
    });
  });

  describe('generateArtifacts', () => {
    it('generates spec from goals', () => {
      const parsedData = {
        interfaces: [],
        constraints: [],
        commands: [],
        goals: [{ description: 'auth', details: 'JWT tokens' }],
      };

      const artifacts = parser.generateArtifacts(parsedData);

      expect(artifacts.spec).toBeDefined();
      expect(fs.existsSync(artifacts.spec)).toBe(true);
      const content = fs.readFileSync(artifacts.spec, 'utf8');
      expect(content).toContain('auth');
    });

    it('generates design from constraints', () => {
      const parsedData = {
        interfaces: [],
        constraints: [{ description: 'rate limit', body: '100 req/s' }],
        commands: [],
        goals: [],
      };

      const artifacts = parser.generateArtifacts(parsedData);

      expect(artifacts.design).toBeDefined();
      expect(fs.existsSync(artifacts.design)).toBe(true);
      const content = fs.readFileSync(artifacts.design, 'utf8');
      expect(content).toContain('rate limit');
    });

    it('generates apispec from interfaces', () => {
      const parsedData = {
        interfaces: [{ name: 'User', properties: 'email: string' }],
        constraints: [],
        commands: [],
        goals: [],
      };

      const artifacts = parser.generateArtifacts(parsedData);

      expect(artifacts.apispec).toBeDefined();
      expect(fs.existsSync(artifacts.apispec)).toBe(true);
      const content = JSON.parse(fs.readFileSync(artifacts.apispec, 'utf8'));
      expect(content[0].name).toBe('User');
    });

    it('returns empty artifacts when no parsed data provided', () => {
      const parsedData = {
        interfaces: [],
        constraints: [],
        commands: [],
        goals: [],
      };

      const artifacts = parser.generateArtifacts(parsedData);

      expect(artifacts.spec).toBeUndefined();
      expect(artifacts.design).toBeUndefined();
      expect(artifacts.apispec).toBeUndefined();
    });

    it('creates output directory if it does not exist', () => {
      const newCwd = path.join(tmpDir, 'sub', 'dir');
      const p = new SudoLangParser(newCwd);
      const parsedData = {
        interfaces: [],
        constraints: [],
        commands: [],
        goals: [{ description: 'test', details: 'detail' }],
      };

      const artifacts = p.generateArtifacts(parsedData);
      expect(artifacts.spec).toBeDefined();
      expect(fs.existsSync(path.join(newCwd, 'stdd', 'runtime', 'generated'))).toBe(true);
    });
  });
});
