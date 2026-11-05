const fs = require('fs');
const os = require('os');
const path = require('path');
const EventEmitter = require('events');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.red = fn;
  fn.cyan = fn;
  fn.dim = fn;
  return fn;
});

function captureGraphActions(graphCommandFn) {
  const actions = {};
  const mockGraph = {
    command: jest.fn().mockImplementation((name) => {
      actions._current = name;
      return mockGraph;
    }),
    description: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    addHelpText: jest.fn().mockReturnThis(),
    action: jest.fn().mockImplementation((fn) => {
      actions[actions._current] = fn;
      return mockGraph;
    }),
  };
  const mockProgram = {
    command: jest.fn().mockReturnValue(mockGraph),
  };
  graphCommandFn(mockProgram);
  return actions;
}

describe('round21 graph command branch coverage', () => {
  let tmpDir;
  let logSpy;
  let errorSpy;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-round21-graph-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    originalCwd = process.cwd();
    process.exitCode = 0;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.chdir(originalCwd);
    process.exitCode = 0;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('handles graph data helpers with missing skills, dependencies, and config fallback', () => {
    const graph = require('../src/cli/commands/graph');

    expect(graph.getEdges({})).toEqual([]);
    expect(graph.getEdges({ skills: { build: { depends_on: ['spec', 'plan'] }, spec: {}, plan: {} } }))
      .toEqual([{ from: 'spec', to: 'build' }, { from: 'plan', to: 'build' }]);
    expect(graph.buildMermaid({ skills: { 'spec/start': {}, 'build-step': { depends_on: ['spec/start'] } } }))
      .toContain('spec_start --> build_step');
    expect(graph.formatParallelLayers({ skills: { solo: { depends_on: [] } }, config: undefined }))
      .toContain('Layer 0: solo');
  });

  it('visualize defaults to mermaid when called with no options', async () => {
    const graph = require('../src/cli/commands/graph');
    const actions = captureGraphActions(graph.graphCommand);

    await actions.visualize();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('graph TD'));
  });

  it('visualize prints JSON to stdout and honors uppercase format', async () => {
    const graph = require('../src/cli/commands/graph');
    const actions = captureGraphActions(graph.graphCommand);

    await actions.visualize({ format: 'JSON', intent: 'hotfix' });

    const payload = JSON.parse(logSpy.mock.calls[0][0]);
    expect(payload).toHaveProperty('name');
    expect(Array.isArray(payload.nodes)).toBe(true);
    expect(Array.isArray(payload.edges)).toBe(true);
  });

  it('visualize rejects invalid format without throwing', async () => {
    const graph = require('../src/cli/commands/graph');
    const actions = captureGraphActions(graph.graphCommand);

    await actions.visualize({ format: 'dot' });

    expect(process.exitCode).toBe(1);
  });

  it('visualize html uses tmp output when output is omitted', async () => {
    const originalReadFileSync = fs.readFileSync;
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, encoding) => {
      if (String(filePath).endsWith(path.join('templates', 'graph.html'))) {
        return '<html>{{MERMAID_CODE}}</html>';
      }
      return originalReadFileSync(filePath, encoding);
    });
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    const spawnSpy = jest.spyOn(require('child_process'), 'spawn').mockImplementation(() => {
      const ee = new EventEmitter();
      setImmediate(() => ee.emit('close', 0));
      return ee;
    });

    const graph = require('../src/cli/commands/graph');
    const actions = captureGraphActions(graph.graphCommand);

    await actions.visualize({ format: 'html' });

    expect(spawnSpy).toHaveBeenCalled();
    const openedPath = spawnSpy.mock.calls[0][1][0];
    expect(openedPath).toContain(path.join(os.tmpdir(), 'stdd-graph-'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Graph visualization opened in browser'));
  });

  it('history delegates options on happy path and catches list errors', async () => {
    const list = jest.fn();
    const GraphHistoryCommand = jest.fn(() => ({ list }));
    jest.doMock('../src/cli/commands/graph-history', () => ({ GraphHistoryCommand }));

    const graph = require('../src/cli/commands/graph');
    const actions = captureGraphActions(graph.graphCommand);
    const options = { json: true, change: 'checkout', workspace: 'packages/api' };

    await actions.history(options);

    expect(GraphHistoryCommand).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(options);

    list.mockImplementationOnce(() => { throw new Error('history failed'); });
    await actions.history({});

    expect(process.exitCode).toBe(1);
  });

  it('replay delegates id/options on happy path and catches replay errors', async () => {
    const replay = jest.fn();
    const GraphHistoryCommand = jest.fn(() => ({ replay }));
    jest.doMock('../src/cli/commands/graph-history', () => ({ GraphHistoryCommand }));

    const graph = require('../src/cli/commands/graph');
    const actions = captureGraphActions(graph.graphCommand);

    await actions['replay <id>']('run-1', { json: true, verbose: false });

    expect(replay).toHaveBeenCalledWith('run-1', { json: true, verbose: false });

    replay.mockImplementationOnce(() => { throw new Error('replay failed'); });
    await actions['replay <id>']('run-2', {});

    expect(process.exitCode).toBe(1);
  });

  it('recommend prints human output, JSON output, and catches engine errors', async () => {
    const recommendations = [{ next: 'verify', reason: 'evidence exists' }];
    const recommend = jest.fn(() => recommendations);
    const printRecommendations = jest.fn();
    const RecommendEngine = jest.fn(() => ({ recommend }));
    jest.doMock('../src/cli/commands/recommend', () => ({ RecommendEngine, printRecommendations }));

    const graph = require('../src/cli/commands/graph');
    const actions = captureGraphActions(graph.graphCommand);
    process.chdir(tmpDir);

    await actions['recommend [change]']('checkout', { workspace: 'packages/api' });

    expect(RecommendEngine).toHaveBeenCalledWith(process.cwd());
    expect(recommend).toHaveBeenCalledWith('checkout', { workspace: 'packages/api' });
    expect(printRecommendations).toHaveBeenCalledWith(recommendations);

    await actions['recommend [change]'](undefined, { json: true });
    expect(JSON.parse(logSpy.mock.calls[0][0])).toEqual(recommendations);

    recommend.mockImplementationOnce(() => { throw new Error('recommend failed'); });
    await actions['recommend [change]']('broken', {});

    expect(process.exitCode).toBe(1);
  });

  it('run delegates graph run options and catches execution errors', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const GraphRunCommand = jest.fn(() => ({ execute }));
    jest.doMock('../src/cli/commands/graph-run', () => ({ GraphRunCommand }));

    const graph = require('../src/cli/commands/graph');
    const actions = captureGraphActions(graph.graphCommand);

    await actions.run({ intent: 'repair', changeName: 'bugfix', skipApply: true, workspace: 'pkg' });

    expect(execute).toHaveBeenCalledWith('repair', {
      changeName: 'bugfix',
      skipApply: true,
      workspace: 'pkg',
      rigor: undefined,
      retry: undefined,
      noCache: false,
    });

    execute.mockRejectedValueOnce(new Error('run failed'));
    await actions.run({ intent: 'feature' });

    expect(process.exitCode).toBe(1);
  });
});

