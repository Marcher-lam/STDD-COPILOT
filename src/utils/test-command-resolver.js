const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { detectWorkspaces, resolveWorkspace } = require('./workspace-detector');
const { createLogger } = require('./logger');
const { interpolateString } = require('./env-interpolate');
const logger = createLogger('test-command-resolver');

function readPackageJson(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'EACCES') logger.warn(err.message);
    return null;
  }
}

function detectPackageManager(cwd) {
  if (fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun';
  return 'npm';
}

function detectPackageManagerWithFallback(workspaceRoot, projectRoot) {
  const wsPM = detectPackageManager(workspaceRoot);
  if (wsPM !== 'npm') return wsPM;
  return detectPackageManager(projectRoot);
}

function buildTestCommand(packageManager) {
  if (packageManager === 'pnpm') return 'pnpm test';
  if (packageManager === 'yarn') return 'yarn test';
  return 'npm test';
}

function hasTestScript(pkg) {
  return !!(pkg && pkg.scripts && pkg.scripts.test);
}

function createCommand(command, cwd, workspaceName, source) {
  return { command, cwd, workspaceName, source };
}

/**
 * 从 stdd/config.yaml 读取测试命令配置
 * @param {string} cwd - 项目根目录
 * @returns {string|null} 配置的测试命令，如果没有则返回 null
 */
function getConfigTestCommand(cwd) {
  const configPath = path.join(cwd, 'stdd', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const config = yaml.load(fs.readFileSync(configPath, 'utf-8'));
    const raw = (config && config.test && config.test.command) || null;
    // init writes declarative `${VAR:-default}` placeholders when tech-stack
    // detection fails; interpolate them here so the command is actually
    // runnable (终测复验 F1: the literal was spawned as-is → ENOENT).
    return raw ? interpolateString(raw) : null;
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'EACCES') logger.warn(err.message);
    return null;
  }
}

function resolveTestCommands(cwd, options = {}) {
  if (options.workspace) {
    const workspace = typeof options.workspace === 'string'
      ? resolveWorkspace(cwd, options.workspace)
      : options.workspace;
    if (!workspace) return [];

    if (options.testCommand) {
      return [createCommand(options.testCommand, workspace.root, workspace.name, 'workspace')];
    }

    const pkg = readPackageJson(workspace.root);
    if (!hasTestScript(pkg)) return [];
    return [createCommand(
      buildTestCommand(detectPackageManagerWithFallback(workspace.root, cwd)),
      workspace.root,
      (pkg && pkg.name) || workspace.name,
      'workspace'
    )];
  }

  if (options.testCommand) {
    return [createCommand(options.testCommand, cwd, 'root', 'root')];
  }

  if (options.configCommand) {
    return [createCommand(options.configCommand, cwd, 'root', 'root')];
  }

  const packageManager = detectPackageManager(cwd);
  const rootPkg = readPackageJson(cwd);
  if (hasTestScript(rootPkg)) {
    return [createCommand(buildTestCommand(packageManager), cwd, (rootPkg && rootPkg.name) || 'root', 'root')];
  }

  return detectWorkspaces(cwd)
    .map(workspace => ({ workspace, pkg: readPackageJson(workspace.root), wsPM: detectPackageManagerWithFallback(workspace.root, cwd) }))
    .filter(item => hasTestScript(item.pkg))
    .map(item => createCommand(
      buildTestCommand(item.wsPM),
      item.workspace.root,
      (item.pkg && item.pkg.name) || item.workspace.name,
      'workspace'
    ));
}

function detectTestCommand(cwd) {
  const commands = resolveTestCommands(cwd);
  return commands.length > 0 ? commands[0].command : null;
}

module.exports = {
  resolveTestCommands,
  detectTestCommand,
  getConfigTestCommand,
  _detectPackageManager: detectPackageManager,
  _detectPackageManagerWithFallback: detectPackageManagerWithFallback,
};
