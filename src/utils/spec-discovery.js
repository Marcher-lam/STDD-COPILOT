/**
 * Shared spec-file discovery.
 *
 * Single source of truth for "which files count as specs": SpecGenerator
 * writes flat `*.feature` files, the spec command writes `<domain>/spec.md`
 * subdirectories, and validate already walks both extensions recursively.
 * status/recommend must agree with that rule or generated specs become
 * invisible (report finding P1-4).
 */

const { walkFiles } = require('./file-walker');

const SPEC_FILE_RE = /\.(feature|md)$/i;

/** Recursively find all spec files (.feature / .md) under a directory. */
function findSpecFiles(dir) {
  // specs/ is a curated STDD tree, not an arbitrary project tree: the
  // walker's build-artifact skip list (build/dist/reports/...) would prune
  // legitimate domain subdirectories like specs/build/spec.md and make
  // their specs invisible (OCR finding on the P1-4 fix).
  return walkFiles(dir, {
    predicate: file => SPEC_FILE_RE.test(file),
    skipDirs: new Set(['.git', 'node_modules']),
  });
}

/** Whether a directory tree contains at least one spec file. */
function hasSpecFiles(dir) {
  return findSpecFiles(dir).length > 0;
}

module.exports = { findSpecFiles, hasSpecFiles, SPEC_FILE_RE };