describe('round21 pre-file-write hook branch coverage', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-round21-pre-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runChecks ignores non-write tools', async () => {
    const { runChecks } = require('../src/templates/hooks/pre-file-write');

    await expect(runChecks({ tool_name: 'Read', tool_input: { file_path: '/tmp/app.js' } }))
      .resolves.toEqual({ block: false });
  });

  it('blocks implementation files without tests and includes warnings in message', async () => {
    const { runChecks } = require('../src/templates/hooks/pre-file-write');
    const filePath = path.join(tmpDir, 'src', 'service.js');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const longContent = Array.from({ length: 501 }, (_, i) => `const value${i} = ${i};`).join('\n');

    const result = await runChecks({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: `${longContent}\nconst password = "not-for-real";` },
    });

    expect(result.block).toBe(true);
    expect(result.violations.some(v => v.article === 2)).toBe(true);
    expect(result.violations.some(v => v.article === 4 && v.level === 'warning')).toBe(true);
    expect(result.violations.some(v => v.article === 7 && v.message.includes('password'))).toBe(true);
    expect(result.message).toContain('Blocking Issues');
    expect(result.message).toContain('Warnings');
  });

  it('does not block implementation files when corresponding project-root test exists', async () => {
    const { runChecks } = require('../src/templates/hooks/pre-file-write');
    const filePath = path.join(tmpDir, 'src', 'worker.ts');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '__tests__'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '__tests__', 'worker.test.ts'), '');

    const result = await runChecks({
      tool_name: 'Edit',
      tool_input: { file_path: filePath, new_string: 'export const worker = 1;' },
    });

    expect(result.block).toBe(false);
    expect(result.message).toBeNull();
  });

  it('covers implementation-file exclusions and language-specific test path derivation', () => {
    const {
      isImplementationFile,
      getCorrespondingTestFile,
      checkSecurity,
      formatViolationMessage,
    } = require('../src/templates/hooks/pre-file-write');

    expect(isImplementationFile(path.join(tmpDir, 'src', 'types.d.ts'))).toBe(false);
    expect(isImplementationFile(path.join(tmpDir, 'src', 'service.spec.js'))).toBe(false);
    expect(isImplementationFile(path.join(tmpDir, 'scripts', 'tool.js'))).toBe(false);

    const pyFile = path.join(tmpDir, 'src', 'task.py');
    const goFile = path.join(tmpDir, 'src', 'server.go');
    fs.mkdirSync(path.dirname(pyFile), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'task_test.py'), '');
    fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'tests', 'server_test.go'), '');

    expect(getCorrespondingTestFile(pyFile).endsWith(path.join('src', 'task_test.py'))).toBe(true);
    expect(getCorrespondingTestFile(goFile).endsWith(path.join('tests', 'server_test.go'))).toBe(true);

    const security = checkSecurity('const secret = "abc"; const token = "abcdefghijklmnopqrstuvwxyz";');
    expect(security.map(v => v.message)).toEqual([
      'Hardcoded sensitive data detected: secret',
      'Hardcoded sensitive data detected: token',
    ]);

    expect(formatViolationMessage([{ article: 4, level: 'warning', message: 'Long file' }]))
      .toContain('Warnings');
  });
});

