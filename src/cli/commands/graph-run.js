/**
 * Graph Run Command
 * Executes STDD workflow steps based on DAG graph topology.
 */

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { createLogger } = require('../../utils/logger');
const logger = createLogger('graph-run');
const DynamicGraphRouter = require('../../utils/dynamic-router');
const { getPackageRoot } = require('../../utils/path-resolver');
const { walkFiles } = require('../../utils/file-walker');
const { validateChangeName } = require('../../utils/change-utils');
const GraphCacheManager = require('../../utils/graph-cache');
const { resolveRigor, rigorNodeOptions } = require('../../utils/rigor');
const ErrorPropagator = require('../../utils/error-propagator');
const { parseCommand, runCommand: runParsedCommand } = require('../../utils/command-runner');
const { FFCommand } = require('./ff');
const { generateChangeName: _genChangeName } = require('../../utils/change-helpers');
const { SpecGenerator } = require('./spec-generator');
const { ApplyCommand } = require('./apply');
const { DELEGATION_ENGINES } = require('../../utils/delegation');
const { VerifyCommand } = require('./verify');
const { ArchiveCommand } = require('./archive');
const { FixPacketCommand } = require('./fix-packet');
const { OutsideInCommand } = require('./outside-in');
const { resolveWorkspace } = require('../../utils/workspace-detector');

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function globPatternToRegex(pattern) {
  const normalized = toPosixPath(pattern).replace(/^\.\//, '');
  let source = '^';
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];
    if (char === '*' && next === '*') {
      const after = normalized[i + 2];
      if (after === '/') {
        source += '(?:.*\/)?';
        i += 2;
      } else {
        source += '.*';
        i += 1;
      }
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(source + '$');
}

function getValueAtPath(data, jsonPath) {
  const normalized = String(jsonPath || '').trim().replace(/^\$\.?/, '');
  if (!normalized) return data;
  const parts = normalized.match(/[^.[\]]+|\[(\d+)\]/g) || [];
  let current = data;
  for (const rawPart of parts) {
    const part = rawPart.startsWith('[') ? rawPart.slice(1, -1) : rawPart;
    if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(Object(current), part)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function compareValues(actual, operator, expected) {
  switch (operator || 'exists') {
    case 'exists': return actual !== undefined && actual !== null;
    case 'equals': return String(actual) === String(expected);
    case 'not_equals': return String(actual) !== String(expected);
    case 'contains': return String(actual).includes(String(expected));
    case 'matches': return new RegExp(String(expected)).test(String(actual));
    case 'greater_than': return Number(actual) > Number(expected);
    case 'less_than': return Number(actual) < Number(expected);
    case 'greater_or_equal': return Number(actual) >= Number(expected);
    case 'less_or_equal': return Number(actual) <= Number(expected);
    default: return false;
  }
}

const ALLOWED_CONDITION_COMMANDS = new Set(['npm', 'git', 'node', 'npx', 'yarn', 'pnpm']);

// Nodes safe to auto-retry: read-only / idempotent. Side-effect nodes
// (propose/spec/apply/issue/archive/commit) write artifacts or code and are
// NOT blindly re-run — a deterministic failure re-executing them can
// double-apply work.
const READONLY_NODES = new Set([
  'stdd-verify', 'stdd-fix-packet', 'stdd-type-check', 'stdd-explore', 'stdd-brainstorm',
]);

const NODE_COMMAND_MAP = {
  'stdd-propose': 'propose',
  'stdd-spec': 'spec',
  'stdd-plan': 'plan',
  'stdd-outside-in': 'outside-in',
  'stdd-apply': 'apply',
  'stdd-fix-packet': 'fix-packet',
  'stdd-verify': 'verify',
  'stdd-issue': 'issue',
  'stdd-archive': 'archive',
  'stdd-commit': 'commit',
  'stdd-explore': 'explore',
  'stdd-brainstorm': 'brainstorm',
  'stdd-final-doc': 'final-doc',
  'stdd-init': 'init',
};

class GraphRunCommand {
  constructor(spinner) {
    this.spinner = spinner;
    this.result = { steps: [], changeName: null, failedAt: null };
  }

  _topologicalOrder(graph) {
    const nodes = Object.keys(graph.skills || {});
    const ordered = [];
    const visited = new Set();

    function visit(node) {
      if (visited.has(node)) return;
      visited.add(node);
      const deps = graph.skills[node]?.depends_on || [];
      for (const dep of deps) {
        if (graph.skills[dep]) {
          visit(dep);
        }
      }
      ordered.push(node);
    }

    for (const node of nodes) {
      visit(node);
    }

    return ordered;
  }

  /**
   * Kahn topological layering: nodes in the same layer are mutually
   * independent and can run concurrently.
   */
  _topologicalLayers(graph) {
    const nodes = Object.keys(graph.skills || {});
    const indegree = new Map(nodes.map(n => [n, 0]));
    for (const node of nodes) {
      for (const dep of graph.skills[node].depends_on || []) {
        if (graph.skills[dep]) indegree.set(node, indegree.get(node) + 1);
      }
    }
    const layers = [];
    let frontier = nodes.filter(n => indegree.get(n) === 0);
    while (frontier.length > 0) {
      layers.push(frontier);
      const next = [];
      for (const node of frontier) {
        for (const dep of nodes) {
          if ((graph.skills[dep].depends_on || []).includes(node)) {
            indegree.set(dep, indegree.get(dep) - 1);
            if (indegree.get(dep) === 0) next.push(dep);
          }
        }
      }
      frontier = next;
    }
    return layers;
  }

  _maxParallel(graph) {
    const configured = graph && graph.config && graph.config.max_parallel;
    return Number.isFinite(configured) && configured > 0 ? configured : 4;
  }

  /**
   * Per-node options snapshot: rigor injection is applied to a COPY so
   * concurrent nodes in the same layer never race on shared option objects.
   */
  _nodeOptions(options, nodeName, rigor) {
    const rigorOptions = rigorNodeOptions(nodeName, rigor);
    const nodeOpts = { ...options };
    if (nodeName === 'stdd-verify') {
      nodeOpts.verifyOptions = { ...rigorOptions, ...(options.verifyOptions || {}) };
    } else if (nodeName === 'stdd-archive') {
      nodeOpts.archiveOptions = { ...rigorOptions, ...(options.archiveOptions || {}) };
    }
    return nodeOpts;
  }

  async _executeNode(nodeName, changeName, options = {}) {
    const silentSpinner = {
      text: '', start() {}, stop() {}, succeed() {}, fail() {},
    };

    switch (nodeName) {
      case 'stdd-propose': {
        if (!options.description) {
          const now = new Date();
          const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
          options.description = `graph-run-${ts}`;
        }
        const ff = new FFCommand(silentSpinner);
        await ff.execute(options.description, { changeName, ...(options.proposeOptions || {}) });
        return { status: 'success', node: nodeName };
      }

      case 'stdd-spec': {
        const generator = new SpecGenerator();
        const result = await generator.generateFromTasks(changeName);
        return { status: 'success', node: nodeName, detail: result };
      }

      case 'stdd-plan':
        return { status: 'success', node: nodeName, detail: 'plan step merged with propose/spec' };

      case 'stdd-outside-in': {
        const outsideIn = new OutsideInCommand(process.cwd());
        const registryPath = path.join(process.cwd(), 'stdd', 'tdd-registry.yaml');
        if (!fs.existsSync(registryPath)) {
          outsideIn.execute('init', undefined, { json: false });
        }
        const result = outsideIn.execute('scaffold', changeName, {
          feature: options.feature || changeName,
          json: false,
        });
        return { status: 'success', node: nodeName, detail: result };
      }

      case 'stdd-apply': {
        if (options.skipApply) {
          console.log(chalk.dim(`  [Skipping: ${nodeName}] (--skip-apply)`));
          return { status: 'skipped', node: nodeName, workspace: options.workspaceContext };
        }
        const apply = new ApplyCommand();
        await apply.execute(changeName, { ...(options.applyOptions || {}), workspace: options.workspace });
        return { status: 'success', node: nodeName, workspace: options.workspaceContext };
      }

      case 'stdd-fix-packet': {
        const packet = new FixPacketCommand(process.cwd()).execute(changeName, {
          testCommand: options.applyOptions && options.applyOptions.testCommand,
          silent: true,
        });
        return { status: 'success', node: nodeName, detail: { output: packet.output, jsonOutput: packet.jsonOutput } };
      }

      case 'stdd-verify': {
        if (options.skipApply) {
          console.log(chalk.dim(`  [Skipping: ${nodeName}] (--skip-apply implied)`));
          return { status: 'skipped', node: nodeName, workspace: options.workspaceContext };
        }
        const verify = new VerifyCommand();
        await verify.execute(changeName, { ...(options.verifyOptions || {}), workspace: options.workspace });
        return { status: 'success', node: nodeName, workspace: options.workspaceContext };
      }

      case 'stdd-issue': {
        const { IssueCommand } = require('./issue');
        const issueDesc = options.description || changeName;
        await new IssueCommand(silentSpinner).execute(issueDesc, options);
        return { status: 'success', node: nodeName };
      }
      case 'stdd-archive': {
        const archive = new ArchiveCommand();
        await archive.execute(changeName, options.archiveOptions || {});
        return { status: 'success', node: nodeName };
      }

      case 'stdd-commit': {
        const cwd = process.cwd();
        try {
          const { stdout: diffStdout } = await execAsync('git diff --cached --stat', { cwd });
          if (!diffStdout.trim()) {
            await execAsync('git add -A', { cwd });
          }
          const msg = `stdd: complete graph run for ${changeName}`;
          await execAsync(`git commit -m ${JSON.stringify(msg)} --allow-empty`, { cwd });
          return { status: 'success', node: nodeName, detail: msg };
        } catch (err) {
          return { status: 'success', node: nodeName, detail: `commit skipped: ${err.message}` };
        }
      }

      case 'stdd-type-check': {
        try {
          const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
            cwd: process.cwd(),
            timeout: 120000,
          });
          if (stderr && !stdout) {
            return { status: 'success', node: nodeName, detail: stderr.trim() };
          }
          return { status: 'success', node: nodeName, detail: stdout ? stdout.trim() : 'No type errors' };
        } catch (err) {
          throw new Error(`Type check failed: ${err.message}`);
        }
      }

      case 'stdd-explore': {
        const { ExploreCommand } = require('./explore');
        const explore = new ExploreCommand();
        await explore.execute('project', { output: null, json: false });
        return { status: 'success', node: nodeName };
      }

      case 'stdd-brainstorm': {
        const { ElicitationCommand } = require('./elicitation');
        const brainstorm = new ElicitationCommand();
        const topic = options.description || changeName;
        await brainstorm.execute(topic, { method: 'first-principles', list: false, json: false });
        return { status: 'success', node: nodeName };
      }

      case 'stdd-final-doc': {
        const docPath = path.join(process.cwd(), 'stdd', 'changes', changeName, 'FINAL-DOC.md');
        const heading = `# Final Documentation: ${changeName}\n\nGenerated by graph run.\n`;
        fs.mkdirSync(path.dirname(docPath), { recursive: true });
        fs.writeFileSync(docPath, heading, 'utf8');
        console.log(chalk.green(`    Final doc written: ${path.relative(process.cwd(), docPath)}`));
        return { status: 'success', node: nodeName };
      }

      case 'stdd-init': {
        const { InitCommand } = require('./init');
        const init = new InitCommand();
        await init.execute(process.cwd(), { force: false, skipSkills: false, yes: true });
        return { status: 'success', node: nodeName };
      }

      default:
        return { status: 'unknown', node: nodeName };
    }
  }

  /**
   * D1: resolve the rigor level for a run. Explicit --rigor wins over the
   * intent default; invalid explicit values are rejected loudly.
   */
  _resolveRigor(intent, options = {}) {
    return resolveRigor({ explicit: options.rigor, intent }).level;
  }

  /**
   * D1: per-node gate scaling (delegates to the shared rigor util — the
   * same semantics apply to the plain CLI workflow via change state).
   */
  _rigorNodeOptions(nodeName, rigor) {
    return rigorNodeOptions(nodeName, rigor);
  }

  /**
   * D2: execute a node with bounded retries (superpowers fix-loop).
   * Returns the result annotated with the attempt count; the final error
   * carries the attempt count for the delegation guidance.
   */
  async _executeNodeWithRetry(nodeName, changeName, options = {}) {
    const maxAttempts = 1 + Math.max(0, Number.parseInt(options.retry, 10) || 0);
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this._executeNode(nodeName, changeName, options);
        return { ...result, attempts: attempt };
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          console.log(chalk.yellow(`    ↻ retry ${attempt}/${maxAttempts - 1} after: ${error.message}`));
        }
      }
    }
    lastError.attempts = maxAttempts;
    throw lastError;
  }

  async execute(intent = 'feature', options = {}) {
    const cwd = process.cwd();
    const stddDir = path.join(cwd, 'stdd');
    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    let router;
    try {
      router = new DynamicGraphRouter();
    } catch (error) {
      throw new Error(`Failed to initialize graph router: ${error.message}`);
    }

    const rigor = this._resolveRigor(intent, options);
    options.rigor = rigor;
    this.result.rigor = rigor;

    const graph = router.compile(intent);
    this._applyConditions(graph);
    const nodes = this._topologicalOrder(graph);
    const layers = this._topologicalLayers(graph);

    if (nodes.length === 0) {
      throw new Error(`No nodes found for intent '${intent}'.`);
    }

    const changeName = options.changeName || this._generateChangeName(intent);
    validateChangeName(changeName); // rejects path separators / '..' before any fs write
    options.changeName = changeName;
    this.result.changeName = changeName;

    // D3: project-local checkpoint cache keyed by change+intent+rigor so a
    // failed run can resume from the last successful node on re-run.
    const cache = options.noCache
      ? null
      : new GraphCacheManager(changeName, path.join(stddDir, 'graph', 'cache'));
    const cacheInputs = {
      change: changeName,
      intent,
      rigor,
      skipApply: Boolean(options.skipApply),
      workspace: options.workspaceContext ? options.workspaceContext.name : null,
    };

    if (options.workspace) {
      const workspace = resolveWorkspace(process.cwd(), options.workspace);
      if (!workspace) {
        throw new Error(`Workspace '${options.workspace}' not found.`);
      }
      options.workspace = workspace;
      options.workspaceContext = {
        name: workspace.name,
        path: path.relative(process.cwd(), workspace.root).replace(/\\/g, '/') || workspace.name,
        sourceDir: path.relative(process.cwd(), workspace.sourceDir).replace(/\\/g, '/'),
      };
      this.result.workspace = options.workspaceContext;
    }

    console.log(chalk.bold(`\n🚀 Graph Run: ${chalk.cyan(graph.name)}`));
    console.log(chalk.dim(`  Intent: ${intent} | Change: ${changeName} | Rigor: ${rigor}`));
    if (options.workspaceContext) {
      console.log(chalk.dim(`  Workspace: ${options.workspaceContext.name} (${options.workspaceContext.path})`));
    }
    console.log(chalk.dim(`  Steps: ${nodes.length} in ${layers.length} layer(s)\n`));

    const runNode = async (nodeName, layerIndex) => {
      const label = NODE_COMMAND_MAP[nodeName] || nodeName;

      // D3: checkpoint resume — skip nodes that already succeeded for this
      // change+intent+rigor combination.
      const cached = cache ? cache.get(nodeName, cacheInputs) : null;
      if (cached) {
        this.result.steps.push({ node: nodeName, command: label, status: 'cached', cachedAt: cached.timestamp, layer: layerIndex });
        console.log(chalk.dim(`  [Cached: ${label}] ⊘ skipped (previous run succeeded)`));
        return { ok: true };
      }

      const nodeOptions = this._nodeOptions(options, nodeName, rigor);
      // D3 retry safety: only read-only nodes auto-retry.
      const effectiveRetry = READONLY_NODES.has(nodeName) ? nodeOptions.retry : 0;

      try {
        const exitCodeBefore = process.exitCode;
        const result = await this._executeNodeWithRetry(nodeName, changeName, { ...nodeOptions, retry: effectiveRetry });
        if (READONLY_NODES.has(nodeName) === false && Number(nodeOptions.retry) > 0) {
          result.retrySkipped = true;
        }
        // verify/archive report gate failures via process.exitCode = 1 without
        // throwing — a node that set it must be treated as failed, never
        // checkpointed. (In parallel layers this check is best-effort: a
        // sibling setting exitCode can be mis-attributed to a resolving node.)
        if (process.exitCode === 1 && exitCodeBefore !== 1) {
          throw new Error(`${label} reported failure (exit code 1)`);
        }
        this.result.steps.push({ node: nodeName, command: label, layer: layerIndex, ...result });

        if (result.status === 'success') {
          console.log(chalk.green(`    ✓ ${label} completed`));
          if (cache) cache.set(nodeName, cacheInputs, { status: result.status });
        } else if (result.status === 'skipped') {
          // A skip (e.g. --skip-apply) is not a completed checkpoint.
          console.log(chalk.dim(`    ⊘ ${label} skipped`));
        } else {
          console.log(chalk.yellow(`    ? ${label} unknown`));
        }
        return { ok: true };
      } catch (error) {
        const attempts = error.attempts || 1;
        // Error propagation: locate the upstream re-planning decision point.
        let propagation = null;
        try {
          const propagated = new ErrorPropagator(graph, cache).propagate(nodeName, error, { change: changeName });
          propagation = {
            decisionPoint: propagated.targetNode || nodeName,
            hops: propagated.hops || 0,
            message: propagated.message,
            affectedNodes: propagated.affectedNodes,
          };
        } catch (err) {
          logger.warn(`Error propagation skipped: ${err.message}`);
        }
        this.result.steps.push({
          node: nodeName,
          command: label,
          layer: layerIndex,
          status: 'failed',
          error: error.message,
          attempts,
          retrySkipped: !READONLY_NODES.has(nodeName) && Number(options.retry) > 0 ? true : undefined,
          propagation,
          delegation: {
            trigger: 'graph-node-failure',
            reason: `Node '${nodeName}' failed after ${attempts} attempt(s); request a fresh engine/role with the fix packet before retrying.`,
            suggestedEngines: [...DELEGATION_ENGINES],
          },
        });
        console.log(chalk.red(`    ✗ ${label} failed (${attempts} attempt(s)): ${error.message}`));
        if (propagation) {
          console.log(chalk.yellow(`    ↩ re-plan at decision point: ${propagation.decisionPoint}`));
        }
        return { ok: false, node: nodeName };
      }
    };

    let failed = null;
    for (let layerIndex = 0; layerIndex < layers.length && !failed; layerIndex++) {
      const layer = layers[layerIndex];
      const parallel = !options.sequential && layer.length > 1;
      console.log(chalk.dim(`  Layer ${layerIndex + 1}/${layers.length}: ${layer.map(n => NODE_COMMAND_MAP[n] || n).join(', ')}`));

      if (!parallel) {
        for (const nodeName of layer) {
          const outcome = await runNode(nodeName, layerIndex);
          if (!outcome.ok) { failed = outcome; break; }
        }
      } else {
        // Same-layer nodes are mutually independent: run concurrently,
        // bounded by max_parallel.
        const limit = this._maxParallel(graph);
        const outcomes = [];
        for (let i = 0; i < layer.length; i += limit) {
          const chunk = layer.slice(i, i + limit);
          const settled = await Promise.allSettled(chunk.map(n => runNode(n, layerIndex)));
          for (const s of settled) {
            outcomes.push(s.status === 'fulfilled' ? s.value : { ok: false, node: 'unknown' });
          }
        }
        const firstFailure = outcomes.find(o => !o.ok);
        if (firstFailure) failed = firstFailure;
      }
    }

    if (failed) {
      this.result.failedAt = failed.node;
      this._persistRunResult(stddDir, changeName);
      console.log(chalk.red(`\n  Graph run aborted at ${failed.node}.`));
      console.log(chalk.yellow(`  Re-run with --change-name ${changeName} to resume from this node (cached checkpoints are skipped).`));
      console.log(chalk.dim(`  Run result: ${path.relative(cwd, path.join(stddDir, 'changes', changeName, 'graph-run-result.json'))}`));
      process.exitCode = 1;
      return this.result;
    }

    console.log(chalk.green(`\n  Graph run completed for ${changeName}.`));
    return this.result;
  }

  _persistRunResult(stddDir, changeName) {
    try {
      const dir = path.join(stddDir, 'changes', changeName);
      if (!fs.existsSync(dir)) return; // failing node never created the change
      fs.writeFileSync(path.join(dir, 'graph-run-result.json'), JSON.stringify(this.result, null, 2), 'utf8');
    } catch (err) {
      logger.warn(`Failed to persist graph run result: ${err.message}`);
    }
  }

  _generateChangeName(intent) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `graph-${intent}-${yyyy}${MM}${dd}-${HH}${mm}`;
  }

  _loadConditions() {
    const conditionsPath = path.join(getPackageRoot(), 'stdd', 'graph', 'conditions.json');
    try {
      if (fs.existsSync(conditionsPath)) {
        const content = fs.readFileSync(conditionsPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.log(chalk.dim(`  [Warning: Failed to load conditions.json: ${error.message}]`));
    }
    return { rules: [] };
  }

  _applyConditions(graph) {
    const conditions = this._loadConditions();
    if (!conditions.rules || conditions.rules.length === 0) {
      return;
    }

    console.log(chalk.cyan('  [Evaluating condition rules...]'));

    for (const rule of conditions.rules) {
      if (!rule.if || !rule.then || !rule.then.inject_node) {
        continue;
      }

      const condition = rule.if;
      const injectNode = rule.then.inject_node;
      const afterNode = rule.then.after;

      if (graph.skills && graph.skills[injectNode]) {
        continue;
      }

      if (this._evaluateCondition(condition)) {
        console.log(chalk.green(`  [Condition met: injecting node '${injectNode}' after '${afterNode}']`));

        if (!graph.skills) {
          graph.skills = {};
        }

        const originalDependents = [];
        if (afterNode) {
          for (const [name, node] of Object.entries(graph.skills)) {
            if (name === injectNode || name === afterNode) continue;
            if (node.depends_on && node.depends_on.includes(afterNode)) {
              originalDependents.push(name);
            }
          }
        }
        const dependsOn = afterNode && graph.skills[afterNode] ? [afterNode] : [];
        graph.skills[injectNode] = {
          description: `Condition-injected node: ${injectNode}`,
          phase: 'verify',
          depends_on: dependsOn,
          metadata: { priority: 'high', category: 'condition', injected: true },
        };

        if (afterNode) {
          for (const [name, node] of Object.entries(graph.skills)) {
            if (name === injectNode || name === afterNode) continue;
            if (node.depends_on && node.depends_on.includes(afterNode) && originalDependents.includes(name)) {
              node.depends_on = node.depends_on.filter(d => d !== afterNode);
              node.depends_on.push(injectNode);
            }
          }
        }
      }
    }
  }

  _evaluateCondition(condition) {
    if (!condition || typeof condition !== 'object') return false;

    if (condition.all) return Array.isArray(condition.all) && condition.all.every(item => this._evaluateCondition(item));
    if (condition.any) return Array.isArray(condition.any) && condition.any.some(item => this._evaluateCondition(item));
    if (condition.not) return !this._evaluateCondition(condition.not);

    if (condition.has_file) {
      const filePath = path.join(process.cwd(), condition.has_file);
      return fs.existsSync(filePath);
    }

    if (condition.has_file_pattern || condition.file_pattern) {
      return this._evaluateFilePattern(condition.has_file_pattern || condition.file_pattern);
    }

    if (condition.has_dependency) {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
          ...(pkg.peerDependencies || {}),
          ...(pkg.optionalDependencies || {}),
        };
        return condition.has_dependency in deps;
      } catch (err) {
        logger.warn(err.message);
        return false;
      }
    }

    if (condition.variable || condition.env) {
      return this._evaluateVariable(condition.variable || condition.env, condition);
    }

    if (condition.json_path) {
      return this._evaluateJsonPath(condition.json_path, condition);
    }

    if (condition.command) {
      return this._evaluateCommand(condition.command, condition);
    }

    if (condition.git_branch) {
      return this._evaluateGitBranch(condition.git_branch, condition);
    }

    if (condition.git_status) {
      return this._evaluateGitStatus(condition.git_status, condition);
    }

    return false;
  }

  _evaluateFilePattern(pattern) {
    if (!pattern) return false;
    const regex = globPatternToRegex(pattern);
    return walkFiles(process.cwd()).some(file => regex.test(toPosixPath(path.relative(process.cwd(), file))));
  }

  _evaluateVariable(name, condition) {
    const value = process.env[String(name)];
    return compareValues(value, condition.operator, condition.value);
  }

  _evaluateJsonPath(config, condition) {
    const file = typeof config === 'string' ? config : config.file;
    const query = typeof config === 'string' ? condition.path : config.path;
    if (!file || !query) return false;

    try {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const value = getValueAtPath(JSON.parse(content), query);
      const operator = condition.operator || config.operator;
      const expected = Object.prototype.hasOwnProperty.call(condition, 'value') ? condition.value : config.value;
      return compareValues(value, operator, expected);
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }

  _evaluateCommand(command, condition) {
    try {
      const { bin } = parseCommand(command, 'Condition command');
      if (!ALLOWED_CONDITION_COMMANDS.has(bin)) return false;
      const result = runParsedCommand(command, { cwd: process.cwd(), stdio: 'pipe', timeout: condition.timeout || 30000 });
      const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
      if (condition.operator) return compareValues(output, condition.operator, condition.value);
      return result.status === 0;
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }

  _evaluateGitBranch(expected, condition) {
    try {
      const result = runParsedCommand('git branch --show-current', { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 });
      if (result.status !== 0) return false;
      return compareValues(String(result.stdout || '').trim(), condition.operator || 'equals', expected);
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }

  _evaluateGitStatus(expected, condition) {
    try {
      const result = runParsedCommand('git status --porcelain', { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 });
      if (result.status !== 0) return false;
      const clean = String(result.stdout || '').trim().length === 0;
      const value = expected === 'clean' ? clean : !clean;
      return condition.operator ? compareValues(value, condition.operator, condition.value) : value;
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }
}

module.exports = { GraphRunCommand, NODE_COMMAND_MAP };
