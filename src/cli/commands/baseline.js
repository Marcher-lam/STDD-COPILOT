/**
 * Baseline Command (过程审计 A-3).
 *
 * stdd baseline capture   — run the configured tests, record current
 *                           failing-test signatures as the known baseline
 * stdd baseline show      — list recorded baseline failures
 * stdd baseline clear     — remove the baseline (back to strict semantics)
 *
 * With a baseline active, apply's RED requires at least one NEW failing
 * test and GREEN/REFACTOR exempt recorded baseline failures.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { resolveTestCommands, getConfigTestCommand } = require('../../utils/test-command-resolver');
const { injectReporter } = require('../../utils/reporter-injector');
const { runCommand } = require('../../utils/command-runner');
const {
  readBaseline, writeBaseline, clearBaseline, extractFailureSignatures,
} = require('../../utils/baseline');

class BaselineCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }

  async execute(action = 'show', options = {}) {
    switch (action) {
      case 'capture':
      case 'record':
        return this.capture(options);
      case 'show':
      case 'list':
        return this.show(options);
      case 'clear':
      case 'reset':
        return this.clear(options);
      default:
        throw new Error(`Unknown baseline action '${action}'. Use capture, show, or clear.`);
    }
  }

  capture(options = {}) {
    const cwd = this.cwd;
    if (!fs.existsSync(path.join(cwd, 'stdd'))) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: options.workspace,
    });
    if (testCommands.length === 0) {
      throw new Error('No test command configured — nothing to baseline. Configure scripts.test / stdd/config.yaml first.');
    }

    const failures = new Set();
    const commands = [];
    for (const testCommand of testCommands) {
      const injected = injectReporter(testCommand.command, testCommand.cwd);
      console.log(`  Running ${chalk.cyan(testCommand.workspaceName)}: ${chalk.cyan(injected.command)}`);
      const env = injected.env ? { ...process.env, ...injected.env } : undefined;
      const result = runCommand(injected.command, { cwd: testCommand.cwd, stdio: 'pipe', env });
      commands.push(testCommand.command);
      if (result.status === 0) continue;
      extractFailureSignatures(`${result.stdout || ''}\n${result.stderr || ''}`)
        .forEach(sig => failures.add(`${testCommand.workspaceName}::${sig}`));
    }

    const data = {
      capturedAt: new Date().toISOString(),
      commands,
      failures: Array.from(failures).sort(),
    };
    const saved = writeBaseline(cwd, data);

    console.log('');
    if (data.failures.length === 0) {
      console.log(chalk.green('✓ Test suite is green — baseline recorded with 0 known failures.'));
    } else {
      console.log(chalk.yellow(`⚠ Baseline recorded with ${data.failures.length} known failure(s):`));
      data.failures.slice(0, 10).forEach(f => console.log(`    ${chalk.yellow('–')} ${f}`));
      if (data.failures.length > 10) console.log(chalk.dim(`    … +${data.failures.length - 10} more`));
      console.log(chalk.dim('\n  These failures no longer block GREEN and can never serve as RED evidence.'));
      console.log(chalk.dim('  Fix them and re-run `stdd baseline capture` to shrink the baseline.'));
    }
    console.log(chalk.dim(`  Saved: ${path.relative(cwd, saved)}`));

    if (options.json) console.log(JSON.stringify(data, null, 2));
    return data;
  }

  show(options = {}) {
    const data = readBaseline(this.cwd);
    if (!data) {
      console.log(chalk.dim('\nNo baseline recorded. Run `stdd baseline capture` to exempt known failures.'));
      if (options.json) console.log(JSON.stringify({ baseline: null }, null, 2));
      return null;
    }
    if (!options.json) {
      console.log(chalk.bold(`\n📋 Known-failure baseline (captured ${data.capturedAt})\n`));
      console.log(`  Commands: ${data.commands.join(' && ')}`);
      console.log(`  Failures: ${data.failures.length}`);
      data.failures.slice(0, 20).forEach(f => console.log(`    ${chalk.yellow('–')} ${f}`));
      if (data.failures.length > 20) console.log(chalk.dim(`    … +${data.failures.length - 20} more`));
      console.log('');
    } else {
      console.log(JSON.stringify({ baseline: data }, null, 2));
    }
    return data;
  }

  clear(options = {}) {
    const existed = fs.existsSync(path.join(this.cwd, 'stdd', 'baseline.json'));
    clearBaseline(this.cwd);
    console.log(existed
      ? chalk.green('✓ Baseline cleared — RED/GREEN are back to strict whole-suite semantics.')
      : chalk.dim('No baseline was recorded.'));
    if (options.json) console.log(JSON.stringify({ cleared: existed }, null, 2));
    return { cleared: existed };
  }
}

module.exports = { BaselineCommand };
