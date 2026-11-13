/**
 * stdd progress — view session progress history and resume context.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { SessionProgress } = require('../../utils/session-progress');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('progress');

class ProgressCommand {
  execute(options = {}) {
    const stddDir = path.join(process.cwd(), 'stdd');
    if (!fs.existsSync(stddDir)) {
      logger.error('STDD not initialized. Run `stdd init` first.');
      process.exitCode = 1;
      return;
    }
    const p = new SessionProgress(stddDir);

    if (options.clear) { p.clear(); console.log(chalk.green('Progress log cleared.')); return; }
    if (options.summary) return this._summary(p, options);
    if (options.resume) return this._resume(p, options);
    return this._history(p, options);
  }

  _summary(p, opts) {
    const s = p.summary();
    if (opts.json) { console.log(JSON.stringify(s, null, 2)); return; }
    console.log(chalk.bold('\n📊 Session Progress\n'));
    console.log(`  Commands:    ${s.total}`);
    console.log(`  ${chalk.green('Completed')}:  ${s.completed}`);
    console.log(`  ${chalk.red('Failed')}:     ${s.failed}`);
    console.log(`  ${chalk.yellow('Interrupted')}: ${s.interrupted}`);
    if (s.incomplete > 0) {
      const ctx = p.getResumeContext();
      console.log(chalk.yellow(`\n  ⚠ ${s.incomplete} incomplete → stdd progress --resume`));
      if (ctx) console.log(chalk.dim(`    Last: ${ctx.start.cmd} at ${ctx.start.ts}`));
    }
    if (s.lastActivity) console.log(`\n  Last activity: ${s.lastActivity}`);
    console.log();
  }

  _resume(p, opts) {
    const ctx = p.getResumeContext();
    if (!ctx) { console.log(chalk.green('\n✅ No incomplete commands.\n')); return; }
    if (opts.json) { console.log(JSON.stringify(ctx, null, 2)); return; }
    console.log(chalk.bold('\n🔄 Resume Context\n'));
    console.log(`  Command:  ${chalk.bold(ctx.start.cmd)}`);
    console.log(`  Started:  ${ctx.start.ts}`);
    if (ctx.start.args) console.log(`  Args:     ${JSON.stringify(ctx.start.args)}`);
    if (ctx.failed) console.log(chalk.red(`  ❌ Failed: ${ctx.failureDetail?.err || 'unknown'}`));
    const hint = this._resumeHint(ctx);
    if (hint) {
      console.log(chalk.cyan(`\n  → ${hint}`));
    } else {
      console.log(chalk.yellow('\n  No automatic resume command is available for this command.'));
      console.log(chalk.dim('  Inspect the command output and rerun the appropriate command manually.'));
    }
    console.log();
    if (!opts.json) {
      console.log(chalk.dim('  (context recovery only — execution does NOT auto-resume; re-run the failing command, or stdd graph run --change-name <n> for checkpoint resume)'));
    }
  }

  _resumeHint(ctx) {
    const command = ctx.start.cmd;
    const args = ctx.start.args || {};
    // 终测复验 D11: cli.js now records real positionals and option values;
    // fall back across flag names and positional order so resume hints can
    // locate the original change/workspace context.
    const positionals = Array.isArray(args.positionals) ? args.positionals : [];
    const change = args.change || args.changeName || args['change-name'] || positionals[0];
    if (['apply', 'verify', 'archive', 'continue'].includes(command)) {
      return `stdd continue${change ? ` ${change}` : ''}`;
    }
    if (command === 'graph') {
      return `stdd graph run --intent ${args.intent || 'feature'}${change ? ` --change-name ${change}` : ''}`;
    }
    if (command === 'constitution' && (args.action || positionals[0]) === 'check') {
      return 'stdd constitution check';
    }
    if (command === 'constitution' && (args.action || positionals[0]) === 'fix') {
      return `stdd constitution fix${args.article ? ` --article ${args.article}` : ''}`;
    }
    if (command === 'new') {
      const name = positionals[1] || change;
      return `stdd new change ${name || '<name>'}`;
    }
    if (command === 'ff') {
      return `stdd ff ${change || '<description>'}`;
    }
    if (command === 'doctor') {
      return 'stdd doctor --deep';
    }
    return null;
  }

  _history(p, opts) {
    const n = parseInt(opts.last, 10) || 20;
    const entries = p.readLast(n);
    if (!entries.length) { console.log(chalk.dim('\nNo progress recorded.\n')); return; }
    if (opts.json) { console.log(JSON.stringify(entries, null, 2)); return; }
    console.log(chalk.bold(`\n📜 Progress (last ${entries.length})\n`));
    const icons = { start: chalk.cyan('▶'), complete: chalk.green('✓'), fail: chalk.red('✗'), interrupt: chalk.yellow('⚡'), cp: chalk.blue('◆') };
    for (const e of entries) {
      const t = (e.ts || '').replace('T', ' ').replace(/\.\d+Z$/, '');
      const positionals = Array.isArray(e.args?.positionals) ? e.args.positionals : [];
      const ch = e.args?.change || e.args?.changeName || e.args?.['change-name'] || positionals[0] || '';
      const err = e.err ? chalk.red(` → ${e.err}`) : '';
      console.log(`  ${icons[e.ev] || '·'} ${chalk.dim(t)} ${e.cmd || ''}${ch ? ` [${ch}]` : ''}${err}`);
    }
    console.log();
  }
}

module.exports = { ProgressCommand };
