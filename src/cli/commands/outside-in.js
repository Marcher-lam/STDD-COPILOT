const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { findActiveChange } = require('../../utils/change-utils');

const DEFAULT_REGISTRY = {
  version: 1,
  workflow: 'outside-in',
  layers: [
    { name: 'e2e', purpose: 'User-visible acceptance behavior', testCommand: 'npm run test:e2e -- <test-file>', testPattern: 'tests/e2e/<feature>.spec.ts', failureSignals: ['missing UI element', 'broken user journey', 'wrong observable behavior'] },
    { name: 'integration', purpose: 'Component, API, or service boundary behavior', testCommand: 'npm run test -- <test-file>', testPattern: 'tests/integration/<feature>.spec.ts', failureSignals: ['boundary contract mismatch', 'API/service wiring failure'] },
    { name: 'unit', purpose: 'Smallest domain logic needed by the integration layer', testCommand: 'npm run test -- <test-file>', testPattern: 'tests/unit/<feature>.spec.ts', failureSignals: ['pure logic failure', 'edge case failure'] },
  ],
  rules: [
    'Write the outer failing E2E test before inner tests.',
    'Route failures to the narrowest responsible layer.',
    'Implementation may move inward only after the current layer has a failing test.',
    'Mutation or fix-packet evidence is required before archive when failures repeat.',
  ],
};

function safeName(name) {
  return String(name || 'feature').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'feature';
}

class OutsideInCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  execute(action = 'status', changeName, options = {}) {
    if (action === 'init') return this.init(options);
    if (action === 'scaffold') return this.scaffold(changeName, options);
    if (action === 'status') return this.status(options);
    throw new Error(`Unknown outside-in action '${action}'. Use init, scaffold, or status.`);
  }

  init(options = {}) {
    const stddDir = path.join(this.cwd, 'stdd');
    if (!fs.existsSync(stddDir)) throw new Error('STDD not initialized. Run `stdd init` first.');
    const registryPath = path.join(stddDir, 'tdd-registry.yaml');
    if (fs.existsSync(registryPath) && !options.force) throw new Error('stdd/tdd-registry.yaml already exists. Use --force to overwrite.');
    fs.writeFileSync(registryPath, yaml.dump(DEFAULT_REGISTRY, { lineWidth: 100 }), 'utf8');
    const result = { path: 'stdd/tdd-registry.yaml', layers: DEFAULT_REGISTRY.layers.map(layer => layer.name) };
    this.printResult('Outside-in registry initialized', result, options);
    return result;
  }

  status(options = {}) {
    const registry = this.readRegistry();
    const result = { path: 'stdd/tdd-registry.yaml', layers: registry.layers || [], rules: registry.rules || [] };
    this.printResult('Outside-in registry status', result, options);
    return result;
  }

  scaffold(changeName, options = {}) {
    const stddDir = path.join(this.cwd, 'stdd');
    if (!fs.existsSync(stddDir)) throw new Error('STDD not initialized. Run `stdd init` first.');
    const changeDir = findActiveChange(stddDir, changeName);
    if (!changeDir) throw new Error(changeName ? `Change '${changeName}' not found.` : 'No active changes found.');

    const registry = this.readRegistry();
    const feature = safeName(options.feature || path.basename(changeDir));
    const outputDir = path.join(changeDir, 'outside-in');
    fs.mkdirSync(outputDir, { recursive: true });

    const planPath = path.join(outputDir, 'plan.md');
    fs.writeFileSync(planPath, this.buildPlan(path.basename(changeDir), feature, registry), 'utf8');

    const skeletons = [];
    for (const layer of registry.layers || []) {
      const filePath = path.join(outputDir, `${safeName(layer.name)}-${feature}.spec.md`);
      fs.writeFileSync(filePath, this.buildLayerSkeleton(layer, feature), 'utf8');
      skeletons.push(path.relative(this.cwd, filePath).replace(/\\/g, '/'));
    }

    // Runnable test-code scaffolds (--code rtl|playwright|storybook|all):
    // driven by the change's BDD scenarios when present.
    const code = [];
    if (options.code && options.code !== 'none') {
      const VALID_CODE = ['rtl', 'playwright', 'storybook', 'all'];
      const codeKind = String(options.code);
      if (!VALID_CODE.includes(codeKind)) {
        throw new Error(`Unknown --code '${codeKind}'. Use rtl | playwright | storybook | all.`);
      }
      const wanted = codeKind === 'all' ? ['rtl', 'playwright', 'storybook'] : [codeKind];
      const { renderRtlTest, renderPlaywrightSpec, renderStorybookStory, pascalCase } = require('../../utils/test-scaffolds');
      const { parseBddScenarios } = require('../../utils/bdd-scenario-parser');
      let scenarios = [];
      const specsDir = path.join(changeDir, 'specs');
      if (fs.existsSync(specsDir)) {
        const featureFiles = fs.readdirSync(specsDir)
          .filter(f => /\.(feature|md)$/.test(f))
          .map(f => path.join(specsDir, f));
        if (featureFiles.length > 0) {
          try {
            scenarios = parseBddScenarios(featureFiles, this.cwd);
          } catch { /* ignore unreadable specs */ }
        }
      }
      // Normalize to the shape the renderers expect (name + step text).
      scenarios = scenarios.map(s => ({
        name: s.name,
        given: (s.steps || []).find(x => /^Given/i.test(x)),
        when: (s.steps || []).find(x => /^When/i.test(x)),
        then: (s.steps || []).find(x => /^Then/i.test(x)),
      }));
      const component = pascalCase(feature);
      const outputs = {
        rtl: { file: `rtl-${feature}.test.tsx`, render: () => renderRtlTest(component, feature, scenarios) },
        playwright: { file: `e2e-${feature}.spec.ts`, render: () => renderPlaywrightSpec(feature, feature, scenarios) },
        storybook: { file: `${component}.stories.tsx`, render: () => renderStorybookStory(component) },
      };
      for (const kind of wanted) {
        const spec = outputs[kind];
        if (!spec) continue;
        const filePath = path.join(outputDir, spec.file);
        fs.writeFileSync(filePath, spec.render(), 'utf8');
        code.push(path.relative(this.cwd, filePath).replace(/\\/g, '/'));
      }
    }

    const result = { change: path.basename(changeDir), feature, plan: path.relative(this.cwd, planPath).replace(/\\/g, '/'), skeletons, code };
    this.printResult('Outside-in scaffold generated', result, options);
    return result;
  }

  readRegistry() {
    const registryPath = path.join(this.cwd, 'stdd', 'tdd-registry.yaml');
    if (!fs.existsSync(registryPath)) throw new Error('Missing stdd/tdd-registry.yaml. Run `stdd outside-in init` first.');
    return yaml.load(fs.readFileSync(registryPath, 'utf8')) || {};
  }

  buildPlan(change, feature, registry) {
    const lines = [`# Outside-In Plan: ${change}`, '', `Feature key: ${feature}`, '', '## Layer Order', ''];
    for (const [index, layer] of (registry.layers || []).entries()) lines.push(`${index + 1}. ${layer.name}: ${layer.purpose || 'No purpose documented'}`);
    lines.push('', '## Rules', '', ...(registry.rules || []).map(rule => `- ${rule}`), '');
    lines.push('## Execution Protocol', '', '- Start with the e2e skeleton and make it fail for the right reason.', '- Add integration and unit tests only to explain the failing outer behavior.', '- Implement from the innermost necessary layer back outward.', '- Run `stdd fix-packet <change>` whenever a failure needs AI handoff context.', '');
    return lines.join('\n');
  }

  buildLayerSkeleton(layer, feature) {
    return [`# ${layer.name} Test Skeleton: ${feature}`, '', `Purpose: ${layer.purpose || 'Define this layer behavior.'}`, '', `Suggested test path: ${layer.testPattern || '<configure in stdd/tdd-registry.yaml>'}`, `Suggested command: ${layer.testCommand || '<configure in stdd/tdd-registry.yaml>'}`, '', '## Failing Test Intent', '', '- Observable behavior under test:', '- Expected first failure reason:', '- Upstream dependency or fixture:', '', '## Failure Routing Signals', '', ...((layer.failureSignals || []).map(signal => `- ${signal}`)), '', '## Notes', '', 'Keep this test focused on the layer. Do not duplicate assertions already owned by outer layers.', ''].join('\n');
  }

  printResult(title, result, options = {}) {
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(`${title}:\n${JSON.stringify(result, null, 2)}`);
  }
}

module.exports = { OutsideInCommand, DEFAULT_REGISTRY };
