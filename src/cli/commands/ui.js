/**
 * UI Command (frontend item 4): DESIGN.md-driven component/page skeletons.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { TechStackDetector } = require('../../utils/tech-stack-detector');
const { renderComponent, extractDesignTokens, kebab, pascal } = require('../../utils/ui-scaffolds');
const { renderRtlTest } = require('../../utils/test-scaffolds');

class UiCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  execute(action = 'generate', args = [], options = {}) {
    if (action === 'generate' || action === 'component' || action === 'page') {
      const name = args[0] || options.name;
      if (!name) throw new Error('Component name required: stdd ui generate <Name>');
      return this.generate(name, options, action === 'page');
    }
    if (action === 'list' || !action || action === 'help') {
      console.log('Usage: stdd ui generate <Name> [--framework react|vue|html] [--out <dir>] [--force] [--no-test]');
      console.log('       stdd ui page <Name>    # page-level skeleton (same options)');
      return { usage: true };
    }
    throw new Error(`Unknown ui action '${action}'. Use generate or page.`);
  }

  detectFramework(options) {
    if (options.framework) return options.framework;
    try {
      const stack = TechStackDetector.analyze(this.cwd);
      if (/vue/i.test(String(stack.framework || ''))) return 'vue';
      if (/react|next/i.test(String(stack.framework || ''))) return 'react';
    } catch { /* fall through */ }
    return 'react';
  }

  generate(rawName, options, isPage) {
    const name = pascal(rawName);
    const slug = kebab(name);
    const framework = this.detectFramework(options);
    const ext = framework === 'react' ? 'tsx' : framework === 'vue' ? 'vue' : 'html';

    const outDir = path.resolve(this.cwd, options.out || path.join('src', isPage ? 'pages' : 'components'));
    const filePath = path.join(outDir, `${name}.${ext}`);
    if (fs.existsSync(filePath) && !options.force) {
      throw new Error(`${path.relative(this.cwd, filePath)} already exists. Use --force to overwrite.`);
    }
    fs.mkdirSync(outDir, { recursive: true });

    const designPath = path.join(this.cwd, 'DESIGN.md');
    const tokens = fs.existsSync(designPath)
      ? extractDesignTokens(fs.readFileSync(designPath, 'utf8'))
      : [];

    fs.writeFileSync(filePath, renderComponent(name, framework, tokens), 'utf8');
    const written = [filePath];

    if (framework === 'react' && options.test !== false && !options.noTest) {
      const testPath = path.join(outDir, `${name}.test.tsx`);
      fs.writeFileSync(testPath, renderRtlTest(name, slug, []), 'utf8');
      written.push(testPath);
    }

    for (const file of written) {
      console.log(chalk.green(`  + ${path.relative(this.cwd, file)}`));
    }
    if (tokens.length === 0) {
      console.log(chalk.yellow('  ⚠ no DESIGN.md tokens found — run `stdd design reverse` or `stdd design create` first.'));
    } else {
      console.log(chalk.dim(`  ${tokens.length} DESIGN.md token(s) embedded as guidance.`));
    }
    if (options.json) {
      console.log(JSON.stringify({ name, framework, files: written.map(f => path.relative(this.cwd, f)) }, null, 2));
    }
    return { name, framework, files: written };
  }
}

module.exports = { UiCommand };
