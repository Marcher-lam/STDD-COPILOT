const { BrowserController } = require('../../runtime/browser-controller');
const { BrowserDoctor } = require('../../runtime/browser-doctor');
const chalk = require('chalk');
const path = require('path');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('browser');

class BrowserCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.controller = new BrowserController();
  }

  execute(action, target, options = {}) {
    if (action === 'baseline') {
      return this.baseline(target, options);
    }
    if (action === 'diff') {
      return this.diff(target, options);
    }
    if (action === 'snapshot') {
      return this.snapshot(target, options);
    } else if (action === 'inspect') {
      return this.inspect(target, options);
    } else if (action === 'doctor') {
      return this.doctor(options);
    } else {
      console.log(chalk.yellow("Usage: stdd browser <snapshot|inspect|doctor|baseline|diff> <url> [--name <name>]"));
    }
  }

  async snapshot(url, options) {
    try {
      console.log(chalk.cyan(`Taking browser snapshot of: ${url}`));
      const result = await this.controller.snapshot({ ...options, url });
      console.log(chalk.green(`Snapshot saved: ${result.relativePath}`));
      console.log(chalk.dim(`URL: ${result.url}`));
      console.log(chalk.dim(`Title: ${result.title}`));
      return result;
    } catch (error) {
      logger.error(`Browser Error: ${error.message}`);
      if (error.message.includes("not installed")) {
        console.log(chalk.yellow("Tip: Run `npm install playwright` to enable built-in browser drive."));
      }
      process.exitCode = 1;
    }
  }

  /**
   * Capture a screenshot buffer via the runtime (requires playwright).
   * Resolves { buffer, url, title }; rejects with an install hint otherwise.
   */
  async captureBuffer(url, options = {}) {
    // BrowserController#capture requires playwright; without it the call
    // rejects with an install hint we surface to the user.
    if (typeof this.controller.capture !== 'function') {
      return Promise.reject(new Error('playwright is not installed'));
    }
    return this.controller.capture({ ...options, url });
  }

  async baseline(url, options = {}) {
    const name = options.name || path.basename(url || '') || 'page';
    try {
      const capture = await this.captureBuffer(url, options);
      const { saveBaseline } = require('../../utils/visual-regression');
      const saved = saveBaseline(this.cwd || process.cwd(), name, capture.buffer, { url });
      console.log(chalk.green(`Baseline saved: ${name} (${saved.hash.slice(0, 12)}…)`));
      return saved;
    } catch (error) {
      logger.error(`Baseline failed: ${error.message}`);
      if (/not installed/i.test(error.message)) {
        console.log(chalk.yellow('  Tip: npm install playwright && npx playwright install'));
      }
      process.exitCode = 1;
      return null;
    }
  }

  async diff(url, options = {}) {
    const cwd = this.cwd || process.cwd();
    const name = options.name || path.basename(url || '') || 'page';
    const { compareWithBaseline, archiveDiff, saveBaseline } = require('../../utils/visual-regression');

    const pre = compareWithBaseline(cwd, name, Buffer.alloc(0), { threshold: options.threshold });
    if (pre.status === 'no-baseline') {
      console.log(chalk.yellow(`No baseline named "${name}". Capture one first:`));
      console.log(chalk.cyan(`  stdd browser baseline <url> --name ${name}`));
      process.exitCode = 1;
      return pre;
    }

    try {
      const capture = await this.captureBuffer(url, options);
      const comparison = compareWithBaseline(cwd, name, capture.buffer, { threshold: options.threshold });
      if (comparison.status === 'identical') {
        console.log(chalk.green(`✓ Visual gate passed: "${name}" matches the baseline.`));
        return comparison;
      }
      const evidence = archiveDiff(cwd, name, capture.buffer, comparison);
      console.log(chalk.red(`✗ Visual change detected: "${name}" differs from the baseline.`));
      console.log(chalk.dim(`  Evidence: ${path.relative(cwd, evidence.png)}`));
      if (options.allowChanged) {
        console.log(chalk.yellow('  --allow-changed set: updating the baseline.'));
        saveBaseline(cwd, name, capture.buffer, { url });
      } else {
        console.log(chalk.yellow('  To accept the change: stdd browser diff <url> --name ' + name + ' --allow-changed'));
        process.exitCode = 1;
      }
      return comparison;
    } catch (error) {
      logger.error(`Diff failed: ${error.message}`);
      if (/not installed/i.test(error.message)) {
        console.log(chalk.yellow('  Tip: npm install playwright && npx playwright install'));
      }
      process.exitCode = 1;
      return null;
    }
  }

  async inspect(url, options) {
    try {
      console.log(chalk.cyan(`Inspecting page: ${url}`));
      const result = await this.controller.inspect({ ...options, url });
      console.log(chalk.green(`Inspection Complete:`));
      console.log(chalk.dim(`Title: ${result.title}`));
      return result;
    } catch (error) {
      logger.error(`Inspection Error: ${error.message}`);
      process.exitCode = 1;
    }
  }

  doctor(options = {}) {
    const result = new BrowserDoctor(this.cwd).check(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log(chalk.bold('\nBrowser Doctor'));
    for (const check of result.checks) {
      const label = check.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL');
      console.log(`  ${label} ${check.name}${check.message ? ` - ${check.message}` : ''}`);
    }
    if (result.suggestions.length) {
      console.log(chalk.yellow('\nSuggested fixes:'));
      result.suggestions.forEach(command => console.log(`  ${command}`));
    }
    if (result.status !== 'pass') process.exitCode = 1;
    return result;
  }
}

module.exports = { BrowserCommand };
