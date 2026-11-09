const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return { ...actual, spawnSync: jest.fn(actual.spawnSync) };
});

const { MutationCommand, findLatestMutationEvidence } = require('../src/cli/commands/mutation');

describe('MutationCommand unit tests', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-mutation-unit-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function setupProject(files = {}) {
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(tmpDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
  }

  describe('_countAssertions', () => {
    const cmd = new MutationCommand();

    test('counts expect() calls', () => {
      expect(cmd._countAssertions('expect(x).toBe(y);')).toBeGreaterThanOrEqual(2);
    });

    test('counts assert() calls', () => {
      expect(cmd._countAssertions('assert(true); assert.strictEqual(1, 1);')).toBeGreaterThanOrEqual(2);
    });

    test('counts should syntax', () => {
      expect(cmd._countAssertions('result.should.be.true;')).toBeGreaterThanOrEqual(1);
    });

    test('counts Python asserts', () => {
      expect(cmd._countAssertions('self.assertEqual(a, b)\n')).toBeGreaterThanOrEqual(1);
    });

    test('returns 0 for empty content', () => {
      expect(cmd._countAssertions('')).toBe(0);
    });
  });

  describe('_countPlaceholders', () => {
    const cmd = new MutationCommand();

    test('counts expect(true).toBe(true)', () => {
      expect(cmd._countPlaceholders('expect(true).toBe(true);')).toBeGreaterThanOrEqual(1);
    });

    test('counts TODO: assert', () => {
      expect(cmd._countPlaceholders('TODO: assert something')).toBeGreaterThanOrEqual(1);
    });

    test('returns 0 for real assertions', () => {
      expect(cmd._countPlaceholders('expect(result).toBe(42);')).toBe(0);
    });
  });

  describe('_countEmptyTests', () => {
    const cmd = new MutationCommand();

    test('counts empty jest tests', () => {
      const code = "it('empty', () => {});";
      expect(cmd._countEmptyTests(code)).toBeGreaterThanOrEqual(1);
    });

    test('counts Python pass tests', () => {
      const code = 'def test_something(self):\n    pass';
      expect(cmd._countEmptyTests(code)).toBeGreaterThanOrEqual(1);
    });

    test('returns 0 for tests with body', () => {
      const code = "it('real', () => { expect(1).toBe(1); });";
      expect(cmd._countEmptyTests(code)).toBe(0);
    });
  });

  describe('_hasNearbyTest', () => {
    const cmd = new MutationCommand();

    test('matches co-located test file', () => {
      const result = cmd._hasNearbyTest(
        '/project/src/math.js',
        '/project',
        ['/project/src/math.test.js']
      );
      expect(result).toBe(true);
    });

    test('matches test in __tests__ subdirectory', () => {
      const result = cmd._hasNearbyTest(
        '/project/src/math.js',
        '/project',
        ['/project/src/__tests__/math.test.js']
      );
      expect(result).toBe(true);
    });

    test('returns false when no matching test exists', () => {
      const result = cmd._hasNearbyTest(
        '/project/src/math.js',
        '/project',
        ['/project/src/utils.test.js']
      );
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    test('throws for unsupported mode', () => {
      const cmd = new MutationCommand(tmpDir);
      expect(() => cmd.execute(null, { mode: 'invalid' })).toThrow('Unsupported mutation mode');
    });

    test('runs quick mode and returns evidence', () => {
      setupProject({
        'src/handler.js': 'module.exports = { run: () => true };\n',
        'src/__tests__/handler.test.js': "test('works', () => { expect(1).toBe(1); });\n",
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd.execute(null, { mode: 'quick', threshold: 0, json: true });

      expect(result).toHaveProperty('type', 'mutation');
      expect(result).toHaveProperty('mode', 'quick');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('evidencePath');
    });

    test('fails when placeholders dominate', () => {
      setupProject({
        'src/service.js': 'module.exports = {};\n',
        'src/__tests__/service.test.js': "test('placeholder', () => { expect(true).toBe(true); });\n",
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd.execute(null, { mode: 'quick', threshold: 80, json: true });

      expect(result.status).toBe('fail');
      expect(result.placeholders).toBeGreaterThan(0);
    });

    test('saves evidence file', () => {
      setupProject({
        'src/math.js': 'module.exports = {};\n',
        'src/__tests__/math.test.js': "test('adds', () => { expect(1 + 2).toBe(3); });\n",
      });

      const cmd = new MutationCommand(tmpDir);
      cmd.execute(null, { mode: 'quick', threshold: 0 });

      const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
      expect(fs.existsSync(evidenceDir)).toBe(true);
      const files = fs.readdirSync(evidenceDir).filter(f => f.startsWith('mutation-'));
      expect(files.length).toBeGreaterThan(0);

      const evidence = JSON.parse(fs.readFileSync(path.join(evidenceDir, files[0]), 'utf8'));
      expect(evidence.type).toBe('mutation');
    });

    test('sets process.exitCode on failure', () => {
      setupProject({
        'src/code.js': 'module.exports = {};\n',
        'src/__tests__/code.test.js': "test('p', () => { expect(true).toBe(true); });\n",
      });

      const cmd = new MutationCommand(tmpDir);
      const originalExitCode = process.exitCode;
      cmd.execute(null, { mode: 'quick', threshold: 99, json: true });
      expect(process.exitCode).toBe(1);
      process.exitCode = originalExitCode;
    });
  });

  describe('_resolveWorkspace', () => {
    test('returns null for no selector', () => {
      const cmd = new MutationCommand(tmpDir);
      expect(cmd._resolveWorkspace(null)).toBeNull();
    });

    test('throws for non-existent workspace', () => {
      const cmd = new MutationCommand(tmpDir);
      expect(() => cmd._resolveWorkspace('nonexistent')).toThrow('not found');
    });
  });

  describe('_hasStryker', () => {
    test('returns false when no stryker installed', () => {
      const cmd = new MutationCommand(tmpDir);
      expect(cmd._hasStryker(tmpDir)).toBe(false);
    });

    test('returns true when stryker in dependencies', () => {
      setupProject({
        'package.json': JSON.stringify({ devDependencies: { '@stryker-mutator/core': '^6.0.0' } }),
      });
      const cmd = new MutationCommand(tmpDir);
      expect(cmd._hasStryker(tmpDir)).toBe(true);
    });

    test('returns true when stryker.conf.js exists', () => {
      setupProject({ 'stryker.conf.js': 'module.exports = {};' });
      const cmd = new MutationCommand(tmpDir);
      expect(cmd._hasStryker(tmpDir)).toBe(true);
    });
  });

  describe('_extractMutationScore', () => {
    const cmd = new MutationCommand();

    test('extracts mutationScore', () => {
      expect(cmd._extractMutationScore({ mutationScore: 85.5 })).toBe(85.5);
    });

    test('extracts score', () => {
      expect(cmd._extractMutationScore({ score: 90 })).toBe(90);
    });

    test('returns null for empty object', () => {
      expect(cmd._extractMutationScore({})).toBeNull();
    });

    test('returns null for null', () => {
      expect(cmd._extractMutationScore(null)).toBeNull();
    });

    test('recursively searches nested objects', () => {
      expect(cmd._extractMutationScore({ child: { mutationScore: 72 } })).toBe(72);
    });
  });

  describe('_parseStrykerScore', () => {
    const cmd = new MutationCommand();

    test('parses score from output string', () => {
      const output = 'Mutation score: 78.5%';
      expect(cmd._parseStrykerScore(tmpDir, output)).toBe(78.5);
    });

    test('returns null when no score found', () => {
      expect(cmd._parseStrykerScore(tmpDir, 'no score here')).toBeNull();
    });

    test('reads score from mutation report file', () => {
      const reportsDir = path.join(tmpDir, 'reports', 'mutation');
      fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(path.join(reportsDir, 'mutation.json'), JSON.stringify({
        mutationScore: 88.2,
      }));

      expect(cmd._parseStrykerScore(tmpDir, '')).toBe(88.2);
    });
  });

  describe('_runStryker', () => {
    test('returns skipped when stryker is not installed', () => {
      const cmd = new MutationCommand(tmpDir);
      const result = cmd._runStryker(80, null);
      expect(result.status).toBe('skipped');
      expect(result.score).toBeNull();
      expect(result.reason).toContain('not installed');
    });

    test('runs stryker when installed and parses score from output', () => {
      setupProject({
        'package.json': JSON.stringify({ devDependencies: { '@stryker-mutator/core': '^6.0.0' } }),
      });

      const { spawnSync } = require('child_process');
      spawnSync.mockReturnValue({
        status: 0,
        stdout: 'Mutation score: 75.5%',
        stderr: '',
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd._runStryker(80, null);
      expect(result.score).toBe(75.5);
      expect(result.status).toBe('fail');
      expect(result).toHaveProperty('exitCode', 0);
    });

    test('handles stryker exit code when no score parsed', () => {
      setupProject({
        'package.json': JSON.stringify({ devDependencies: { '@stryker-mutator/core': '^6.0.0' } }),
      });

      const { spawnSync } = require('child_process');
      spawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'some error',
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd._runStryker(80, null);
      expect(result.score).toBeNull();
      expect(result.status).toBe('fail');
    });

    test('passes when stryker score exceeds threshold', () => {
      setupProject({
        'package.json': JSON.stringify({ devDependencies: { '@stryker-mutator/core': '^6.0.0' } }),
      });

      const { spawnSync } = require('child_process');
      spawnSync.mockReturnValue({
        status: 0,
        stdout: 'Mutation score: 85.0%',
        stderr: '',
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd._runStryker(80, null);
      expect(result.score).toBe(85);
      expect(result.status).toBe('pass');
    });

    test('handles null stdout and stderr gracefully', () => {
      setupProject({
        'package.json': JSON.stringify({ devDependencies: { '@stryker-mutator/core': '^6.0.0' } }),
      });

      const { spawnSync } = require('child_process');
      spawnSync.mockReturnValue({
        status: 0,
        stdout: null,
        stderr: null,
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd._runStryker(80, null);
      expect(result.status).toBe('pass');
    });
  });

  describe('_printResult', () => {
    test('prints n/a for null score', () => {
      const cmd = new MutationCommand(tmpDir);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        cmd._printResult({
          score: null,
          status: 'skipped',
          mode: 'stryker',
          threshold: 80,
          assertions: 0,
          placeholders: 0,
          workspace: null,
          evidencePath: 'stdd/evidence/mutation.json',
          results: { reason: null },
        });
        expect(logSpy.mock.calls.some(call => String(call[0]).includes('n/a'))).toBe(true);
      } finally {
        logSpy.mockRestore();
      }
    });

    test('prints workspace info when present', () => {
      const cmd = new MutationCommand(tmpDir);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        cmd._printResult({
          score: 85,
          status: 'pass',
          mode: 'quick',
          threshold: 80,
          assertions: 10,
          placeholders: 0,
          workspace: { path: 'packages/api' },
          evidencePath: 'stdd/evidence/mutation.json',
          results: { reason: null },
        });
        expect(logSpy.mock.calls.some(call => String(call[0]).includes('packages/api'))).toBe(true);
      } finally {
        logSpy.mockRestore();
      }
    });

    test('prints reason when present in results', () => {
      const cmd = new MutationCommand(tmpDir);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        cmd._printResult({
          score: null,
          status: 'skipped',
          mode: 'stryker',
          threshold: 80,
          assertions: 0,
          placeholders: 0,
          workspace: null,
          evidencePath: 'stdd/evidence/mutation.json',
          results: { reason: 'Stryker not installed' },
        });
        expect(logSpy.mock.calls.some(call => String(call[0]).includes('Stryker not installed'))).toBe(true);
      } finally {
        logSpy.mockRestore();
      }
    });

    test('prints FAIL for fail status', () => {
      const cmd = new MutationCommand(tmpDir);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        cmd._printResult({
          score: 50,
          status: 'fail',
          mode: 'quick',
          threshold: 80,
          assertions: 5,
          placeholders: 3,
          workspace: null,
          evidencePath: 'stdd/evidence/mutation.json',
          results: { reason: null },
        });
        expect(logSpy.mock.calls.some(call => String(call[0]).includes('FAIL'))).toBe(true);
      } finally {
        logSpy.mockRestore();
      }
    });

    test('prints SKIPPED for skipped status', () => {
      const cmd = new MutationCommand(tmpDir);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        cmd._printResult({
          score: null,
          status: 'skipped',
          mode: 'stryker',
          threshold: 80,
          assertions: 0,
          placeholders: 0,
          workspace: null,
          evidencePath: 'stdd/evidence/mutation.json',
          results: { reason: 'Stryker not installed' },
        });
        expect(logSpy.mock.calls.some(call => String(call[0]).includes('SKIPPED'))).toBe(true);
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('execute stryker mode', () => {
    test('runs stryker mode end-to-end when installed', () => {
      setupProject({
        'package.json': JSON.stringify({ devDependencies: { '@stryker-mutator/core': '^6.0.0' } }),
      });

      const mockSpawnSync = jest.spyOn(require('child_process'), 'spawnSync').mockReturnValue({
        status: 0,
        stdout: 'Mutation score: 90%',
        stderr: '',
      });

      try {
        const cmd = new MutationCommand(tmpDir);
        const result = cmd.execute(null, { mode: 'stryker', threshold: 80, json: true });
        expect(result).toHaveProperty('mode', 'stryker');
        expect(result).toHaveProperty('tool', 'stryker');
      } finally {
        mockSpawnSync.mockRestore();
      }
    });
  });

  describe('_scanRoot', () => {
    test('returns cwd when no workspace', () => {
      const cmd = new MutationCommand(tmpDir);
      expect(cmd._scanRoot(null)).toBe(tmpDir);
    });

    test('returns workspace root when workspace provided', () => {
      const cmd = new MutationCommand(tmpDir);
      expect(cmd._scanRoot({ root: '/some/root' })).toBe('/some/root');
    });
  });

  describe('_hasNearbyTest advanced', () => {
    const cmd = new MutationCommand();

    test('matches spec files', () => {
      const result = cmd._hasNearbyTest(
        '/project/src/math.js',
        '/project',
        ['/project/src/math.spec.js']
      );
      expect(result).toBe(true);
    });

    test('matches test_ prefixed Python files', () => {
      const result = cmd._hasNearbyTest(
        '/project/src/calculator.py',
        '/project',
        ['/project/src/test_calculator.py']
      );
      expect(result).toBe(true);
    });

    test('matches _test suffixed Python files', () => {
      const result = cmd._hasNearbyTest(
        '/project/src/calculator.py',
        '/project',
        ['/project/src/calculator_test.py']
      );
      expect(result).toBe(true);
    });
  });

  describe('_runQuick source scan', () => {
    test('excludes stdd-installed agent hooks from source files (default .claude)', () => {
      setupProject({
        'src/code.js': 'module.exports = {};\n',
        // Note: expect(1).toBe(1) is itself a placeholder pattern; use a real
        // assertion so the score reflects coverage, not placeholder penalty.
        'src/__tests__/code.test.js': "test('works', () => { expect(require('../code')).toEqual({}); });\n",
        '.claude/hooks/pre-file-write.js': '// stdd init hook\n',
        '.claude/hooks/post-file-write.js': '// stdd init hook\n',
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd._runQuick(80, null);

      // Before the fix the two hook scripts counted as uncovered source
      // files: sourceFiles=3, covered=1, ratio 0.333, score 77 -> FAIL.
      expect(result.sourceFiles).toBe(1);
      expect(result.coveredSourceFiles).toBe(1);
      expect(result.testCoverageRatio).toBe(1);
      expect(result.status).toBe('pass');
    });

    test('excludes every agent directory declared in engines.json', () => {
      setupProject({
        'src/code.js': 'module.exports = {};\n',
        'src/__tests__/code.test.js': "test('works', () => { expect(require('../code')).toEqual({}); });\n",
        '.opencode/hooks/pre-file-write.js': '// hook\n',
        '.codex/hooks/pre-file-write.js': '// hook\n',
        '.qwen/hooks/pre-file-write.js': '// hook\n',
        '.kiro/hooks/pre-file-write.js': '// hook\n',
        '.codebuddy/hooks/pre-file-write.js': '// hook\n',
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd._runQuick(80, null);

      expect(result.sourceFiles).toBe(1);
      expect(result.status).toBe('pass');
    });
  });

  describe('_saveEvidence with changeName', () => {
    test('saves evidence in change-specific directory', () => {
      setupProject({
        'src/code.js': 'module.exports = {};\n',
        'src/__tests__/code.test.js': "test('works', () => { expect(1).toBe(1); });\n",
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd.execute('mychange', { mode: 'quick', threshold: 0, json: true });
      expect(result.evidencePath).toContain('mychange');
      expect(result.evidencePath).toContain('evidence');
    });
  });

  describe('execute with default mode', () => {
    test('defaults to quick mode when mode not specified', () => {
      setupProject({
        'src/code.js': 'module.exports = {};\n',
        'src/__tests__/code.test.js': "test('works', () => { expect(1).toBe(1); });\n",
      });

      const cmd = new MutationCommand(tmpDir);
      const result = cmd.execute(null, { threshold: 0, json: true });
      expect(result.mode).toBe('quick');
    });
  });
});

describe('findLatestMutationEvidence', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-mutation-evidence-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns null when no evidence files exist', () => {
    fs.mkdirSync(path.join(tmpDir, 'stdd', 'evidence'), { recursive: true });
    expect(findLatestMutationEvidence(tmpDir)).toBeNull();
  });

  test('finds evidence in stdd/evidence directory', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = { mutationScore: 85, timestamp: Date.now() };
    fs.writeFileSync(path.join(evidenceDir, 'mutation-123.json'), JSON.stringify(evidence));

    const result = findLatestMutationEvidence(tmpDir);
    expect(result).not.toBeNull();
    expect(result.data.mutationScore).toBe(85);
  });

  test('returns most recent evidence when multiple exist', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'mutation-old.json'), JSON.stringify({ mutationScore: 50, unixTimestamp: 1000 }));
    fs.writeFileSync(path.join(evidenceDir, 'mutation-new.json'), JSON.stringify({ mutationScore: 90, unixTimestamp: 2000 }));

    const result = findLatestMutationEvidence(tmpDir);
    expect(result.data.mutationScore).toBe(90);
  });

  test('finds evidence in change directory', () => {
    const changeEvidenceDir = path.join(tmpDir, 'stdd', 'changes', 'demo', 'evidence');
    fs.mkdirSync(changeEvidenceDir, { recursive: true });
    fs.writeFileSync(path.join(changeEvidenceDir, 'mutation-1.json'), JSON.stringify({ mutationScore: 75, timestamp: Date.now() }));

    const result = findLatestMutationEvidence(tmpDir, { changeName: 'demo' });
    expect(result).not.toBeNull();
    expect(result.data.mutationScore).toBe(75);
  });

  test('skips malformed JSON files', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'mutation-bad.json'), 'not json');

    expect(findLatestMutationEvidence(tmpDir)).toBeNull();
  });

  test('filters by workspace when provided', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'mutation-1.json'), JSON.stringify({
      mutationScore: 85,
      timestamp: Date.now(),
      metadata: { workspace: 'packages/api' },
    }));

    expect(findLatestMutationEvidence(tmpDir, { workspace: 'packages/api' })).not.toBeNull();
    expect(findLatestMutationEvidence(tmpDir, { workspace: 'packages/other' })).toBeNull();
  });

  test('filters by workspace object with path property', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'mutation-1.json'), JSON.stringify({
      mutationScore: 85,
      timestamp: Date.now(),
      metadata: { workspace: 'packages/api' },
    }));

    expect(findLatestMutationEvidence(tmpDir, { workspace: { path: 'packages/api' } })).not.toBeNull();
    expect(findLatestMutationEvidence(tmpDir, { workspace: { name: 'packages/other' } })).toBeNull();
  });

  test('filters by workspace object with name property', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'mutation-1.json'), JSON.stringify({
      mutationScore: 85,
      timestamp: Date.now(),
      metadata: { workspace: 'packages/api' },
    }));

    expect(findLatestMutationEvidence(tmpDir, { workspace: { name: 'packages/api' } })).not.toBeNull();
  });

  test('filters by workspace object with root property', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'mutation-1.json'), JSON.stringify({
      mutationScore: 85,
      timestamp: Date.now(),
      metadata: { workspace: 'packages/api' },
    }));

    expect(findLatestMutationEvidence(tmpDir, { workspace: { root: 'packages/api' } })).not.toBeNull();
  });

  test('finds evidence using change alias', () => {
    const changeEvidenceDir = path.join(tmpDir, 'stdd', 'changes', 'mychange', 'evidence');
    fs.mkdirSync(changeEvidenceDir, { recursive: true });
    fs.writeFileSync(path.join(changeEvidenceDir, 'mutation-1.json'), JSON.stringify({ mutationScore: 80, timestamp: Date.now() }));

    const result = findLatestMutationEvidence(tmpDir, { change: 'mychange' });
    expect(result).not.toBeNull();
    expect(result.data.mutationScore).toBe(80);
  });

  test('skips non-mutation and non-json files', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'guard-123.json'), JSON.stringify({ score: 50 }));
    fs.writeFileSync(path.join(evidenceDir, 'mutation-456.txt'), 'not json');

    expect(findLatestMutationEvidence(tmpDir)).toBeNull();
  });

  test('deduplicates evidence across directories', () => {
    const dir1 = path.join(tmpDir, 'stdd', 'evidence');
    const dir2 = path.join(tmpDir, 'stdd', 'changes', 'ch1', 'evidence');
    fs.mkdirSync(dir1, { recursive: true });
    fs.mkdirSync(dir2, { recursive: true });

    // Same filename but in different dirs — second should override by timestamp
    fs.writeFileSync(path.join(dir1, 'mutation-shared.json'), JSON.stringify({ mutationScore: 50, unixTimestamp: 1000 }));
    fs.writeFileSync(path.join(dir2, 'mutation-shared.json'), JSON.stringify({ mutationScore: 90, unixTimestamp: 2000 }));

    const result = findLatestMutationEvidence(tmpDir);
    expect(result).not.toBeNull();
    expect(result.data.mutationScore).toBe(90);
  });
});

