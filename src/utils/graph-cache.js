const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getPackageRoot } = require('./path-resolver');
const { createLogger } = require('./logger');
const logger = createLogger('graph-cache');

class GraphCacheManager {
  /**
   * @param {string} projectId - Cache namespace (e.g. the change name).
   * @param {string} [cacheRoot] - Project-local cache root. When omitted the
   *   package root is used (legacy behavior); graph run passes the project's
   *   stdd/graph/cache so checkpoints never leak across projects.
   */
  constructor(projectId = 'default', cacheRoot) {
    this.projectId = projectId;
    this.cacheDir = cacheRoot
      ? path.join(cacheRoot, this.projectId)
      : path.join(getPackageRoot(), 'stdd', 'graph', 'cache', this.projectId);
    this._ensureCacheDir();
  }

  _ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  _generateHash(nodeName, inputs) {
    const data = JSON.stringify({ nodeName, inputs });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  has(nodeName, inputs) {
    const hash = this._generateHash(nodeName, inputs);
    const cacheFile = path.join(this.cacheDir, `${hash}.json`);
    return fs.existsSync(cacheFile);
  }

  get(nodeName, inputs) {
    const hash = this._generateHash(nodeName, inputs);
    const cacheFile = path.join(this.cacheDir, `${hash}.json`);
    if (fs.existsSync(cacheFile)) {
      try {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  set(nodeName, inputs, outputs) {
    this._ensureCacheDir();
    const hash = this._generateHash(nodeName, inputs);
    const cacheFile = path.join(this.cacheDir, `${hash}.json`);
    fs.writeFileSync(cacheFile, JSON.stringify({
      timestamp: Date.now(),
      nodeName,
      inputsHash: hash,
      outputs
    }, null, 2));
  }

  deleteByNode(nodeName) {
    if (!fs.existsSync(this.cacheDir)) return;
    const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.cacheDir, file), 'utf8'));
        if (data.nodeName === nodeName) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      } catch (err) {
        if (err.code !== 'ENOENT' && err.code !== 'EACCES') logger.warn(err.message);
        // corrupt entry, remove it
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    }
  }

  clear() {
    if (fs.existsSync(this.cacheDir)) {
      fs.rmSync(this.cacheDir, { recursive: true, force: true });
    }
  }
}

module.exports = GraphCacheManager;