describe('round21 post-file-write hook branch coverage', () => {
  it('analyzeCode handles missing tool input fields through defaults', async () => {
    const { analyzeCode } = require('../src/templates/hooks/post-file-write');

    await expect(analyzeCode({ tool_name: 'Write', tool_input: {} })).resolves.toEqual([]);
  });

  it('analyzeCode can return documentation, error-handling, and performance suggestions together', async () => {
    const { analyzeCode } = require('../src/templates/hooks/post-file-write');
    const content = [
      'function load(ids) {',
      '  try { risky(); } catch (err) {}',
      '  for (let i = 0; i < ids.length; i++) {',
      '    query(ids[i]);',
      '  }',
      '}',
    ].join('\n');

    const result = await analyzeCode({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/service.ts', content },
    });

    expect(result.map(s => s.article).sort()).toEqual([5, 6, 8]);
  });

  it('covers documentation, catch, n+1, brace extraction, and source-file negative branches', () => {
    const {
      isSourceFile,
      hasDocumentation,
      hasEmptyCatch,
      hasNPlusOnePattern,
      extractBraceBody,
      formatSuggestions,
    } = require('../src/templates/hooks/post-file-write');

    expect(isSourceFile('/tmp/APP.JS')).toBe(false);
    expect(hasDocumentation('const value = 1;')).toBe(false);
    expect(hasDocumentation('/** doc */')).toBe(true);
    expect(hasEmptyCatch('try { x(); } catch { }')).toBe(false);
    expect(hasNPlusOnePattern('for (let i = 0; i < ids.length; i++) { query(ids[i]);')).toBe(true);
    expect(extractBraceBody('abc', 10)).toBe('');
    expect(formatSuggestions([{ article: 8, level: 'warning', message: 'Possible N+1', suggestion: 'Batch it' }]))
      .toContain('Warning Article 8');
  });
});
