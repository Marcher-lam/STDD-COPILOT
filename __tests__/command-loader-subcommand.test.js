const { Command } = require('commander');
const { CommandLoader } = require('../src/cli/registry/command-loader');

describe('CommandLoader registerSubcommand', () => {
  function createProgram() {
    return new Command();
  }

  test('resolves dot-notation action to instance method', async () => {
    const program = createProgram();
    let called = false;
    let receivedArgs = [];

    class SchemaCmd {
      async validate(...args) { called = true; receivedArgs = args; }
    }

    const loader = new CommandLoader(program, {
      commandFactories: { SchemaCmd },
    });

    const parent = program.command('schema').description('Schema');
    loader.registerSubcommand(parent, {
      name: 'validate [path]',
      description: 'Validate schemas',
      action: 'SchemaCmd.validate',
    });

    await program.parseAsync(['schema', 'validate', './test.yaml'], { from: 'user' });
    expect(called).toBe(true);
    expect(receivedArgs[0]).toBe('./test.yaml');
  });

  test('uses subDef.method when provided', async () => {
    const program = createProgram();
    let called = false;

    class WsCmd {
      async listItems() { called = true; }
    }

    const loader = new CommandLoader(program, {
      commandFactories: { WsCmd },
    });

    const parent = program.command('ws').description('WS');
    loader.registerSubcommand(parent, {
      name: 'list',
      description: 'List items',
      action: 'WsCmd.list',
      method: 'listItems',
    });

    await program.parseAsync(['ws', 'list'], { from: 'user' });
    expect(called).toBe(true);
  });

  test('falls back to execute when no dot in action', async () => {
    const program = createProgram();
    let called = false;

    class SimpleCmd {
      async execute() { called = true; }
    }

    const loader = new CommandLoader(program, {
      commandFactories: { SimpleCmd },
    });

    const parent = program.command('parent').description('Parent');
    loader.registerSubcommand(parent, {
      name: 'child',
      description: 'Child',
      action: 'SimpleCmd',
    });

    await program.parseAsync(['parent', 'child'], { from: 'user' });
    expect(called).toBe(true);
  });

  test('handles error and sets process.exitCode = 1', async () => {
    const program = createProgram();

    class FailCmd {
      async execute() { throw new Error('sub fail'); }
    }

    const loader = new CommandLoader(program, {
      commandFactories: { FailCmd },
    });

    const originalExitCode = process.exitCode;
    process.exitCode = 0;

    try {
      const parent = program.command('parent').description('Parent');
      loader.registerSubcommand(parent, {
        name: 'child',
        description: 'Child',
        action: 'FailCmd',
      });

      await program.parseAsync(['parent', 'child'], { from: 'user' });
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = originalExitCode;
    }
  });

  test('skips wiring when factory not found in compatible mode', () => {
    const program = createProgram();
    const loader = new CommandLoader(program, { commandFactories: {} });
    const parent = program.command('parent').description('Parent');
    // Should not throw
    loader.registerSubcommand(parent, {
      name: 'child',
      description: 'Child',
      action: 'NonExistent.method',
    });
  });

  test('throws when factory not found in strict mode', () => {
    const program = createProgram();
    const loader = new CommandLoader(program, { commandFactories: {}, strictFactories: true });
    const parent = program.command('parent').description('Parent');
    expect(() => loader.registerSubcommand(parent, {
      name: 'child',
      description: 'Child',
      action: 'NonExistent.method',
    })).toThrow('Missing command factory for action: NonExistent');
  });

  test('registers subcommand with options', () => {
    const program = createProgram();
    const loader = new CommandLoader(program, {
      commandFactories: { Cmd: class { async execute() {} } },
    });

    const parent = program.command('parent').description('Parent');
    loader.registerSubcommand(parent, {
      name: 'child',
      description: 'Child',
      options: [
        { flags: '--json', description: 'JSON output' },
        { flags: '--force', description: 'Force' },
      ],
      action: 'Cmd',
    });

    // Verify options were added - just ensure no error thrown
    expect(true).toBe(true);
  });
});
