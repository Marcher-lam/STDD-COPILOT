/**
 * Targeted round 21 coverage for cli.js inline command branches.
 */

jest.mock('commander', () => {
  const allCommands = [];

  function makeCommand(signature, parent = null) {
    const cmd = {
      signature,
      parent,
      children: [],
      description: jest.fn(() => cmd),
      option: jest.fn(() => cmd),
      alias: jest.fn(() => cmd),
      addHelpText: jest.fn(() => cmd),
      action: jest.fn((fn) => {
        cmd.actionFn = fn;
        return cmd;
      }),
      command: jest.fn((childSignature) => {
        const child = makeCommand(childSignature, cmd);
        cmd.children.push(child);
        allCommands.push(child);
        return child;
      }),
    };
    return cmd;
  }

  const parseMock = jest.fn();
  const program = makeCommand('__program__');
  program.name = jest.fn(() => program);
  program.version = jest.fn(() => program);
  program.command = jest.fn((signature) => {
    const cmd = makeCommand(signature, program);
    program.children.push(cmd);
    allCommands.push(cmd);
    return cmd;
  });
  program.parse = parseMock;

  const Command = jest.fn(() => program);
  return { Command, _program: program, _commands: allCommands, _parseMock: parseMock };
});

jest.mock('chalk', () => ({
  red: jest.fn((s) => `[red]${s}`),
  green: jest.fn((s) => `[green]${s}`),
  yellow: jest.fn((s) => `[yellow]${s}`),
  bold: jest.fn((s) => s),
  dim: jest.fn((s) => `[dim]${s}`),
}));

jest.mock('../src/cli/registry/command-loader', () => ({
  CommandLoader: jest.fn().mockImplementation(() => ({ registerAll: jest.fn() })),
}));

jest.mock('../src/cli/commands/index', () => ({
  InitCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  ListCommand: jest.fn(),
  NewCommand: jest.fn(),
  StatusCommand: jest.fn(),
  ApplyCommand: jest.fn(),
  VerifyCommand: jest.fn(),
  ArchiveCommand: jest.fn(),
  FFCommand: jest.fn(),
  TurboCommand: jest.fn(),
  MetricsCommand: jest.fn(),
  GuardCommand: jest.fn(),
  ExploreCommand: jest.fn(),
  StartersCommand: jest.fn(),
  ContinueCommand: jest.fn(),
  IssueCommand: jest.fn(),
  CommitCommand: jest.fn(),
  ContextCommand: jest.fn(),
  CiGeneratorCommand: jest.fn(),
  AuditCommand: jest.fn(),
  WorkspaceCommand: jest.fn(),
  DepcheckCommand: jest.fn(),
  SchemaCommand: jest.fn(),
  ContractCommand: jest.fn(),
  MockGenCommand: jest.fn(),
  ValidateCommand: jest.fn(),
  LearnCommand: jest.fn(),
  RolesCommand: jest.fn(),
  ExtensionsCommand: jest.fn(),
  StoryCommand: jest.fn(),
  UserTestCommand: jest.fn(),
  PipelineCommand: jest.fn(),
  FixPacketCommand: jest.fn(),
  OutsideInCommand: jest.fn(),
  RecommendEngine: jest.fn(),
  printRecommendations: jest.fn(),
  ConstitutionFixCommand: jest.fn(),
  MutationCommand: jest.fn(),
  AgentEngine: jest.fn(),
  SudoLangParser: jest.fn(),
  BabyStepsCommand: jest.fn(),
  SudoExecutor: jest.fn(),
  ElicitationCommand: jest.fn(),
  createAgentExecutor: jest.fn(),
  ProductProposalCommand: jest.fn(),
  StartCommand: jest.fn(),
  DoctorCommand: jest.fn(),
  SkillsCommand: jest.fn(),
  CommandsCommand: jest.fn(),
}));

