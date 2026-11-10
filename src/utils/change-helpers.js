/**
 * Change Helpers
 * Shared utilities for change management commands.
 * Consolidates duplicated functions from ff.js, issue.js, spec-generator.js, contract.js, graph-run.js.
 */

const path = require('path');
const { validateChangeName } = require('./change-utils');
const { resolveWorkspace } = require('./workspace-detector');

/**
 * Generate a timestamped change name.
 * @param {string} prefix - Prefix for the change name (e.g. 'ff', 'issue')
 * @returns {string}
 */
function generateChangeName(prefix = 'change') {
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${prefix}-${yyyy}${MM}${dd}-${HH}${mm}`;
}

/**
 * Convert a string to a safe filename (lowercase, hyphens, alphanumeric +
 * CJK ideographs).
 * CJK is preserved on purpose: task descriptions are frequently Chinese, and
 * stripping them sanitized whole descriptions to an empty filename, which
 * made `stdd spec` silently skip every such task (report finding P0-3).
 * @param {string} str
 * @returns {string}
 */
function toSafeFilename(str) {
  const safe = String(str || '')
    .toLowerCase()
    // \u3400-\u9fff covers CJK Extension A + the Unified block incl. newer
    // URO code points (bare \u4e00-\u9fa5 misses pre-Unicode-4.1 additions).
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '');
  // CJK is 3 bytes/char in UTF-8; cap so long descriptions cannot exceed
  // the 255-byte filename limit (ext4/APFS) and crash `stdd spec`.
  return safe.length > 60 ? safe.slice(0, 60).replace(/-+$/, '') : safe;
}

/**
 * Convert a string to title case.
 * @param {string} str
 * @returns {string}
 */
function toTitleCase(str) {
  return str
    .trim()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/ /g, '');
}

/**
 * Build workspace context metadata.
 * @param {object|null} workspace - Resolved workspace object
 * @returns {object|null} { name, path, tag } or null
 */
function workspaceContext(workspace) {
  if (!workspace) return null;
  const root = path.relative(process.cwd(), workspace.root).replace(/\\/g, '/') || workspace.name;
  return {
    name: workspace.name,
    path: root,
    tag: toSafeFilename(root),
  };
}

/**
 * Resolve a workspace selector string to a workspace context object.
 * @param {string} cwd - Current working directory
 * @param {string} [selector] - Workspace name or path
 * @returns {object|null} { name, path, tag } or null
 */
function resolveWorkspaceContext(cwd, selector) {
  if (!selector) return null;
  const workspace = resolveWorkspace(cwd, selector);
  if (!workspace) return null;
  return workspaceContext(workspace);
}

module.exports = {
  generateChangeName,
  toSafeFilename,
  toTitleCase,
  workspaceContext,
  resolveWorkspaceContext,
};
