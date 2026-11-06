/**
 * npm latest-version check for `stdd update` (round-4 audit item): the
 * command previously never contacted the registry. Pure comparison logic
 * lives here for testability; the network call shells out to npm and
 * degrades gracefully offline.
 */

const { spawnSync } = require('child_process');
const { createLogger } = require('./logger');
const logger = createLogger('version-check');

/**
 * Compare two semver-ish strings. Prerelease sorts before release.
 * @returns {-1|0|1}
 */
function compareVersions(a, b) {
  const parse = v => String(v || '')
    .replace(/^v/i, '')
    .split(/[-.]/)
    .map(part => (/^\d+$/.test(part) ? Number(part) : part));
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return y === undefined ? 0 : (typeof y === 'number' ? -1 : 1);
    // semver: at equal numeric prefix, the side WITH extra (prerelease)
    // segments sorts first — 2.0.0-rc.1 < 2.0.0.
    if (y === undefined) return typeof x === 'number' ? 1 : -1;
    const xn = typeof x === 'number';
    const yn = typeof y === 'number';
    if (xn && yn) {
      if (x !== y) return x < y ? -1 : 1;
    } else if (xn !== yn) {
      // semver: numeric identifiers sort BELOW alphanumeric prerelease labels
      return xn ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

const PACKAGE = require('../../package.json').name;

/**
 * Query the npm registry for the latest published version.
 * @returns {{latest: string|null, reachable: boolean}}
 */
function fetchLatestVersion() {
  try {
    const result = spawnSync('npm', ['view', PACKAGE, 'version', '--json'], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: 'pipe',
      shell: process.platform === 'win32', // npm is npm.cmd on Windows
    });
    if (result.error) logger.warn(`npm view failed to spawn: ${result.error.message}`);
    if (result.status !== 0 || !result.stdout) {
      return { latest: null, reachable: false };
    }
    const latest = String(result.stdout).trim().replace(/^"|"$/g, '');
    return { latest: /^\d/.test(latest) ? latest : null, reachable: Boolean(latest) };
  } catch (err) {
    logger.warn(`version check failed: ${err.message}`);
    return { latest: null, reachable: false };
  }
}

module.exports = { compareVersions, fetchLatestVersion, PACKAGE };
