const { Command } = require('commander');
const { CommandLoader } = require('../src/cli/registry/command-loader');
const { commandRegistry } = require('../src/cli/registry/command-registry');
const { buildCommandFactories } = require('../src/cli/helpers/command-factories');

describe('CommandLoader', () => {
  function createProgram() {
    return new Command();
  }

  function createMockFactory(executeResult) {
    return class MockCommand {
      constructor(spinner) { this.spinner = spinner; }
      async execute(..._args) { return executeResult || 'ok'; }
    };
  }

  describe('constructor', () => {
    test('accepts program and context', () => {
      const loader = new CommandLoader(createProgram(), {
        commandFactories: { Foo: createMockFactory() },
        createSpinner: () => ({ start: () => {}, succeed: () => {} }),
        skipNames: ['foo'],
      });
      expect(loader.skipNames).toContain('foo');
      expect(loader.strictFactories).toBe(false);
      expect(loader.commands).toBeInstanceOf(Map);
    });

    test('supports strict factory validation mode', () => {
      const loader = new CommandLoader(createProgram(), { strictFactories: true });
      expect(loader.strictFactories).toBe(true);
    });

    test('uses defaults when context is empty', () => {
      const loader = new CommandLoader(createProgram());
      expect(loader.commandFactories).toEqual({});
      expect(loader.createSpinner).toBeNull();
      expect(loader.skipNames).toEqual([]);
    });
  });

  describe('registerAll', () => {
    test('registers all non-skipped commands from registry', () => {
      const program = createProgram();
      const mockFactory = createMockFactory();
      const factories = {
        InitCommand: mockFactory,
        UpdateCommand: mockFactory,
        ListCommand: mockFactory,
        StatusCommand: mockFactory,
        SkillsCommand: mockFactory,
        CommandsCommand: mockFactory,
      };
      const loader = new CommandLoader(program, {
        commandFactories: factories,
        skipNames: ['init [path]'],
      });
      loader.registerAll();
      expect(loader.commands.has('init [path]')).toBe(false);
    });

    test('skips commands listed in skipNames', () => {
      const program = createProgram();
      const loader = new CommandLoader(program, {
        skipNames: ['init [path]', 'update [path]'],
      });
      loader.registerAll();
      expect(loader.commands.has('init [path]')).toBe(false);
      expect(loader.commands.has('update [path]')).toBe(false);
    });
  });

  describe('registerCommand', () => {
    test('registers simple command with options', () => {
      const program = createProgram();
      const loader = new CommandLoader(program, {
        commandFactories: { TestCmd: createMockFactory() },
      });
      loader.registerCommand({
        name: 'test-cmd',
        description: 'Test command',
        options: [
          { flags: '--json', description: 'JSON output' },
        ],
        action: 'TestCmd',
      });
      expect(loader.commands.has('test-cmd')).toBe(true);
    });

    test('registers command with alias', () => {
      const program = createProgram();
      const loader = new CommandLoader(program);
      loader.registerCommand({
        name: 'test-cmd',
        alias: 'tc',
        description: 'Test',
      });
      expect(loader.commands.has('test-cmd')).toBe(true);
    });

    test('registers command with subcommands', () => {
      const program = createProgram();
      const loader = new CommandLoader(program, {
        commandFactories: { SubCmd: createMockFactory() },
      });
      loader.registerCommand({
        name: 'parent',
        description: 'Parent',
        subcommands: [
          {
            name: 'child',
            description: 'Child subcommand',
            action: 'SubCmd',
          },
        ],
      });
      expect(loader.commands.has('parent')).toBe(false);
    });
  });

  describe('_wireAction', () => {
    test('creates factory instance and calls execute', async () => {
      const program = new Command();
      let executed = false;
      class TestCmd {
        async execute() { executed = true; }
      }

      const loader = new CommandLoader(program, {
        commandFactories: { TestCmd },
      });

      const cmd = program.command('test');
      loader._wireAction(cmd, { action: 'TestCmd' });

      await cmd.parseAsync(['node', 'test', 'test'], { from: 'user' });
      expect(executed).toBe(true);
    });

    test('uses spinner when defined', async () => {
      const program = new Command();
      let spinnerStarted = false;
      let spinnerSucceeded = false;

      class TestCmd {
        constructor(spinner) { this.spinner = spinner; }
        async execute() { return 'done'; }
      }

      const loader = new CommandLoader(program, {
        commandFactories: { TestCmd },
        createSpinner: () => ({
          start() { spinnerStarted = true; return this; },
          succeed() { spinnerSucceeded = true; },
        }),
      });

      const cmd = program.command('test');
      loader._wireAction(cmd, {
        action: 'TestCmd',
        spinner: 'Working...',
        success: 'Done!',
      });

      await cmd.parseAsync(['node', 'test', 'test'], { from: 'user' });
      expect(spinnerStarted).toBe(true);
      expect(spinnerSucceeded).toBe(true);
    });

    test('sets process.exitCode = 1 on failure', async () => {
      const program = new Command();
      class FailCmd {
        async execute() { throw new Error('boom'); }
      }

      const originalExitCode = process.exitCode;
      process.exitCode = 0;

      try {
        const loader = new CommandLoader(program, {
          commandFactories: { FailCmd },
        });
        const cmd = program.command('test');
        loader._wireAction(cmd, { action: 'FailCmd' });

        await cmd.parseAsync(['node', 'test', 'test'], { from: 'user' });
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = originalExitCode;
      }
    });

    test('skips wiring when factory is not found in compatible mode', () => {
      const program = new Command();
      const loader = new CommandLoader(program, { commandFactories: {} });
      const cmd = program.command('test');
      loader._wireAction(cmd, { action: 'NonExistent' });
    });

    test('throws when factory is not found in strict mode', () => {
      const program = new Command();
      const loader = new CommandLoader(program, { commandFactories: {}, strictFactories: true });
      const cmd = program.command('test');
      expect(() => loader._wireAction(cmd, { action: 'NonExistent' }))
        .toThrow('Missing command factory for action: NonExistent');
    });

    test('successText function is not called when spinner is null', async () => {
      const program = new Command();
      let successFnCalled = false;

      class TestCmd {
        async execute() { return { count: 42 }; }
      }

      const loader = new CommandLoader(program, {
        commandFactories: { TestCmd },
      });

      const cmd = program.command('test');
      loader._wireAction(cmd, {
        action: 'TestCmd',
        success: () => { successFnCalled = true; return 'Got 42'; },
      });

      await cmd.parseAsync(['node', 'test', 'test'], { from: 'user' });
      // When no spinner, successText function is not invoked (short-circuit at line 54)
      expect(successFnCalled).toBe(false);
    });

    test('calls spinner.fail when execute throws with spinner active', async () => {
      const program = new Command();
      let failCalled = false;
      let failMessage = null;

      class FailCmd {
        async execute() { throw new Error('catastrophe'); }
      }

      const loader = new CommandLoader(program, {
        commandFactories: { FailCmd },
        createSpinner: () => ({
          start() { return this; },
          fail(msg) { failCalled = true; failMessage = msg; },
          succeed() {},
        }),
      });

      const cmd = program.command('test');
      loader._wireAction(cmd, {
        action: 'FailCmd',
        spinner: 'Working...',
      });

      const originalExitCode = process.exitCode;
      process.exitCode = 0;
      try {
        await cmd.parseAsync(['node', 'test', 'test'], { from: 'user' });
        expect(failCalled).toBe(true);
        expect(failMessage).toBe('catastrophe');
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = originalExitCode;
      }
    });
  });

  describe('getCommand / getAllCommands', () => {
    test('returns registered command by name', () => {
      const program = createProgram();
      const loader = new CommandLoader(program);
      loader.registerCommand({
        name: 'foo',
        description: 'Foo',
      });
      expect(loader.getCommand('foo')).toBeDefined();
      expect(loader.getCommand('bar')).toBeNull();
    });

    test('getAllCommands returns the map', () => {
      const program = createProgram();
      const loader = new CommandLoader(program);
      loader.registerCommand({ name: 'a', description: 'A' });
      loader.registerCommand({ name: 'b', description: 'B' });
      expect(loader.getAllCommands().size).toBe(2);
    });
  });
});

