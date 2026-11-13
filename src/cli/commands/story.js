const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class StoryCommand {
  constructor(cwd = process.cwd()) { this.cwd = cwd; }

  execute(action = 'create', name = 'journey', options = {}) {
    // 终测复验 D09/S014: the documented `story convert <journey>` action
    // now maps to the BDD conversion (aliases of `story bdd`).
    if (action === 'bdd' || action === 'convert' || action === 'to-bdd') {
      return this.toBdd(name, options);
    }
    return this.create(name, options);
  }

  create(name, options = {}) {
    const safe = String(name || 'journey').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const dir = path.join(this.cwd, 'stdd', 'journeys');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${safe}.yaml`);
    if (fs.existsSync(filePath) && !options.force) throw new Error(`Journey '${safe}' already exists. Use --force to overwrite.`);
    const doc = {
      name: safe,
      persona: options.persona || 'primary-user',
      goal: options.goal || name,
      steps: [
        { id: 'step-1', action: 'start journey', expected: 'user can begin successfully', opportunities: [] },
        { id: 'step-2', action: 'complete target task', expected: 'user sees successful outcome', opportunities: [] },
      ],
      metrics: ['completion_rate', 'time_on_task', 'error_rate'],
    };
    fs.writeFileSync(filePath, yaml.dump(doc), 'utf8');
    if (options.json) console.log(JSON.stringify({ status: 'created', path: filePath, journey: doc }, null, 2));
    else console.log(`Created journey map: ${path.relative(this.cwd, filePath)}`);
    return { status: 'created', path: filePath, journey: doc };
  }

  toBdd(name, options = {}) {
    const journeyPath = path.resolve(this.cwd, name);
    if (!fs.existsSync(journeyPath)) throw new Error(`Journey file not found: ${name}`);
    const journey = yaml.load(fs.readFileSync(journeyPath, 'utf8'));
    const outDir = path.join(this.cwd, 'stdd', 'specs', 'journeys');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${journey.name || path.basename(name, path.extname(name))}.feature`);
    const lines = [`Feature: ${journey.goal || journey.name}`, '', `  Scenario: ${journey.persona || 'user'} completes ${journey.name}`];
    for (const step of journey.steps || []) {
      lines.push(`    Given ${journey.persona || 'the user'} is at ${step.id}`);
      lines.push(`    When they ${step.action}`);
      lines.push(`    Then ${step.expected}`);
    }
    fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
    if (options.json) console.log(JSON.stringify({ status: 'generated', path: outPath }, null, 2));
    else console.log(`Generated BDD feature: ${path.relative(this.cwd, outPath)}`);
    return { status: 'generated', path: outPath };
  }
}

module.exports = { StoryCommand };
