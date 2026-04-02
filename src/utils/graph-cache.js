const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getPackageRoot } = require('./path-resolver');

class GraphCacheManager {
  constructor(projectId = 'default') {
    this.projectId = projectId;
    this.cacheDir = path.join(getPackageRoot(), 'stdd', 'graph', 'cache', this.projectId);
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
  
  clear() {
    if (fs.existsSync(this.cacheDir)) {
      fs.rmSync(this.cacheDir, { recursive: true, force: true });
    }
  }
}

module.exports = GraphCacheManager;