describe('normalizeMutationResult', () => {
  const { normalizeMutationResult } = require('../src/runtime/mutation/normalizer');

  test('uses score directly when not null', () => {
    const result = normalizeMutationResult({ score: 95 });
    expect(result.score).toBe(95);
    expect(result.status).toBe('pass');
  });

  test('falls back to mutationScore when score is null', () => {
    const result = normalizeMutationResult({ score: null, mutationScore: 70 });
    expect(result.score).toBe(70);
  });

  test('returns null score when both score and mutationScore are absent', () => {
    const result = normalizeMutationResult({ score: null });
    expect(result.score).toBeNull();
  });

  test('derives status from threshold comparison', () => {
    const pass = normalizeMutationResult({ score: 85 }, { threshold: 80 });
    const fail = normalizeMutationResult({ score: 75 }, { threshold: 80 });
    expect(pass.status).toBe('pass');
    expect(fail.status).toBe('fail');
  });

  test('uses input.status when provided', () => {
    const result = normalizeMutationResult({ score: 50, status: 'skip' });
    expect(result.status).toBe('skip');
  });

  test('resolves tool from context.tool precedence chain', () => {
    expect(normalizeMutationResult({}, { tool: 'stryker' }).tool).toBe('stryker');
    expect(normalizeMutationResult({ tool: 'input-tool' }, {}).tool).toBe('input-tool');
    expect(normalizeMutationResult({}, { mode: 'custom' }).tool).toBe('custom');
    expect(normalizeMutationResult({ mode: 'input-mode' }, {}).tool).toBe('input-mode');
    expect(normalizeMutationResult({}, {}).tool).toBe('quick');
  });

  test('uses context.threshold over input.threshold, defaults to 80', () => {
    expect(normalizeMutationResult({}, { threshold: 90 }).threshold).toBe(90);
    expect(normalizeMutationResult({ threshold: 60 }).threshold).toBe(60);
    expect(normalizeMutationResult({}, {}).threshold).toBe(80);
  });

  test('numberOrNull returns null for non-finite values', () => {
    const result = normalizeMutationResult({ killed: Infinity, survived: NaN });
    expect(result.killed).toBeNull();
    expect(result.survived).toBeNull();
  });

  test('numberOrNull returns number for finite values', () => {
    const result = normalizeMutationResult({ killed: 10, survived: '5' });
    expect(result.killed).toBe(10);
    expect(result.survived).toBe(5);
  });

  test('propagates context workspace and changeName', () => {
    const result = normalizeMutationResult({}, { workspace: 'packages/api', changeName: 'feat-x' });
    expect(result.workspace).toBe('packages/api');
    expect(result.changeName).toBe('feat-x');
    expect(result.metadata.workspace).toBe('packages/api');
    expect(result.metadata.changeName).toBe('feat-x');
  });

  test('uses context.unixTimestamp when provided', () => {
    const result = normalizeMutationResult({}, { unixTimestamp: 1700000000000 });
    expect(result.unixTimestamp).toBe(1700000000000);
  });
});
