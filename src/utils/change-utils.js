/**
 * Change Utilities
 * Shared helpers for resolving and inspecting changes.
 */

const fs = require('fs');
const path = require('path');
const { detectTestCommand } = require('./test-command-resolver');
const { createLogger } = require('./logger');
const logger = createLogger('change-utils');

const TASK_PATTERN = /^(\s*- )\[([ ~x])\]\s*(.*)$/;

function validateChangeName(changeName) {
  if (!changeName || typeof changeName !== 'string') {
    throw new Error('Change name is required.');
  }
  if (changeName.length > 128) {
    throw new Error(`Invalid change name '${changeName}': maximum length is 128 characters.`);
  }
  if (changeName !== path.basename(changeName)) {
    throw new Error(`Invalid change name '${changeName}': must not contain path separators.`);
  }
  if (/\.\./.test(changeName)) {
    throw new Error(`Invalid change name '${changeName}': path traversal not allowed.`);
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(changeName)) {
    throw new Error(`Invalid change name '${changeName}': only alphanumeric, hyphens, underscores, and dots are allowed.`);
  }
}

function ensureInsideDir(baseDir, targetPath, label = 'path') {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error(`Unsafe ${label}: resolved outside ${base}.`);
  }
  return target;
}

function resolveChangeDir(stddDir, changeName, options = {}) {
  validateChangeName(changeName);
  const changesDir = path.join(stddDir, 'changes');
  const changeDir = ensureInsideDir(changesDir, path.join(changesDir, changeName), 'change path');
  if (options.mustExist !== false && (!fs.existsSync(changeDir) || !fs.statSync(changeDir).isDirectory())) {
    return null;
  }
  return changeDir;
}

/**
 * Resolve a change directory.
 * @param {string} stddDir - The stdd root directory.
 * @param {string} [changeName] - Optional change name; falls back to first active.
 * @returns {string|null} The change dir path or null.
 */
function findActiveChange(stddDir, changeName) {
  const changesDir = path.join(stddDir, 'changes');
  if (changeName) {
    return resolveChangeDir(stddDir, changeName);
  }
  try {
    const entries = fs.readdirSync(changesDir, { withFileTypes: true });
    const active = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'archive')
      .sort((a, b) => a.name.localeCompare(b.name));
    if (active.length === 0) {
      return null;
    }
    return path.join(changesDir, active[0].name);
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'EACCES') logger.warn(err.message);
    return null;
  }
}

/**
 * Parse task checkboxes from a tasks.md file.
 * @param {string} filePath
 * @returns {{ index: number, line: string, prefix: string, status: string, description: string, isDone: boolean }[] | null}
 */
function parseTasks(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  const tasks = [];
  for (const [index, line] of lines.entries()) {
    const match = line.match(TASK_PATTERN);
    if (match) {
      const [, prefix, status, description] = match;
      tasks.push({
        index,
        line,
        prefix,
        status,
        description: description.trim(),
        isDone: status === 'x',
        raw: match[0],
      });
    }
  }
  return tasks;
}

/**
 * Check whether all tasks in a tasks.md are completed.
 * @param {string} changeDir
 * @returns {{ allDone: boolean, total: number, done: number, pending: string[] }}
 */
function checkTasksCompletion(changeDir) {
  const tasksPath = path.join(changeDir, 'tasks.md');
  if (!fs.existsSync(tasksPath)) {
    return { allDone: false, total: 0, done: 0, pending: ['tasks.md not found'] };
  }
  const tasks = parseTasks(tasksPath);
  if (!tasks || tasks.length === 0) {
    return { allDone: true, total: 0, done: 0, pending: [] };
  }
  const pending = tasks.filter(t => !t.isDone).map(t => t.description);
  return {
    allDone: pending.length === 0,
    total: tasks.length,
    done: tasks.length - pending.length,
    pending,
  };
}

/**
 * Strip TDD phase markers (`[phase:red]` etc.) from a task description.
 * apply writes the marker either right after the checkbox or as a
 * description suffix, so every occurrence is removed.
 */
function stripPhaseMarkers(text) {
  return String(text).replace(/\s*\[phase:\w+\]/g, '').trim();
}

/**
 * Stable identity for a task across TDD phases. Prefers the canonical
 * TASK-### id embedded in the description; falls back to the description
 * with phase markers stripped. Phase transitions rewrite tasks.md lines,
 * so the raw text differs between RED/GREEN/REFACTOR log entries and must
 * never be compared verbatim across phases.
 */
function taskKey(text) {
  const id = String(text).match(/TASK-\d+/);
  if (id) return id[0];
  return stripPhaseMarkers(text);
}

module.exports = {
  validateChangeName,
  ensureInsideDir,
  resolveChangeDir,
  findActiveChange,
  parseTasks,
  detectTestCommand,
  checkTasksCompletion,
  stripPhaseMarkers,
  taskKey,
};