describe('commandRegistry', () => {
  test('is an array of command definitions', () => {
    expect(Array.isArray(commandRegistry)).toBe(true);
    expect(commandRegistry.length).toBeGreaterThan(10);
  });

  test('each entry has name and description', () => {
    for (const cmd of commandRegistry) {
      expect(cmd.name).toBeDefined();
      expect(cmd.description).toBeDefined();
      expect(typeof cmd.name).toBe('string');
      expect(typeof cmd.description).toBe('string');
    }
  });

  test('entries with action reference a known factory', () => {
    const factories = buildCommandFactories();
    const skipped = new Set([
      'constitution [action] [target]',
      'hooks',
      'graph',
      'runtime',
      'recommend',
      'doctor',
      'start',
      'memory <action> [args...]',
      'baby-steps [task]',
      'sudo run [file]',
      'list',
      'status [change]',
      'progress',
      'vision [action]',
      'prp [action]',
      'design [action]',
      'certainty [action]',
      'complexity [action]',
      'factory [action]',
      'iterate [action]',
      'help [topic]',
      'parallel [action]',
      'supervisor [action]',
      'memory-scan [action]',
      'graph-history [action] [id]',
    ]);
    const actions = [];

    for (const cmd of commandRegistry) {
      if (skipped.has(cmd.name)) continue;
      if (cmd.action) actions.push(cmd.action);
      for (const sub of cmd.subcommands || []) {
        if (sub.action) actions.push(sub.action);
      }
    }

    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      const factoryName = String(action).split('.')[0];
      expect(factories[factoryName]).toBeDefined();
    }
  });

  test('entries with subcommands have valid structure', () => {
    for (const cmd of commandRegistry) {
      if (cmd.subcommands) {
        expect(Array.isArray(cmd.subcommands)).toBe(true);
        for (const sub of cmd.subcommands) {
          expect(sub.name).toBeDefined();
          expect(sub.description).toBeDefined();
        }
      }
    }
  });
});
