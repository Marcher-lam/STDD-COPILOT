const fs = require('fs');
const os = require('os');
const path = require('path');
const { GraphHistoryCommand } = require('../src/cli/commands/graph-history');

describe('GraphHistoryCommand unit supplement', () => {
  let tmpDir;
  let stddDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-gh-unit-'));
    stddDir = path.join(tmpDir, 'stdd');
    fs.mkdirSync(stddDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeEvidence(fileName, data, subdir) {
    const dir = subdir
      ? path.join(stddDir, 'changes', subdir, 'evidence')
      : path.join(stddDir, 'evidence');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), JSON.stringify(data));
  }

  describe('_printTable', () => {
    test('prints table with entries', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      writeEvidence('verify-001.json', {
        id: 'verify-001',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.list({});
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Execution History');
      expect(output).toContain('verify-001'.slice(0, 16));
      spy.mockRestore();
    });

    test('shows truncation message for more than 50 entries', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      for (let i = 0; i < 55; i++) {
        writeEvidence(`verify-${String(i).padStart(3, '0')}.json`, {
          id: `verify-${String(i).padStart(3, '0')}`,
          type: 'verify',
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
          status: i % 2 === 0 ? 'pass' : 'fail',
        });
      }

      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.list({});
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('more entries');
      spy.mockRestore();
    });

    test('shows workspace count when present', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      writeEvidence('verify-001.json', {
        id: 'verify-001',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
        metadata: { workspaces: ['packages/api', 'packages/web'] },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.list({});
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Workspaces');
      spy.mockRestore();
    });
  });

  describe('list json mode', () => {
    test('outputs empty JSON array when no evidence', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.list({ json: true });
      expect(spy).toHaveBeenCalledWith('[]');
      spy.mockRestore();
    });

    test('outputs JSON with entries', () => {
      writeEvidence('verify-001.json', {
        id: 'verify-001',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
      });

      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.list({ json: true });
      const jsonOutput = spy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.length).toBeGreaterThan(0);
      spy.mockRestore();
    });
  });

  describe('replay', () => {
    test('replays entry in JSON mode', () => {
      writeEvidence('guard-001.json', {
        id: 'guard-001',
        type: 'guard',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
      });

      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.replay('guard-001', { json: true });
      const output = spy.mock.calls[0][0];
      expect(JSON.parse(output).id).toBe('guard-001');
      spy.mockRestore();
    });

    test('replays entry in verbose mode', () => {
      writeEvidence('verify-001.json', {
        id: 'verify-001',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
        results: {
          tasks: { done: 3, total: 3, allDone: true },
          tests: { passed: true },
          constitution: { status: 'pass', issues: { blocking: [], warning: [] } },
          lint: { passed: true },
        },
        metadata: { os: 'darwin', nodeVersion: 'v20.0.0' },
      });

      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.replay('verify-001', { verbose: true });
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('verify-001');
      expect(output).toContain('darwin');
      spy.mockRestore();
    });

    test('prints verify re-run hint for verify entries with change', () => {
      const changesDir = path.join(stddDir, 'changes', 'add-feature', 'evidence');
      fs.mkdirSync(changesDir, { recursive: true });
      fs.writeFileSync(path.join(changesDir, 'verify-001.json'), JSON.stringify({
        id: 'verify-001',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
      }));

      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.replay('verify-001');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('stdd verify');
      spy.mockRestore();
    });
  });

  describe('_printResults', () => {
    test('prints tasks with failures', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      writeEvidence('verify-001.json', {
        id: 'verify-001',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'fail',
        results: {
          tasks: { done: 2, total: 3, allDone: false },
          tests: { passed: false, error: 'line1\nline2\nline3\nline4' },
          constitution: { status: 'fail', issues: { blocking: [{ article: 2, message: 'Missing test' }], warning: [] } },
          lint: { passed: null },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.replay('verify-001');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('FAIL');
      expect(output).toContain('Article 2');
      expect(output).toContain('SKIP');
      spy.mockRestore();
    });

    test('prints skipped tests', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      writeEvidence('verify-001.json', {
        id: 'verify-001',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
        results: {
          tests: { passed: null },
          lint: { passed: false },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.replay('verify-001');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('SKIP');
      expect(output).toContain('warn');
      spy.mockRestore();
    });

    test('renders a skipped constitution as skipped, not fail (OCR finding)', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      writeEvidence('verify-001.json', {
        id: 'verify-001',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
        results: {
          tasks: { done: 1, total: 1, allDone: true },
          tests: { passed: true },
          constitution: { status: 'skipped', reason: '--no-constitution' },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.replay('verify-001');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Constitution: skipped');
      // A skip must not replay as a red failure
      expect(output).not.toContain('Constitution: fail');
      spy.mockRestore();
    });
  });

  describe('workspaceFromPath (via extractWorkspacesFromEvidence)', () => {
    test('extracts workspace from file path in evidence', () => {
      writeEvidence('guard-001.json', {
        id: 'guard-001',
        type: 'guard',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
        results: {
          constitution: {
            details: {
              blocking: [],
              warning: [{ message: 'packages/api/src/app.js has issue', file: 'packages/api/src/app.js' }],
            },
          },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence();
      // Should extract workspace from the file path
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('scanEvidence with change filter', () => {
    test('filters by change name', () => {
      const changeADir = path.join(stddDir, 'changes', 'change-a', 'evidence');
      const changeBDir = path.join(stddDir, 'changes', 'change-b', 'evidence');
      fs.mkdirSync(changeADir, { recursive: true });
      fs.mkdirSync(changeBDir, { recursive: true });
      fs.writeFileSync(path.join(changeADir, 'verify-001.json'), JSON.stringify({ id: 'v1', type: 'verify', status: 'pass', timestamp: '2026-01-01T00:00:00Z' }));
      fs.writeFileSync(path.join(changeBDir, 'verify-002.json'), JSON.stringify({ id: 'v2', type: 'verify', status: 'pass', timestamp: '2026-01-01T00:00:00Z' }));

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence({ change: 'change-a' });
      expect(entries.length).toBe(1);
      expect(entries[0].changeName).toBe('change-a');
    });
  });

  describe('_inferType', () => {
    test('infers type from filename', () => {
      const cmd = new GraphHistoryCommand(tmpDir);
      expect(cmd._inferType('verify-001.json')).toBe('verify');
      expect(cmd._inferType('guard-001.json')).toBe('guard');
      expect(cmd._inferType('error-001.json')).toBe('error');
      expect(cmd._inferType('unknown-001.json')).toBe('unknown');
    });
  });

  describe('_formatTime', () => {
    test('formats valid timestamp', () => {
      const cmd = new GraphHistoryCommand(tmpDir);
      const result = cmd._formatTime('2026-01-01T12:00:00Z');
      expect(result).toBeTruthy();
    });

    test('handles invalid timestamp gracefully', () => {
      const cmd = new GraphHistoryCommand(tmpDir);
      const result = cmd._formatTime('not-a-date');
      expect(result).toBeTruthy();
    });

    test('falls back to string slice when toLocaleString throws', () => {
      const cmd = new GraphHistoryCommand(tmpDir);
      const original = Date.prototype.toLocaleString;
      Date.prototype.toLocaleString = function () { throw new Error('boom'); };
      try {
        const result = cmd._formatTime('2026-01-01T12:34:56.789Z');
        expect(result).toBe('2026-01-01T12:34:56');
      } finally {
        Date.prototype.toLocaleString = original;
      }
    });
  });

  describe('extractWorkspacesFromEvidence via scanEvidence', () => {
    test('extracts workspace names from results.tests.workspaces array (lines 24-26)', () => {
      writeEvidence('verify-100.json', {
        id: 'ws-test-001',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
        results: {
          tests: {
            passed: true,
            workspaces: [
              { workspaceName: 'packages/api', passed: true },
              { workspace: 'packages/web', passed: true },
              { name: 'packages/shared', passed: true },
            ],
          },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence();
      expect(entries.length).toBe(1);
      expect(entries[0].workspaces).toContain('packages/api');
      expect(entries[0].workspaces).toContain('packages/web');
      expect(entries[0].workspaces).toContain('packages/shared');
    });

    test('skips workspaces entries with no resolvable name', () => {
      writeEvidence('verify-101.json', {
        id: 'ws-test-002',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
        results: {
          tests: {
            passed: true,
            workspaces: [
              { passed: true },
              { workspaceName: 'packages/api', passed: true },
            ],
          },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence();
      expect(entries.length).toBe(1);
      expect(entries[0].workspaces).toEqual(['packages/api']);
    });
  });

  describe('workspaceFromPath via constitution issue paths (lines 44, 53-58)', () => {
    test('extracts workspace from packages/ path in constitution issues', () => {
      writeEvidence('guard-100.json', {
        id: 'path-test-pkg',
        type: 'guard',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'fail',
        results: {
          constitution: {
            details: {
              blocking: [{ message: 'issue', file: 'packages/api/src/index.js' }],
              warning: [],
            },
          },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence();
      expect(entries.length).toBe(1);
      expect(entries[0].workspaces).toContain('packages/api');
    });

    test('extracts workspace from apps/ path in constitution issues', () => {
      writeEvidence('guard-101.json', {
        id: 'path-test-app',
        type: 'guard',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'fail',
        results: {
          constitution: {
            details: {
              blocking: [{ message: 'issue', file: 'apps/web/src/main.tsx' }],
              warning: [],
            },
          },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence();
      expect(entries.length).toBe(1);
      expect(entries[0].workspaces).toContain('apps/web');
    });

    test('returns null for non-workspace paths so they are excluded', () => {
      writeEvidence('guard-102.json', {
        id: 'path-test-no-ws',
        type: 'guard',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'fail',
        results: {
          constitution: {
            details: {
              blocking: [{ message: 'issue', file: 'src/utils/helper.js' }],
              warning: [],
            },
          },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence();
      expect(entries.length).toBe(1);
      expect(entries[0].workspaces).toEqual([]);
    });

    test('extracts workspace from filePath key in constitution issues', () => {
      writeEvidence('guard-103.json', {
        id: 'filepath-key-test',
        type: 'guard',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'fail',
        results: {
          constitution: {
            details: {
              blocking: [],
              warning: [{ message: 'warn', filePath: 'packages/core/lib/mod.js' }],
            },
          },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence();
      expect(entries.length).toBe(1);
      expect(entries[0].workspaces).toContain('packages/core');
    });

    test('extracts workspace from message containing file path', () => {
      writeEvidence('guard-104.json', {
        id: 'msg-path-test',
        type: 'guard',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'fail',
        results: {
          constitution: {
            details: {
              blocking: [{ message: 'Violation in packages/auth/src/token.js' }],
              warning: [],
            },
          },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence();
      expect(entries.length).toBe(1);
      expect(entries[0].workspaces).toContain('packages/auth');
    });

    test('extracts workspace via workspaceName key in constitution issues', () => {
      writeEvidence('guard-105.json', {
        id: 'ws-name-key-test',
        type: 'guard',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'fail',
        results: {
          constitution: {
            details: {
              blocking: [{ workspaceName: 'packages/db', message: 'issue' }],
              warning: [],
            },
          },
        },
      });

      const cmd = new GraphHistoryCommand(tmpDir);
      const entries = cmd.scanEvidence();
      expect(entries.length).toBe(1);
      expect(entries[0].workspaces).toContain('packages/db');
    });
  });

  describe('_printDetail with workspaces (line 240)', () => {
    test('prints workspaces in detail view when entry has workspaces', () => {
      writeEvidence('verify-200.json', {
        id: 'detail-ws-test',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'pass',
        results: {
          tests: {
            passed: true,
            workspaces: [
              { workspaceName: 'packages/api', passed: true },
              { workspaceName: 'packages/web', passed: true },
            ],
          },
        },
      });

      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new GraphHistoryCommand(tmpDir);
      cmd.replay('detail-ws-test');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Workspaces');
      expect(output).toContain('packages/api');
      expect(output).toContain('packages/web');
      spy.mockRestore();
    });
  });
});
