/**
 * Changed-file scoping (过程审计 A-4).
 *
 * apply records `baseline_commit` in the change's .state.yaml on first run.
 * This helper diffs that commit against the current worktree so gates can
 * answer "is THIS change clean?" instead of re-litigating the whole
 * repository's pre-existing debt on every verify.
 *
 * Returns null when scoping is unavailable (no git / no baseline commit /
 * git failure) — callers must fall back to whole-repo behavior, never
 * silently widen or narrow the scope on error.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CI_CONFIG_PATHS = new Set([
  '.gitlab-ci.yml',
  'Jenkinsfile',
  '.circleci/config.yml',
]);

function isCiConfigPath(relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/');
  if (CI_CONFIG_PATHS.has(normalized)) return true;
  return /^\.github\/workflows\//.test(normalized);
}

/**
 * Read the change's recorded baseline commit (.state.yaml).
 * @returns {string|null}
 */
function readBaselineCommit(changeDir) {
  try {
    const statePath = path.join(changeDir, '.state.yaml');
    if (!fs.existsSync(statePath)) return null;
    const match = fs.readFileSync(statePath, 'utf8').match(/^baseline_commit:\s*"?([0-9a-f]{7,40})"?/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe', timeout: 15000 });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout || '');
}

/**
 * Repo-relative list of files changed since the change's baseline commit
 * (committed + uncommitted + untracked), or null when unavailable.
 *
 * @param {string} cwd - project root
 * @param {string} changeDir - the active change directory
 * @returns {string[]|null}
 */
function getChangedFiles(cwd, changeDir) {
  const baseline = readBaselineCommit(changeDir);
  if (!baseline) return null;

  const committed = git(cwd, ['diff', '--name-only', `${baseline}...HEAD`]);
  if (committed === null) return null;
  const workingTree = git(cwd, ['status', '--porcelain']);
  if (workingTree === null) return null;

  const files = new Set();
  committed.split('\n').filter(Boolean).forEach(f => files.add(f));

  // porcelain lines: `XY <path>` (or `XY <old> -> <new>` for renames).
  for (const line of workingTree.split('\n')) {
    if (!line.trim()) continue;
    const rename = line.match(/^..\s+.* -> (.+)$/);
    const target = rename ? rename[1] : line.slice(3);
    if (target) files.add(target.trim());
  }

  if (files.size === 0) return [];
  return Array.from(files);
}

/**
 * Whether a repo-relative path is inside the changed set (scoped audit).
 * Paths outside the change (baseline debt) are not this change's fault.
 */
function isInChangedSet(changedFiles, absPath, cwd) {
  if (!changedFiles) return true; // no scope → whole repo (legacy behavior)
  const rel = path.relative(cwd, absPath).replace(/\\/g, '/');
  return changedFiles.includes(rel);
}

module.exports = { getChangedFiles, isInChangedSet, isCiConfigPath, readBaselineCommit };
