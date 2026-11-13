/**
 * Parallel Command
 * DAG parallel execution with layer-based scheduling.
 *
 * 终测复验 D07: this command previously destructured a `DynamicRouter`
 * export that never existed and called a ParallelExecutor API from a
 * different design (execute/plan/buildLayers) — every action crashed with
 * "DynamicRouter is not a constructor". It now uses the same compile /
 * layer APIs `stdd graph` uses. `run` stays a PLANNING entry point and says
 * so: real node execution belongs to `stdd graph run`.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const DynamicGraphRouter = require('../../utils/dynamic-router');
const ParallelExecutor = require('../../utils/parallel-executor');
const HeterogeneousAdapter = require('../../utils/heterogeneous-adapter');
// All three of DynamicGraphRouter / ParallelExecutor / HeterogeneousAdapter
// are default (non-destructured) exports — destructuring them was the D07
// crash.
const logger = createLogger('parallel');

function getEdges(graph) {
  const edges = [];
  for (const [nodeName, nodeDef] of Object.entries(graph.skills || {})) {
    for (const dep of nodeDef.depends_on || []) {
      edges.push({ from: dep, to: nodeName });
    }
  }
  return edges;
}

function getLayers(graph, maxParallel) {
  const executor = new ParallelExecutor(graph, new HeterogeneousAdapter(), {
    maxParallel: maxParallel || graph.config?.max_parallel || 4,
  });
  return executor._topologicalLayers();
}

class ParallelCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.graphDir = path.join(cwd, 'stdd', 'graph');
  }

  execute(action = 'status', args = [], options = {}) {
    const intent = Array.isArray(args) ? args.filter(Boolean).join(' ') : String(args || '');
    switch (action) {
      case 'run':
      case 'execute':
        return this.run(intent || 'feature', options);
      case 'dry-run':
        return this.dryRun(intent || 'feature', options);
      case 'visualize':
      case 'graph':
        return this.visualize(intent || 'feature', options);
      case 'layers':
        return this.showLayers(intent || 'feature', options);
      case 'status':
        return this.status(options);
      default:
        return this.run(action, options);
    }
  }

  compileGraph(intent) {
    const router = new DynamicGraphRouter();
    const graph = router.compile(intent);
    if (!graph || !graph.skills || Object.keys(graph.skills).length === 0) {
      throw new Error(`No DAG found for intent: ${intent}. Available: feature, hotfix, repair, research`);
    }
    return graph;
  }

  async run(intent, options = {}) {
    const graph = this.compileGraph(intent);
    const layers = getLayers(graph, options.parallel || options.p);

    console.log(chalk.bold('\nParallel Execution (planning)\n'));
    console.log(`  Intent: ${chalk.cyan(intent)}`);
    console.log(`  Nodes: ${chalk.cyan(String(Object.keys(graph.skills).length))}`);
    console.log(`  Layers: ${chalk.cyan(String(layers.length))}`);
    console.log(`  Max parallel: ${chalk.cyan(String(options.parallel || options.p || graph.config?.max_parallel || 4))}\n`);

    layers.forEach((layer, i) => {
      console.log(`  ${chalk.bold('Layer ' + i + ':')} ${chalk.cyan(layer.join(', '))}`);
    });
    console.log(chalk.dim('\n  Planning only — real node execution: stdd graph run --intent ' + intent));
    console.log('');

    return { intent, nodes: Object.keys(graph.skills), layers };
  }

  async dryRun(intent, options = {}) {
    const graph = this.compileGraph(intent);
    const layers = getLayers(graph, options.parallel || options.p);
    const nodes = Object.keys(graph.skills);
    const edges = getEdges(graph);

    const plan = {
      intent,
      nodes: nodes.length,
      edges: edges.length,
      layers: layers.map(nodes => ({ nodes })),
      estimatedTime: nodes.length * 30,
    };

    if (options.json) {
      console.log(JSON.stringify({ intent, plan }, null, 2));
    } else {
      console.log(chalk.bold('\nParallel Execution Plan (Dry Run)\n'));
      console.log(`  Intent: ${chalk.cyan(intent)}`);
      console.log(`  Total nodes: ${chalk.cyan(String(nodes.length))}`);
      console.log(`  Layers: ${chalk.cyan(String(layers.length))}`);
      console.log(`  Estimated time: ${chalk.cyan(plan.estimatedTime + 's')}\n`);

      layers.forEach((layer, i) => {
        console.log(`  ${chalk.bold('Layer ' + i + ':')} ${chalk.cyan(layer.join(', '))}`);
      });
      console.log('');
    }

    return { intent, plan };
  }

  async visualize(intent, options = {}) {
    const graph = this.compileGraph(intent);
    const layers = getLayers(graph, options.parallel || options.p);
    const edges = getEdges(graph);

    let output = chalk.bold('\nExecution Graph Visualization\n');
    output += chalk.dim('─'.repeat(50)) + '\n\n';

    layers.forEach((layer, i) => {
      output += `  ${chalk.bold('Layer ' + i + ':')}\n`;
      layer.forEach(node => {
        const dependencies = edges
          .filter(e => e.to === node)
          .map(e => e.from);
        const depStr = dependencies.length > 0 ? ` ← ${dependencies.join(', ')}` : '';
        output += `    ${chalk.cyan(node)}${chalk.dim(depStr)}\n`;
      });
      output += '\n';
    });

    output += chalk.dim('─'.repeat(50)) + '\n';

    console.log(output);

    return { intent, layers };
  }

  async showLayers(intent, options = {}) {
    const graph = this.compileGraph(intent);
    const layers = getLayers(graph, options.parallel || options.p);

    if (options.json) {
      console.log(JSON.stringify({ intent, layers }, null, 2));
    } else {
      console.log(chalk.bold('\nExecution Layers\n'));
      console.log(`  Intent: ${chalk.cyan(intent)}\n`);

      layers.forEach((layer, i) => {
        console.log(`  ${chalk.bold('Layer ' + i + ':')} ${chalk.cyan(layer.join(', '))}`);
      });
      console.log('');
    }

    return { intent, layers };
  }

  status(options = {}) {
    const configPath = path.join(this.graphDir, 'config.json');
    const skillsPath = path.join(this.graphDir, 'skills.yaml');
    const conditionsPath = path.join(this.graphDir, 'conditions.json');

    const status = {
      graphDir: path.relative(this.cwd, this.graphDir),
      hasConfig: fs.existsSync(configPath),
      hasSkills: fs.existsSync(skillsPath),
      hasConditions: fs.existsSync(conditionsPath),
      availableIntents: ['feature', 'hotfix', 'repair', 'research'],
    };

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      status.maxParallel = config.max_parallel || 4;
      status.timeout = config.timeout;
    }

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(chalk.bold('\nParallel Execution Status\n'));
      console.log(`  Graph directory: ${chalk.cyan(status.graphDir)}`);
      console.log(`  Config: ${status.hasConfig ? chalk.green('✓') : chalk.yellow('○')}`);
      console.log(`  Skills: ${status.hasSkills ? chalk.green('✓') : chalk.yellow('○')}`);
      console.log(`  Conditions: ${status.hasConditions ? chalk.green('✓') : chalk.yellow('○')}`);

      if (status.maxParallel) {
        console.log(`  Max parallel: ${chalk.cyan(status.maxParallel.toString())}`);
      }

      console.log(`\n  Available intents: ${chalk.cyan(status.availableIntents.join(', '))}\n`);
    }

    return status;
  }
}

module.exports = { ParallelCommand };