jest.mock('../src/cli/commands/progress', () => ({ ProgressCommand: jest.fn() }));
jest.mock('../src/cli/commands/browser', () => ({ BrowserCommand: jest.fn() }));
jest.mock('../src/cli/commands/spec-generator', () => ({ SpecGenerator: jest.fn() }));
jest.mock('../src/cli/commands/api-spec', () => ({ ApiSpecCommand: jest.fn() }));
jest.mock('../src/cli/commands/memory-scan', () => ({ MemoryScanner: jest.fn() }));
jest.mock('../src/cli/commands/tdd-init', () => ({ TddInitCommand: jest.fn() }));
jest.mock('../src/cli/commands/constitution-status', () => ({ ConstitutionStatusCommand: jest.fn() }));
jest.mock('../src/cli/commands/hooks', () => jest.fn());
jest.mock('../src/cli/commands/graph', () => ({ graphCommand: jest.fn() }));
jest.mock('../src/cli/commands/constitution-checker', () => ({ ConstitutionChecker: jest.fn() }));
jest.mock('../src/cli/commands/waiver-manager', () => ({ WaiverManager: jest.fn() }));

jest.mock('../src/utils/session-progress', () => {
  const progressInstance = {
    start: jest.fn(() => ({ id: 'progress-entry' })),
    complete: jest.fn(),
    fail: jest.fn(),
  };
  return {
    progress: jest.fn(() => progressInstance),
    installSignals: jest.fn(),
    active: jest.fn(() => null),
    setActive: jest.fn(),
    clearActive: jest.fn(),
    _progressInstance: progressInstance,
  };
});

jest.mock('../src/utils/change-utils', () => ({ findActiveChange: jest.fn() }));

