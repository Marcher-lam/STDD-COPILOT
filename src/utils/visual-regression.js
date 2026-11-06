/**
 * Visual Regression Gate (frontend item 2)
 *
 * baseline/diff over screenshots: baselines live under
 * stdd/evidence/visual/baselines/, diffs are archived under
 * stdd/evidence/visual/diffs/. Comparison is strict hash equality — any byte
 * difference counts as a change (pixel-percentage comparison would need a
 * PNG decoder dependency; the strict gate is intentionally CI-safe).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function visualRoot(cwd) {
  return path.join(cwd, 'stdd', 'evidence', 'visual');
}

function baselinesDir(cwd) {
  return path.join(visualRoot(cwd), 'baselines');
}

function diffsDir(cwd) {
  return path.join(visualRoot(cwd), 'diffs');
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function safeName(name) {
  return String(name || '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
}

/**
 * Store a named baseline screenshot plus its manifest.
 * @returns {{name: string, hash: string, path: string}}
 */
function saveBaseline(cwd, name, buffer, meta = {}) {
  const dir = baselinesDir(cwd);
  fs.mkdirSync(dir, { recursive: true });
  const safe = safeName(name);
  const pngPath = path.join(dir, `${safe}.png`);
  fs.writeFileSync(pngPath, buffer);
  const hash = hashBuffer(buffer);
  fs.writeFileSync(path.join(dir, `${safe}.meta.json`), JSON.stringify({
    name: safe,
    hash,
    savedAt: new Date().toISOString(),
    ...meta,
  }, null, 2), 'utf8');
  return { name: safe, hash, path: pngPath };
}

/**
 * Compare a fresh capture against the named baseline.
 * @returns {{status: 'no-baseline'|'identical'|'changed', name: string,
 *            baselineHash: string|null, currentHash: string}}
 */
function compareWithBaseline(cwd, name, buffer) {
  const safe = safeName(name);
  const metaPath = path.join(baselinesDir(cwd), `${safe}.meta.json`);
  const currentHash = hashBuffer(buffer);
  if (!fs.existsSync(metaPath)) {
    return { status: 'no-baseline', name: safe, baselineHash: null, currentHash };
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  return {
    status: meta.hash === currentHash ? 'identical' : 'changed',
    name: safe,
    baselineHash: meta.hash,
    currentHash,
  };
}

/**
 * Archive a diff evidence pair (current png + json record).
 * @returns {{png: string, json: string}}
 */
function archiveDiff(cwd, name, buffer, comparison) {
  const dir = diffsDir(cwd);
  fs.mkdirSync(dir, { recursive: true });
  const safe = safeName(name);
  const ts = Date.now();
  const pngPath = path.join(dir, `${safe}-diff-${ts}.png`);
  const jsonPath = path.join(dir, `${safe}-diff-${ts}.json`);
  fs.writeFileSync(pngPath, buffer);
  fs.writeFileSync(jsonPath, JSON.stringify({
    name: safe,
    comparedAt: new Date().toISOString(),
    ...comparison,
  }, null, 2), 'utf8');
  return { png: pngPath, json: jsonPath };
}

module.exports = {
  visualRoot,
  baselinesDir,
  diffsDir,
  saveBaseline,
  compareWithBaseline,
  archiveDiff,
  hashBuffer,
  safeName,
};
