/**
 * Depcheck Command
 * Scans for unused dependencies and missing dependencies in package.json.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('depcheck');
const { resolveWorkspace, detectWorkspaces } = require('../../utils/workspace-detector');
const { mergePackageDeps } = require('../../utils/tech-stack-detector');

const DEFAULT_SAFE_LIST = [
  'eslint', 'eslint-config-*', 'eslint-plugin-*', '@eslint/*',
  'prettier', 'prettier-plugin-*',
  'typescript', 'tslib', 'ts-node', '@types/*',
  'jest', 'jest-*', '@jest/*', 'ts-jest',
  'mocha', 'chai', 'sinon', 'supertest',
  'vitest', '@vitest/*',
  'webpack', 'webpack-*', 'webpack-cli',
  'vite', '@vitejs/*',
  'rollup', '@rollup/*', 'rollup-plugin-*',
  'babel-*', '@babel/*',
  'nyc', 'c8', 'istanbul-*',
  'husky', 'lint-staged',
  'nodemon',
  'rimraf', 'del', 'fs-extra',
  'copyfiles', 'cpy',
  'cross-env',
  'dotenv', 'dotenv-*',
  'npm-run-all', 'concurrently', 'wait-on',
  'stdd-copilot', '@marcher-lam/stdd-copilot', 'stdd',
  'playwright',
];

function isSafeListed(pkgName) {
  return DEFAULT_SAFE_LIST.some(pattern => {
    if (pattern.endsWith('/*')) {
      return pkgName.startsWith(pattern.slice(0, -1));
    }
    if (pattern.endsWith('-*')) {
      return pkgName.startsWith(pattern.slice(0, -2) + '-');
    }
    return pkgName === pattern;
  });
}

class DepcheckCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * 终测复验 D10: the registry wires `depcheck [path]` positionally, so the
   * first argument arrives as the path string — normalize (path, options)
   * vs (options) callers. --json must also be real JSON on stdout with the
   * same exit-code semantics as the text mode.
   */
  async execute(pathArg, maybeOptions = {}) {
    const options = (pathArg && typeof pathArg === 'object' && !Array.isArray(pathArg))
      ? pathArg
      : maybeOptions;
    const pathValue = (pathArg && typeof pathArg === 'string') ? pathArg : options.path;

    const targetPath = pathValue ? path.resolve(this.cwd, pathValue) : this.cwd;
    const extraSafeList = options.safeList
      ? options.safeList.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const safeList = [...new Set([...extraSafeList])];

    let results;
    if (options.workspace) {
      results = this._checkWorkspace(options.workspace, safeList);
    } else {
      results = this._checkDirectory(targetPath, safeList);
    }

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      this._saveEvidence(results);
      if (results.unused && results.unused.length > 0) {
        process.exitCode = 1;
      }
      return results;
    }

    this._printResults(results);
    this._saveEvidence(results);

    if (results.unused.length > 0) {
      process.exitCode = 1;
    }

    return results;
  }

  _checkWorkspace(workspaceName, extraSafeList) {
    const workspace = resolveWorkspace(this.cwd, workspaceName);
    if (!workspace) {
      const workspaces = detectWorkspaces(this.cwd);
      const byName = workspaces.find(w => w.name === workspaceName);
      if (!byName) {
        return {
          directory: this.cwd,
          workspace: workspaceName,
          unused: [],
          missing: [],
          safeListed: extraSafeList,
          error: `Workspace '${workspaceName}' not found`,
        };
      }
      return this._checkDirectory(byName.root, extraSafeList);
    }
    return this._checkDirectory(workspace.root, extraSafeList);
  }

  _checkDirectory(dir, extraSafeList) {
    const pkgJsonPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      return {
        directory: dir,
        workspace: null,
        unused: [],
        missing: [],
        safeListed: extraSafeList,
        error: `No package.json found at ${dir}`,
      };
    }

    const pkg = this._readJson(pkgJsonPath);
    const allDeps = mergePackageDeps(pkg);
    const depNames = Object.keys(allDeps);

    if (depNames.length === 0) {
      return { directory: dir, workspace: null, unused: [], missing: [], safeListed: extraSafeList };
    }

    const usedDeps = this._findUsedDependencies(dir);
    const depModuleNames = new Map();

    for (const depName of depNames) {
      const moduleNames = this._resolveModuleNames(depName, path.join(dir, 'node_modules'));
      moduleNames.forEach(m => depModuleNames.set(m, depName));
    }

    const unused = [];
    const accountedDeps = new Set();

    for (const usedName of usedDeps) {
      const pkgName = depModuleNames.get(usedName);
      if (pkgName) {
        accountedDeps.add(pkgName);
      }
      accountedDeps.add(usedName);
    }

    for (const depName of depNames) {
      if (accountedDeps.has(depName)) continue;
      if (isSafeListed(depName)) continue;
      if (extraSafeList.includes(depName)) continue;
      unused.push(depName);
    }

    const missing = [];
    for (const usedName of usedDeps) {
      if (!allDeps[usedName] && !this._isBuiltinModule(usedName)) {
        if (isSafeListed(usedName)) continue;
        const parentDep = depModuleNames.get(usedName);
        if (!parentDep) {
          missing.push(usedName);
        }
      }
    }

    const uniqueUnused = [...new Set(unused)].sort();
    const uniqueMissing = [...new Set(missing)].sort();

    return {
      directory: dir,
      workspace: null,
      unused: uniqueUnused,
      missing: uniqueMissing,
      safeListed: extraSafeList,
      totalDeps: depNames.length,
      usedDeps: accountedDeps.size,
    };
  }

  _readJson(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      logger.warn(err.message);
      return {};
    }
  }

  _findUsedDependencies(dir) {
    const usedPackages = new Set();
    const srcDir = path.join(dir, 'src');
    const scanDirs = fs.existsSync(srcDir) ? [srcDir] : [dir];

    // Also scan root-level JS files (e.g. cli.js)
    for (const entry of fs.readdirSync(dir).filter(f => /\.m?js$/.test(f))) {
      this._extractImports(path.join(dir, entry), usedPackages);
    }

    for (const scanDir of scanDirs) {
      this._scanDirForImports(scanDir, usedPackages);
    }

    return [...usedPackages];
  }

  _scanDirForImports(dir, usedPackages) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          this._scanDirForImports(fullPath, usedPackages);
        }
      } else if (entry.isFile()) {
        if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) {
          this._extractImports(fullPath, usedPackages);
        }
      }
    }
  }

  _extractImports(filePath, usedPackages) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Remove template literal content to avoid false matches on generated code
      const stripped = content.replace(/`[^`]*`/gs, '""');

      const importPatterns = [
        /(?:import\s+(?:(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*from\s+)?['"]([^'"]+)['"])/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      ];

      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(stripped)) !== null) {
          const mod = match[1];
          if (!mod.startsWith('.') && !mod.startsWith('/')) {
            const pkgName = this._extractPackageName(mod);
            if (pkgName) {
              usedPackages.add(pkgName);
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`${path.basename(filePath)}: ${err.message}`);
    }
  }

  _extractPackageName(modPath) {
    if (modPath.startsWith('@')) {
      const parts = modPath.split('/');
      if (parts.length >= 2) {
        return parts[0] + '/' + parts[1];
      }
      return modPath;
    }
    return modPath.split('/')[0];
  }

  _resolveModuleNames(depName, nodeModulesPath) {
    const moduleNames = [depName];
    const depPath = path.join(nodeModulesPath, depName);
    const pkgPath = path.join(depPath, 'package.json');

    if (fs.existsSync(pkgPath)) {
      try {
        const depPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (depPkg.module) {
          moduleNames.push(depPkg.module);
        }
        if (depPkg.main && depPkg.main !== depName) {
          moduleNames.push(depPkg.main);
        }
        const exports = depPkg.exports;
        if (typeof exports === 'object' && !Array.isArray(exports)) {
          Object.keys(exports).forEach(k => {
            if (!k.startsWith('.')) moduleNames.push(k);
          });
        }
      } catch (err) {
        logger.warn(`${path.basename(depName)}: ${err.message}`);
      }
    }

    if (fs.existsSync(depPath)) {
      try {
        const entries = fs.readdirSync(depPath);
        entries
          .filter(e => e.endsWith('.js') || e.endsWith('.mjs') || e.endsWith('.cjs'))
          .forEach(e => moduleNames.push(path.join(depName, e)));
      } catch (err) {
        logger.warn(`${path.basename(depPath)}: ${err.message}`);
      }
    }

    return [...new Set(moduleNames)];
  }

  _isBuiltinModule(modName) {
    // Node builtin modules can be imported with or without the 'node:'
    // prefix — 'node:fs' was previously reported as a missing dependency
    // (终测复验 D09/U077).
    const bare = String(modName).replace(/^node:/, '');
    const builtins = new Set([
      'fs', 'path', 'os', 'crypto', 'http', 'https',
      'url', 'util', 'stream', 'events', 'buffer',
      'child_process', 'cluster', 'dgram', 'dns', 'domain',
      'net', 'readline', 'repl', 'tls', 'tty',
      'v8', 'vm', 'zlib', 'assert', 'console',
      'constants', 'module', 'process', 'querystring',
      'string_decoder', 'timers', 'worker_threads',
      'perf_hooks', 'async_hooks', 'inspector',
      'test', 'diagnostics_channel', 'trace_events',
    ]);
    return builtins.has(bare);
  }

  _saveEvidence(results) {
    const stddDir = path.join(this.cwd, 'stdd');
    if (!fs.existsSync(stddDir)) return;

    const evidenceDir = path.join(stddDir, 'evidence');
    if (!fs.existsSync(evidenceDir)) {
      try {
        fs.mkdirSync(evidenceDir, { recursive: true });
      } catch (err) {
        logger.warn(err.message);
        return;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const evidencePath = path.join(evidenceDir, `depcheck-${timestamp}.json`);

    const evidence = {
      type: 'depcheck',
      timestamp: new Date().toISOString(),
      data: results,
    };

    try {
      fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    } catch (err) {
      logger.warn(err.message);
    }
  }

  _printResults(results) {
    if (results.error) {
      console.log(chalk.yellow(`Depcheck: ${results.error}`));
      return;
    }

    console.log(chalk.bold('\n📦 Dependency Check Results\n'));

    console.log(`Directory: ${chalk.cyan(results.directory)}`);
    if (results.totalDeps !== undefined) {
      console.log(`Total dependencies: ${results.totalDeps}`);
    }
    console.log('');

    if (results.unused.length > 0) {
      console.log(chalk.yellow.bold('Unused dependencies:'));
      results.unused.forEach(pkg => {
        console.log(`  - ${chalk.yellow(pkg)}`);
      });
      console.log('');
    } else {
      console.log(chalk.green('No unused dependencies found.'));
      console.log('');
    }

    if (results.missing.length > 0) {
      console.log(chalk.red.bold('Missing dependencies (used but not in package.json):'));
      results.missing.forEach(pkg => {
        console.log(`  - ${chalk.red(pkg)}`);
      });
      console.log('');
    } else {
      console.log(chalk.green('No missing dependencies found.'));
      console.log('');
    }

    if (results.unused.length === 0 && results.missing.length === 0) {
      console.log(chalk.green('All dependencies accounted for.'));
    }
  }
}

module.exports = { DepcheckCommand, isSafeListed, DEFAULT_SAFE_LIST };