describe('cli.js round21 inline branch coverage', () => {
  let commander;
  let commandsIndex;
  let logSpy;
  let errorSpy;
  let writeSpy;
  let originalExitCode;

  beforeAll(() => {
    originalExitCode = process.exitCode;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    require('../cli');
    commander = require('commander');
    commandsIndex = require('../src/cli/commands/index');
  });

  afterAll(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    writeSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  beforeEach(() => {
    process.exitCode = 0;
    jest.clearAllMocks();
  });

  function getAction(signature) {
    const cmd = commander._commands.find((candidate) => candidate.signature === signature);
    if (!cmd || !cmd.actionFn) throw new Error(`Missing action for ${signature}`);
    return cmd.actionFn;
  }

  describe('constitution inline routing', () => {
    it('uses --article as show target and reads an existing article file', async () => {
      const fs = require('fs');
      const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('Article body');

      await getAction('constitution [action] [target]')('show', undefined, { article: '1' });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 1: Library-First'));
      expect(existsSpy).toHaveBeenCalledWith(expect.stringContaining('01-library-first.md'));
      expect(readSpy).toHaveBeenCalledWith(expect.stringContaining('01-library-first.md'), 'utf8');
      expect(logSpy).toHaveBeenCalledWith('Article body');

      existsSpy.mockRestore();
      readSpy.mockRestore();
    });

    it('lists articles instead of reading a target when JSON output is requested', async () => {
      const fs = require('fs');
      const existsSpy = jest.spyOn(fs, 'existsSync');

      await getAction('constitution [action] [target]')('show', '2', { json: true });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 1'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 9'));
      expect(existsSpy).not.toHaveBeenCalled();

      existsSpy.mockRestore();
    });

    it('prints JSON check results for a passing constitution check', async () => {
      const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');
      ConstitutionChecker.mockImplementation(() => ({
        loadWaivers: jest.fn(),
        run: jest.fn(),
        issues: { blocking: [], warning: [], suggestion: [] },
      }));

      await getAction('constitution [action] [target]')('check', undefined, { json: true });

      expect(process.exitCode).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
        status: 'pass',
        blocking: [],
        warning: [],
        suggestion: [],
        workspace: null,
      }, null, 2));
    });

    it('prints non-JSON warning and suggestion violations without setting exitCode', async () => {
      const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');
      const chalk = require('chalk');
      ConstitutionChecker.mockImplementation(() => ({
        loadWaivers: jest.fn(),
        run: jest.fn(),
        issues: {
          blocking: [],
          warning: [{ article: 3, severity: 'warning', message: 'Commit too large' }],
          suggestion: [{ article: 8, severity: 'suggestion', message: 'Cache repeated work' }],
        },
      }));

      await getAction('constitution [action] [target]')('check', undefined, {});

      expect(process.exitCode).toBe(0);
      expect(chalk.yellow).toHaveBeenCalledWith('⚠');
      expect(chalk.dim).toHaveBeenCalledWith('ℹ');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 3: Commit too large'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 8: Cache repeated work'));
    });

    it('routes constitution fix with normalized option values', async () => {
      const execute = jest.fn().mockResolvedValue(undefined);
      commandsIndex.ConstitutionFixCommand.mockImplementation(() => ({ execute }));

      await getAction('constitution [action] [target]')('fix', undefined, {
        article: '7',
        dryRun: true,
        workspace: '/tmp/workspace',
      });

      expect(commandsIndex.ConstitutionFixCommand).toHaveBeenCalled();
      expect(execute).toHaveBeenCalledWith(process.cwd(), {
        article: 7,
        dryRun: true,
        workspace: '/tmp/workspace',
      });
    });
  });

  describe('memory and baby-steps inline routing', () => {
    it('constructs MemoryScanner but no-ops for unknown memory actions', async () => {
      const { MemoryScanner } = require('../src/cli/commands/memory-scan');
      const scan = jest.fn();
      const listMemory = jest.fn();
      MemoryScanner.mockImplementation(() => ({ scan, listMemory }));

      await getAction('memory <action> [args...]')('unknown', [], { json: true });

      expect(MemoryScanner).toHaveBeenCalledWith(process.cwd());
      expect(scan).not.toHaveBeenCalled();
      expect(listMemory).not.toHaveBeenCalled();
    });

    it('reports no active changes without mutating the real cwd', async () => {
      const fs = require('fs');
      const { findActiveChange } = require('../src/utils/change-utils');
      const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/safe/project');
      findActiveChange.mockReturnValue(null);

      await getAction('baby-steps [task]')('task');

      expect(process.exitCode).toBe(1);
      expect(findActiveChange).toHaveBeenCalledWith('/safe/project/stdd');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No active changes.'));

      cwdSpy.mockRestore();
      existsSpy.mockRestore();
    });

    it('executes baby-steps against the active change and defaults the task name', async () => {
      const fs = require('fs');
      const { findActiveChange } = require('../src/utils/change-utils');
      const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/safe/project');
      const execute = jest.fn().mockResolvedValue(undefined);
      findActiveChange.mockReturnValue('/safe/project/stdd/changes/my-change');
      commandsIndex.BabyStepsCommand.mockImplementation(() => ({ execute }));

      await getAction('baby-steps [task]')(undefined);

      expect(process.exitCode).toBe(0);
      expect(commandsIndex.BabyStepsCommand).toHaveBeenCalledWith('/safe/project/stdd/changes/my-change');
      expect(execute).toHaveBeenCalledWith('Next Step');

      cwdSpy.mockRestore();
      existsSpy.mockRestore();
    });
  });

  describe('sudo run inline routing', () => {
    it('executes a resolved SudoLang file path', async () => {
      const path = require('path');
      const executeFile = jest.fn().mockResolvedValue(undefined);
      commandsIndex.SudoExecutor.mockImplementation(() => ({ executeFile }));

      await getAction('sudo run [file]')('fixtures/sample.sudo');

      expect(commandsIndex.SudoExecutor).toHaveBeenCalledWith(process.cwd());
      expect(executeFile).toHaveBeenCalledWith(path.resolve('fixtures/sample.sudo'));
    });
  });

  describe('runtime agent subcommand routing', () => {
    it('requires a topic when starting runtime agent simulation', async () => {
      await getAction('agent <action> [topic]')('start', undefined, {});

      expect(process.exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Topic is required to start.'));
    });

    it('starts runtime agent simulation and emits JSON state', async () => {
      const start = jest.fn().mockReturnValue({ topic: 'design api', round: 1 });
      commandsIndex.AgentEngine.mockImplementation(() => ({ start }));

      await getAction('agent <action> [topic]')('start', 'design api', { rounds: '3', json: true });

      expect(start).toHaveBeenCalledWith('design api', { rounds: '3' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Simulation started: design api'));
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ topic: 'design api', round: 1 }, null, 2));
    });

    it('reports runtime next-turn errors without throwing', async () => {
      const nextTurn = jest.fn().mockReturnValue({ error: 'No simulation active' });
      commandsIndex.AgentEngine.mockImplementation(() => ({ nextTurn }));

      await getAction('agent <action> [topic]')('next', undefined, {});

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No simulation active'));
      expect(process.exitCode).toBe(0);
    });

    it('prints runtime next-turn details and JSON payload', async () => {
      const turn = { turn: 2, speaker: { name: 'Architect', role: 'reviewer' } };
      const nextTurn = jest.fn().mockReturnValue(turn);
      commandsIndex.AgentEngine.mockImplementation(() => ({ nextTurn }));

      await getAction('agent <action> [topic]')('next', undefined, { json: true });

      expect(logSpy).toHaveBeenCalledWith('\nTurn 2: Architect');
      expect(logSpy).toHaveBeenCalledWith('Role: reviewer');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(turn, null, 2));
    });

    it('records runtime agent turns with pipe-delimited content', async () => {
      const recordTurn = jest.fn();
      commandsIndex.AgentEngine.mockImplementation(() => ({ recordTurn }));

      await getAction('agent <action> [topic]')('record', 'agent-a|hello|world', {});

      expect(recordTurn).toHaveBeenCalledWith('agent-a', 'hello|world');
      expect(logSpy).toHaveBeenCalledWith('Recorded agent turn.');
    });

    it('stops runtime agent simulation', async () => {
      const forceStop = jest.fn().mockReturnValue({ stopped: true });
      commandsIndex.AgentEngine.mockImplementation(() => ({ forceStop }));

      await getAction('agent <action> [topic]')('stop', undefined, {});

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ stopped: true }, null, 2));
    });

    it('runs an agent executor and prints text output', async () => {
      const run = jest.fn().mockResolvedValue({ output: 'done' });
      const getStatus = jest.fn().mockReturnValue({ active: true });
      commandsIndex.AgentEngine.mockImplementation(() => ({ getStatus }));
      commandsIndex.createAgentExecutor.mockReturnValue({ run });

      await getAction('agent <action> [topic]')('run', 'ship feature', {
        executor: 'noop',
        command: 'npm test',
        allowUnsafeShellExecutor: true,
        allowedBin: 'npm,node',
        role: 'tester',
        json: false,
      });

      expect(commandsIndex.createAgentExecutor).toHaveBeenCalledWith('noop', {
        command: 'npm test',
        cwd: process.cwd(),
        allowUnsafe: true,
        allowedBins: 'npm,node',
      });
      expect(run).toHaveBeenCalledWith({ role: 'tester', goal: 'ship feature', context: { active: true } });
      expect(logSpy).toHaveBeenCalledWith('done');
    });

    it('runs an agent executor and prints JSON output', async () => {
      const result = { status: 'ok' };
      const run = jest.fn().mockResolvedValue(result);
      commandsIndex.AgentEngine.mockImplementation(() => ({ getStatus: jest.fn().mockReturnValue({}) }));
      commandsIndex.createAgentExecutor.mockReturnValue({ run });

      await getAction('agent <action> [topic]')('run', 'ship feature', { executor: 'noop', json: true });

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
    });
  });

  describe('runtime sudo subcommand routing', () => {
    it('requires a source file for runtime sudo', async () => {
      await getAction('sudo [file]')(undefined, {});

      expect(process.exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Source file path is required.'));
    });

    it('prints parsed SudoLang JSON when not generating artifacts', async () => {
      const parsed = { ast: true };
      const parse = jest.fn().mockReturnValue(parsed);
      commandsIndex.SudoLangParser.mockImplementation(() => ({ parse }));

      await getAction('sudo [file]')('Flow -> Done', {});

      expect(parse).toHaveBeenCalledWith('Flow -> Done');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(parsed, null, 2));
    });

    it('generates runtime sudo artifacts and optionally prints JSON', async () => {
      const parsed = { ast: true };
      const artifacts = { spec: '/tmp/spec.md', tests: '/tmp/test.js' };
      const parse = jest.fn().mockReturnValue(parsed);
      const generateArtifacts = jest.fn().mockReturnValue(artifacts);
      commandsIndex.SudoLangParser.mockImplementation(() => ({ parse, generateArtifacts }));

      await getAction('sudo [file]')('Flow -> Done', { generate: true, json: true });

      expect(generateArtifacts).toHaveBeenCalledWith(parsed);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Generated artifacts:'));
      expect(logSpy).toHaveBeenCalledWith('  spec: /tmp/spec.md');
      expect(logSpy).toHaveBeenCalledWith('  tests: /tmp/test.js');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(artifacts, null, 2));
    });
  });

  describe('progress parse wrapper branches', () => {
    it('tracks non-progress commands and delegates to the original parser', () => {
      const sessionProgress = require('../src/utils/session-progress');
      const program = commander._program;

      program.parse(['node', 'cli', 'status', '--json']);

      expect(sessionProgress._progressInstance.start).toHaveBeenCalledWith('status', expect.objectContaining({ positionals: [], json: true }));
      expect(sessionProgress.setActive).toHaveBeenCalledWith({ id: 'progress-entry' });
      expect(commander._parseMock).toHaveBeenCalledWith(['node', 'cli', 'status', '--json']);
    });

    it('does not track progress or help commands', () => {
      const sessionProgress = require('../src/utils/session-progress');
      const program = commander._program;
      sessionProgress._progressInstance.start.mockClear();
      sessionProgress.setActive.mockClear();
      commander._parseMock.mockClear();

      program.parse(['node', 'cli', 'progress']);
      program.parse(['node', 'cli', 'help']);

      expect(sessionProgress._progressInstance.start).not.toHaveBeenCalled();
      expect(sessionProgress.setActive).not.toHaveBeenCalled();
      expect(commander._parseMock).toHaveBeenCalledTimes(2);
    });

    it('completes active progress on clean process exit', () => {
      const sessionProgress = require('../src/utils/session-progress');
      sessionProgress.active.mockReturnValue({ id: 'active-entry' });
      process.exitCode = 0;

      const exitHandler = process.listeners('exit').at(-1);
      exitHandler();

      expect(sessionProgress.clearActive).toHaveBeenCalled();
      expect(sessionProgress._progressInstance.complete).toHaveBeenCalledWith('active-entry');
    });

    it('fails active progress on non-zero process exit', () => {
      const sessionProgress = require('../src/utils/session-progress');
      sessionProgress.active.mockReturnValue({ id: 'failed-entry' });
      process.exitCode = 2;

      const exitHandler = process.listeners('exit').at(-1);
      exitHandler();

      expect(sessionProgress.clearActive).toHaveBeenCalled();
      expect(sessionProgress._progressInstance.fail).toHaveBeenCalledWith('failed-entry', 'Command exited with code 2');
    });
  });
});
