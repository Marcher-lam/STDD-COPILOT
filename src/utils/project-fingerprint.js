/**
 * Project test fingerprint (终测复验 D02, stale-green).
 *
 * `stdd verify` records a hash of the project's test-relevant inputs
 * (package.json, stdd/config.yaml, conventional test directories, and
 * *.test/*.spec files under src/lib). `stdd archive` recomputes it and
 * refuses to archive on a mismatch, so a green verify cannot be reused
 * after the tests or test scripts were edited to fail.
 *
 * This is deliberately a bounded snapshot of the inputs verification
 * actually exercises — not a whole-project content address.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { walkFiles } = require('./file-walker');
const { createLogger } = require('./logger');

const logger = createLogger('project-fingerprint');

const ROOT_FILES = ['package.json', 'stdd/config.yaml'];
const TEST_DIRS = ['test', 'tests', '__tests__', 'spec', 'e2e'];
const SRC_DIRS = ['src', 'lib'];
const TEST_FILE_RE = /(\.test|\.spec)\.[cm]?[jt]sx?$/i;

function collectFingerprintFiles(cwd) {
  const files = [];
  for (const rel of ROOT_FILES) {
    const p = path.join(cwd, rel);
    if (fs.existsSync(p)) files.push(p);
  }
  for (const dir of TEST_DIRS) {
    const p = path.join(cwd, dir);
    if (fs.existsSync(p)) {
      files.push(...walkFiles(p, { predicate: f => /\.(js|ts|mjs|cjs|jsx|tsx)$/.test(f) }));
    }
  }
  for (const dir of SRC_DIRS) {
    const p = path.join(cwd, dir);
    if (fs.existsSync(p)) {
      files.push(...walkFiles(p, { predicate: f => TEST_FILE_RE.test(f) }));
    }
  }
  return files.sort();
}

/**
 * Compute the project test fingerprint.
 * @param {string} cwd - project root
 * @returns {string|null} hex digest, or null when nothing fingerprintable
 *   exists or the filesystem view is unavailable (the fingerprint is an
 *   integrity EXTRA — verify must never crash because of it; a null simply
 *   means the archive gate falls back to the mtime freshness check).
 */
function computeProjectTestFingerprint(cwd) {
  try {
    const files = collectFingerprintFiles(cwd);
    if (files.length === 0) return null;
    const hash = crypto.createHash('sha256');
    for (const file of files) {
      hash.update(file);
      try {
        hash.update(fs.readFileSync(file));
      } catch (err) {
        logger.warn(`${path.basename(file)}: ${err.message}`);
        hash.update('<unreadable>');
      }
    }
    return hash.digest('hex');
  } catch (err) {
    logger.warn(`project fingerprint unavailable: ${err.message}`);
    return null;
  }
}

module.exports = { computeProjectTestFingerprint, TEST_FILE_RE };
