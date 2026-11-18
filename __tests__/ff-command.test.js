const fs = require('fs');
const path = require('path');
const os = require('os');
const { FFCommand } = require('../src/cli/commands/ff');

describe('FFCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempProject(name, initialized = true) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ff-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });

    if (initialized) {
      fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
      fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });
    }

    return projectPath;
  }

  function createWorkspace(projectPath, workspacePath, name = '@demo/api') {
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    const root = path.join(projectPath, workspacePath);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name }, null, 2));
  }

  const silentSpinner = {
    text: '',
    start() {},
    stop() {},
    succeed() {},
    fail() {}
  };

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (logSpy) {
      logSpy.mockRestore();
    }
  });

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should create a change with proposal, specs directory, and tasks file', async () => {
    const projectPath = createTempProject('ff-basic-project');
    process.chdir(projectPath);

    const ffCommand = new FFCommand(silentSpinner);
    await ffCommand.execute('add user login', { changeName: 'ff-test-001' });

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'ff-test-001');
    expect(fs.existsSync(path.join(changeDir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'tasks.md'))).toBe(true);
  });

  it('should include description in proposal.md', async () => {
    const projectPath = createTempProject('ff-proposal-project');
    process.chdir(projectPath);

    const ffCommand = new FFCommand(silentSpinner);
    await ffCommand.execute('implement payment gateway', { changeName: 'ff-proposal-test' });

    const proposalPath = path.join(projectPath, 'stdd', 'changes', 'ff-proposal-test', 'proposal.md');
    const proposalContent = fs.readFileSync(proposalPath, 'utf8');
    expect(proposalContent).toContain('# Proposal: implement payment gateway');
    expect(proposalContent).toContain('implement payment gateway');
  });

  it('should derive tasks from the description with unchecked status', async () => {
    const projectPath = createTempProject('ff-tasks-project');
    process.chdir(projectPath);

    const ffCommand = new FFCommand(silentSpinner);
    await ffCommand.execute('add dashboard', { changeName: 'ff-tasks-test' });

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'ff-tasks-test', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf8');
    // A-2: tasks carry the requirement's own semantics (no fixed template
    // slots) and the [phase:red] TDD marker.
    expect(tasksContent).toContain('- [ ] TASK-001: Implement: add dashboard [phase:red]');
    expect(tasksContent).toContain('- [ ] TASK-002: Write failing tests for add dashboard [phase:red]');

    const taskLines = tasksContent.split('\n').filter(line => line.includes('TASK-'));
    expect(taskLines.length).toBe(4);

    taskLines.forEach(line => {
      expect(line).toMatch(/- \[ \]/);
    });
  });

  it('should auto-generate timestamp-based change name when not provided', async () => {
    const projectPath = createTempProject('ff-autoname-project');
    process.chdir(projectPath);

    const ffCommand = new FFCommand(silentSpinner);
    await ffCommand.execute('auto name test');

    const changesDir = path.join(projectPath, 'stdd', 'changes');
    const entries = fs.readdirSync(changesDir);
    const ffEntries = entries.filter(e => e.startsWith('ff-'));
    expect(ffEntries.length).toBe(1);

    const autoName = ffEntries[0];
    expect(autoName).toMatch(/^ff-\d{8}-\d{4}$/);
  });

  it('should fail with friendly error when STDD is not initialized', async () => {
    const projectPath = createTempProject('ff-uninit-project', false);
    process.chdir(projectPath);

    const ffCommand = new FFCommand(silentSpinner);

    await expect(ffCommand.execute('test desc'))
      .rejects
      .toThrow('STDD not initialized. Run `stdd init` first.');
  });

  it('should fail when description is empty', async () => {
    const projectPath = createTempProject('ff-empty-desc-project');
    process.chdir(projectPath);

    const ffCommand = new FFCommand(silentSpinner);

    await expect(ffCommand.execute(''))
      .rejects
      .toThrow('Description is required.');
  });

  it('fills a `new`-created skeleton instead of failing on EEXIST (A-1)', async () => {
    const projectPath = createTempProject('ff-dup-project');
    process.chdir(projectPath);

    const ffCommand = new FFCommand(silentSpinner);
    await ffCommand.execute('first change', { changeName: 'ff-dup-test' });

    // A-1: a fully populated change refuses a second ff (nothing to fill).
    await expect(ffCommand.execute('second change', { changeName: 'ff-dup-test' }))
      .rejects
      .toThrow(/already populated/);
  });

  it('should write workspace metadata and return workspace when scoped', async () => {
    const projectPath = createTempProject('ff-workspace-project');
    createWorkspace(projectPath, 'packages/api');
    process.chdir(projectPath);

    const ffCommand = new FFCommand(silentSpinner);
    const result = await ffCommand.execute('add api login', {
      changeName: 'ff-workspace-test',
      workspace: 'packages/api',
    });

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'ff-workspace-test');
    const proposalContent = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    const tasksContent = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');

    expect(result.workspace).toMatchObject({ name: '@demo/api', path: 'packages/api', tag: 'packages-api' });
    expect(proposalContent).toContain('## Workspace');
    expect(proposalContent).toContain('| Workspace | packages/api |');
    expect(tasksContent).toContain('> Workspace: packages/api');
    expect(logSpy.mock.calls.flat().join('\n')).toContain('Workspace: packages/api');
  });

  it('should fail when scoped workspace does not exist', async () => {
    const projectPath = createTempProject('ff-missing-workspace-project');
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    process.chdir(projectPath);

    const ffCommand = new FFCommand(silentSpinner);

    await expect(ffCommand.execute('add api login', { workspace: 'packages/api' }))
      .rejects
      .toThrow("Workspace 'packages/api' not found.");
  });
});
