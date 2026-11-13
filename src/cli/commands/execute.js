/**
 * Execute Command
 * Execute the Ralph Loop TDD closed-loop.
 *
 * 终测复验 D01/D04: every stage gates on REAL command results —
 *   RED      tests must fail (a test infrastructure failure is NOT red),
 *   CHECK    lint must pass when a lint script exists (else explicit skip),
 *   GREEN    tests must pass,
 *   MUTATION the quick mutation gate must pass (heuristic, labeled as such),
 *   REFACTOR tests must still pass.
 * A stage requested with --phase requires the prior stages' recorded
 * evidence (apply.log), so GREEN cannot bypass an unpassed RED.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { resolveTestCommands, getConfigTestCommand } = require('../../utils/test-command-resolver');
const { injectReporter } = require('../../utils/reporter-injector');
const { runCommand: runParsedCommand, isInfraFailure } = require('../../utils/command-runner');
const { readApplyLog } = require('../../utils/apply-log');
const { taskKey } = require('../../utils/change-utils');
const { MutationCommand } = require('./mutation');

const logger = createLogger('execute');

const KNOWN_ACTIONS = new Set(['run', 'status', 'evidence']);

class ExecuteCommand {
  constructor() {
    this.loopStages = ['RED', 'CHECK', 'GREEN', 'MUTATION', 'REFACTOR'];
    // Map ralph stage names onto the phase vocabulary shared with `apply`
    // so verify's TDD evidence gate sees a consistent ledger.
    this.stagePhaseTag = { RED: 'red', CHECK: 'check', GREEN: 'green', MUTATION: 'mutation', REFACTOR: 'refactor' };
    this.failureThreshold = 3;
  }

  /**
   * Dual dispatch: the registry wires `execute [action] [change]` →
   * (action, change, options) while programmatic callers use
   * (changeName, options). A first argument that is not a known action is
   * treated as a change name for backwards compatibility.
   */
  async execute(firstArg, secondArg, thirdArg) {
    let action = null;
    let changeName = null;
    let options = {};
    if (secondArg !== null && typeof secondArg === 'object' && !Array.isArray(secondArg)) {
      options = secondArg;
      changeName = firstArg || null;
    } else {
      if (firstArg && KNOWN_ACTIONS.has(String(firstArg))) {
        action = String(firstArg);
        changeName = secondArg || null;
      } else {
        changeName = firstArg || null;
      }
      options = (thirdArg && typeof thirdArg === 'object') ? thirdArg : {};
    }

    const cwd = options.cwd || process.cwd();
    const changesDir = path.join(cwd, 'stdd', 'changes');
    const changeDir = changeName
      ? path.join(changesDir, changeName)
      : await this.getActiveChangeDir(changesDir);

    if (!changeDir) {
      throw new Error('No active change found. Use `stdd new change <name>` first.');
    }

    const changeNameActual = path.basename(changeDir);
    if (action === 'status') return this.status(changeDir, changeNameActual, options);
    if (action === 'evidence') return this.evidence(changeDir, changeNameActual, options);
    return this.run(changeDir, changeNameActual, options);
  }

  async getActiveChangeDir(changesDir) {
    try {
      const statusPath = path.join(path.dirname(changesDir), '.status.yaml');
      if (fs.existsSync(statusPath)) {
        const status = fs.readFileSync(statusPath, 'utf8');
        const match = status.match(/active_change:\s*(.+)/);
        if (match && match[1].trim() !== 'none') {
          const changeDir = path.join(changesDir, match[1].trim());
          if (fs.existsSync(changeDir)) return changeDir;
        }
      }

      const entries = await fs.promises.readdir(changesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory() && e.name !== 'archive');

      if (dirs.length === 1) {
        return path.join(changesDir, dirs[0].name);
      }

      return dirs.length > 0 ? path.join(changesDir, dirs[0].name) : null;
    } catch (err) {
      logger.warn(`Could not determine active change: ${err.message}`);
      return null;
    }
  }

  async run(changeDir, changeName, options) {
    const tasksPath = path.join(changeDir, 'tasks.md');
    if (!fs.existsSync(tasksPath)) {
      throw new Error(`No tasks.md found. Run \`stdd plan ${changeName}\` first.`);
    }

    const tasks = this.parseTasks(tasksPath);
    const maxTasks = Number(options.maxTasks) > 0 ? Number(options.maxTasks) : 1;
    let processed = 0;
    let lastResult = { completed: false };
    const processedTitles = new Set();

    while (processed < maxTasks) {
      const targetTask = (options.task
        ? tasks.find(t => !t.completed && t.title.includes(options.task))
        : tasks.find(t => !t.completed && !processedTitles.has(t.title)))
        || tasks.find(t => !t.completed && !processedTitles.has(t.title));

      if (!targetTask) break;

      console.log('');
      console.log(chalk.bold('🔄 Ralph Loop TDD Execution'));
      console.log(chalk.dim('═'.repeat(50)));
      console.log('');
      console.log(chalk.bold(`Task: ${targetTask.title}`));
      console.log(chalk.dim(`Status: ${targetTask.completed ? 'completed' : 'pending'}`));
      console.log('');

      if (options.next || options.phase) {
        lastResult = await this.executeNextStage(targetTask, changeDir, changeName, options);
      } else {
        lastResult = await this.executeFullLoop(targetTask, changeDir, changeName, options);
      }
      processed++;
      processedTitles.add(targetTask.title);

      // A failing stage (or circuit breaker) stops the batch: continuing to
      // the next task would hide the failure.
      if (!lastResult.success || lastResult.circuitBreaker) break;
    }

    if (processed === 0 && !lastResult.completed) {
      console.log(chalk.green('\n✓ All tasks completed!'));
      return { completed: true };
    }
    return lastResult;
  }

  async status(changeDir, changeName, options) {
    const tasksPath = path.join(changeDir, 'tasks.md');
    const report = { change: changeName, tasks: [] };
    console.log(chalk.bold(`\n🔄 Execute status: ${chalk.cyan(changeName)}\n`));
    if (!fs.existsSync(tasksPath)) {
      console.log(chalk.yellow('  No tasks.md found.'));
      report.tasks = null;
    } else {
      const entries = readApplyLog(changeDir);
      for (const task of this.parseTasks(tasksPath)) {
        const key = taskKey(task.title);
        const evidence = { red: false, green: false, refactor: false };
        for (const entry of entries) {
          if (!entry.task || taskKey(entry.task) !== key) continue;
          if (entry.phase === 'red' && entry.status === 'passed') evidence.red = true;
          if (entry.phase === 'green' && entry.status === 'passed') evidence.green = true;
          if (entry.phase === 'refactor' && entry.status === 'passed') evidence.refactor = true;
        }
        const phaseMarker = (task.title.match(/\[phase:(\w+)\]/) || [])[1] || null;
        const row = {
          title: task.title,
          completed: task.completed,
          phase: phaseMarker,
          evidence,
        };
        report.tasks.push(row);
        const statusIcon = task.completed ? chalk.green('[x]') : chalk.yellow('[ ]');
        const ev = `RED:${evidence.red ? '✓' : '·'} GREEN:${evidence.green ? '✓' : '·'} REFACTOR:${evidence.refactor ? '✓' : '·'}`;
        console.log(`  ${statusIcon} ${task.title}${phaseMarker ? chalk.dim(` (phase:${phaseMarker})`) : ''}`);
        console.log(`      evidence: ${ev}`);
      }
    }
    if (options.json) console.log(JSON.stringify(report, null, 2));
    return report;
  }

  evidence(changeDir, changeName, options) {
    const evidenceDir = path.join(changeDir, 'evidence');
    const files = fs.existsSync(evidenceDir)
      ? fs.readdirSync(evidenceDir).filter(f => f.endsWith('.json')).sort()
      : [];
    const applyLogPath = path.join(changeDir, 'apply.log');
    const logEntries = fs.existsSync(applyLogPath) ? readApplyLog(changeDir).slice(-10) : [];
    const report = { change: changeName, evidenceFiles: files, recentLog: logEntries };

    console.log(chalk.bold(`\n📄 Evidence for ${chalk.cyan(changeName)}\n`));
    if (files.length === 0) {
      console.log(chalk.dim('  No evidence files recorded yet.'));
    } else {
      files.forEach(f => console.log(`  ${chalk.cyan(f)}`));
    }
    if (logEntries.length > 0) {
      console.log(chalk.bold('\n  Recent apply.log entries:'));
      logEntries.forEach(e => {
        console.log(`    ${chalk.dim(e.timestamp || '')} [${e.phase || '-'}] ${e.status} ${e.task || ''}`);
      });
    }
    if (options.json) console.log(JSON.stringify(report, null, 2));
    return report;
  }

  parseTasks(tasksPath) {
    const content = fs.readFileSync(tasksPath, 'utf8');
    const tasks = [];

    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/-\s*\[([ x])\]\s*(.+)/);
      if (match) {
        tasks.push({
          status: match[1] === 'x' ? 'completed' : 'pending',
          completed: match[1] === 'x',
          title: match[2].trim(),
          failures: 0
        });
      }
    }

    return tasks;
  }

  resolveCommands(cwd, options) {
    return resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
    });
  }

  async executeFullLoop(task, changeDir, changeName, options) {
    const results = {
      task: task.title,
      stages: {}
    };

    for (const stage of this.loopStages) {
      // A stage with recorded pass evidence is not re-run: after RED
      // passes and the user implements, a re-invocation must resume at
      // GREEN — re-running RED would now fail as "tests already green"
      // and deadlock the loop.
      if (this.hasStageEvidence(changeDir, task.title, stage)) {
        console.log(chalk.bold(`\n${stage} Stage`));
        console.log(chalk.dim('─'.repeat(40)));
        console.log(chalk.green(`✓ ${stage} stage already passed (recorded evidence) — resuming`));
        results.stages[stage] = { success: true, skipped: true, evidence: true };
        continue;
      }

      console.log(chalk.bold(`\n${stage} Stage`));
      console.log(chalk.dim('─'.repeat(40)));

      const stageResult = await this.executeStage(stage, task, changeDir, changeName, options);
      results.stages[stage] = stageResult;

      if (!stageResult.success) {
        task.failures = (task.failures || 0) + 1;

        if (task.failures >= this.failureThreshold) {
          console.log(chalk.red(`\n⚠ Task failed ${task.failures} times. Circuit breaker triggered.`));
          console.log(chalk.yellow('Manual intervention recommended.'));
          await this.updateTaskStatus(changeDir, task, false, 'blocked');
          process.exitCode = 1;
          return { ...results, circuitBreaker: true, success: false };
        }

        console.log(chalk.red(`\n✗ ${stage} stage failed. Task failures: ${task.failures}`));
        process.exitCode = 1;
        return { ...results, success: false };
      }

      console.log(chalk.green(`✓ ${stage} stage ${stageResult.skipped ? 'skipped' : 'completed'}`));
    }

    await this.updateTaskStatus(changeDir, task, true, 'completed');
    console.log(chalk.green('\n✓ Task completed!'));
    return { ...results, success: true };
  }

  async executeNextStage(task, changeDir, changeName, options) {
    const requested = String(options.phase || '').toUpperCase();
    const currentStage = this.loopStages.includes(requested) ? requested : this.loopStages[0];
    const stageIndex = this.loopStages.indexOf(currentStage);

    // D04: a stage may only run when every earlier stage has recorded a
    // pass for this task — direct `--phase green` cannot bypass RED.
    const missing = [];
    for (let i = 0; i < stageIndex; i++) {
      const prior = this.loopStages[i];
      if (!this.hasStageEvidence(changeDir, task.title, prior)) missing.push(prior);
    }
    if (missing.length > 0) {
      console.log(chalk.red(`\n✗ ${currentStage} stage blocked: no recorded pass for ${missing.join(', ')}.`));
      console.log(chalk.yellow('  The TDD loop is sequential. Run the earlier stage(s) first, or run the'));
      console.log(chalk.yellow(`  full loop: stdd execute run ${changeName}`));
      process.exitCode = 1;
      return { success: false, blocked: true, missingStages: missing };
    }

    console.log(chalk.bold(`\n${currentStage} Stage`));
    console.log(chalk.dim('─'.repeat(40)));

    const result = await this.executeStage(currentStage, task, changeDir, changeName, options);

    if (result.success) {
      console.log(chalk.green(`✓ ${currentStage} stage ${result.skipped ? 'skipped' : 'completed'}`));
      const nextStageIndex = this.loopStages.indexOf(currentStage) + 1;
      if (nextStageIndex < this.loopStages.length) {
        console.log(chalk.cyan(`\nNext: ${this.loopStages[nextStageIndex]} stage`));
      } else {
        await this.updateTaskStatus(changeDir, task, true, 'completed');
        console.log(chalk.green('\n✓ Task completed!'));
      }
    } else {
      console.log(chalk.red(`\n✗ ${currentStage} stage failed`));
      process.exitCode = 1;
    }

    return result;
  }

  /** Recorded pass evidence for a ralph stage on a task (apply.log ledger). */
  hasStageEvidence(changeDir, taskTitle, stage) {
    const tag = this.stagePhaseTag[stage];
    if (!tag) return false;
    const key = taskKey(taskTitle);
    return readApplyLog(changeDir).some(entry => (
      entry.task
      && taskKey(entry.task) === key
      && entry.phase === tag
      && entry.status === 'passed'
    ));
  }

  writeStageLog(changeDir, changeName, task, stage, status, extra = {}) {
    const logPath = path.join(changeDir, 'apply.log');
    const entry = {
      timestamp: new Date().toISOString(),
      change: changeName,
      task: task.title,
      phase: this.stagePhaseTag[stage],
      status,
      ...extra,
    };
    fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  async executeStage(stage, task, changeDir, changeName, options) {
    switch (stage) {
      case 'RED':
        return this.executeRedStage(task, changeDir, changeName, options);
      case 'CHECK':
        return this.executeCheckStage(task, changeDir, changeName, options);
      case 'GREEN':
        return this.executeGreenStage(task, changeDir, changeName, options);
      case 'MUTATION':
        return this.executeMutationStage(task, changeDir, changeName, options);
      case 'REFACTOR':
        return this.executeRefactorStage(task, changeDir, changeName, options);
      default:
        return { success: false, error: 'Unknown stage' };
    }
  }

  /** Run the configured test commands; returns per-command results. */
  runTestCommands(cwd, changeDir, testCommands, options) {
    const results = [];
    for (const testCommand of testCommands) {
      const injected = injectReporter(testCommand.command, testCommand.cwd);
      console.log(`  Running ${chalk.cyan(testCommand.workspaceName)}: ${chalk.cyan(injected.command)}\n`);
      const env = injected.env ? { ...process.env, ...injected.env } : undefined;
      const result = runParsedCommand(injected.command, { cwd: testCommand.cwd, stdio: 'pipe', env });
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      if (result.error) console.error(`  ${chalk.red(`Command error: ${result.error.message}`)}`);
      results.push({
        workspaceName: testCommand.workspaceName,
        command: testCommand.command,
        passed: result.status === 0,
        infra: isInfraFailure(result),
      });
    }
    return results;
  }

  async executeRedStage(task, changeDir, changeName, options) {
    const cwd = options.cwd || process.cwd();
    const testCommands = this.resolveCommands(cwd, options);

    if (testCommands.length === 0) {
      console.log(chalk.red('\n❌ RED requires test commands to be configured.'));
      console.log(chalk.yellow('  Configure scripts.test / stdd/config.yaml test.command, or pass --test-command.'));
      return { success: false, error: 'no test command configured' };
    }

    console.log(chalk.dim(`Run the failing test for: ${task.title}`));
    const results = this.runTestCommands(cwd, changeDir, testCommands, options);

    const infraFailures = results.filter(r => r.infra);
    if (infraFailures.length > 0) {
      console.log(chalk.red(`\n❌ Test infrastructure failure — the suite never ran (${infraFailures.map(r => r.workspaceName).join(', ')}).`));
      console.log(chalk.yellow('  This is NOT RED evidence. Fix the test setup first.'));
      this.writeStageLog(changeDir, changeName, task, 'RED', 'failed', {
        error: 'infrastructure-failure',
        command: testCommands.map(tc => tc.command).join(' && '),
      });
      return { success: false, error: 'infrastructure-failure', results };
    }

    const allFailed = results.every(r => !r.passed);
    if (!allFailed) {
      const passed = results.filter(r => r.passed);
      console.log(chalk.red(`\n❌ RED violation: ${passed.length} test command(s) passed when they should fail.`));
      console.log(chalk.yellow('  Write the failing test for this task first, then re-run.'));
      this.writeStageLog(changeDir, changeName, task, 'RED', 'failed', {
        reason: 'tests already green — no failing test observed',
      });
      return { success: false, error: 'tests already green', results };
    }

    console.log(chalk.green('\n✅ Tests failed as expected (RED stage)'));
    this.writeStageLog(changeDir, changeName, task, 'RED', 'passed', {
      message: 'Tests observed failing via the configured test commands',
    });
    return { success: true, results };
  }

  async executeCheckStage(task, changeDir, changeName, options) {
    const cwd = options.cwd || process.cwd();
    const pkgPath = path.join(cwd, 'package.json');
    let lintCommand = options.lintCommand || null;
    if (!lintCommand && fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.scripts && pkg.scripts.lint) lintCommand = 'npm run lint';
      } catch { /* unreadable package.json — no lint */ }
    }

    if (!lintCommand) {
      // No lint configured: an explicit, labeled skip — not a silent pass.
      console.log(chalk.yellow('\n⚠ CHECK skipped: no lint script found (package.json scripts.lint or --lint-command).'));
      this.writeStageLog(changeDir, changeName, task, 'CHECK', 'skipped', { reason: 'no lint command configured' });
      return { success: true, skipped: true, message: 'no lint configured' };
    }

    console.log(chalk.dim(`Static analysis: ${lintCommand}`));
    const result = runParsedCommand(lintCommand, { cwd, stdio: 'pipe' });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status === 0) {
      this.writeStageLog(changeDir, changeName, task, 'CHECK', 'passed', { command: lintCommand });
      return { success: true, command: lintCommand };
    }
    console.log(chalk.red(`\n❌ CHECK failed: ${lintCommand} exited ${result.status === null ? 'with a spawn error' : `with code ${result.status}`}.`));
    this.writeStageLog(changeDir, changeName, task, 'CHECK', 'failed', { command: lintCommand });
    return { success: false, error: 'lint failed', command: lintCommand };
  }

  async executeGreenStage(task, changeDir, changeName, options) {
    const cwd = options.cwd || process.cwd();
    const testCommands = this.resolveCommands(cwd, options);

    if (testCommands.length === 0) {
      console.log(chalk.red('\n❌ GREEN requires test commands to be configured.'));
      return { success: false, error: 'no test command configured' };
    }

    console.log(chalk.dim('Tests must now pass with the minimal implementation.'));
    const results = this.runTestCommands(cwd, changeDir, testCommands, options);

    if (results.every(r => r.passed)) {
      console.log(chalk.green('\n✅ Tests passed (GREEN stage)'));
      this.writeStageLog(changeDir, changeName, task, 'GREEN', 'passed', {
        command: testCommands.map(tc => tc.command).join(' && '),
      });
      return { success: true, results };
    }

    const failed = results.filter(r => !r.passed);
    console.log(chalk.red(`\n❌ ${failed.length} test command(s) still failing (GREEN stage).`));
    console.log(chalk.yellow('  Implement the minimum code to make the tests pass, then re-run.'));
    this.writeStageLog(changeDir, changeName, task, 'GREEN', 'failed', {
      command: testCommands.map(tc => tc.command).join(' && '),
    });
    return { success: false, error: 'tests failing', results };
  }

  async executeMutationStage(task, changeDir, changeName, options) {
    const cwd = options.cwd || process.cwd();
    console.log(chalk.dim('Mutation gate (quick heuristic — not real mutation testing).'));
    try {
      const mutation = new MutationCommand(cwd).execute(changeName, { mode: options.mutationMode || 'quick' });
      if (mutation.status === 'pass') {
        this.writeStageLog(changeDir, changeName, task, 'MUTATION', 'passed', { score: mutation.score });
        return { success: true, score: mutation.score };
      }
      if (mutation.status === 'waived-by-config' || mutation.status === 'skip') {
        console.log(chalk.yellow(`\n⚠ Mutation gate ${mutation.status} — recorded, not blocking.`));
        this.writeStageLog(changeDir, changeName, task, 'MUTATION', 'skipped', { status: mutation.status });
        return { success: true, skipped: true, status: mutation.status };
      }
      console.log(chalk.red(`\n❌ Mutation gate failed (score ${mutation.score === null ? 'n/a' : mutation.score + '%'}).`));
      this.writeStageLog(changeDir, changeName, task, 'MUTATION', 'failed', { score: mutation.score });
      return { success: false, error: 'mutation gate failed', score: mutation.score };
    } catch (err) {
      // A crashing gate must never become a silent pass.
      console.log(chalk.red(`\n❌ Mutation gate could not run: ${err.message}`));
      this.writeStageLog(changeDir, changeName, task, 'MUTATION', 'failed', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  async executeRefactorStage(task, changeDir, changeName, options) {
    const cwd = options.cwd || process.cwd();
    const testCommands = this.resolveCommands(cwd, options);

    if (testCommands.length === 0) {
      console.log(chalk.red('\n❌ REFACTOR requires test commands to be configured.'));
      return { success: false, error: 'no test command configured' };
    }

    console.log(chalk.dim('Tests must stay green through the refactor.'));
    const results = this.runTestCommands(cwd, changeDir, testCommands, options);

    if (results.every(r => r.passed)) {
      console.log(chalk.green('\n✅ Tests still passing (REFACTOR stage)'));
      this.writeStageLog(changeDir, changeName, task, 'REFACTOR', 'passed', {
        command: testCommands.map(tc => tc.command).join(' && '),
      });
      return { success: true, results };
    }

    const failed = results.filter(r => !r.passed);
    console.log(chalk.red(`\n❌ ${failed.length} test command(s) failing after refactoring — behavior changed.`));
    console.log(chalk.yellow('  Refactoring must not change behavior. Revert and try again.'));
    this.writeStageLog(changeDir, changeName, task, 'REFACTOR', 'failed', {
      command: testCommands.map(tc => tc.command).join(' && '),
    });
    return { success: false, error: 'tests failing after refactor', results };
  }

  async updateTaskStatus(changeDir, task, done, statusLabel) {
    const tasksPath = path.join(changeDir, 'tasks.md');
    let content = fs.readFileSync(tasksPath, 'utf8');

    const checkbox = done ? '[x]' : '[ ]';
    content = content.replace(
      new RegExp(`-\\s*\\[[ x]\\]\\s*${this.escapeRegex(task.title)}`, 'm'),
      `${checkbox} ${task.title}`
    );

    fs.writeFileSync(tasksPath, content, 'utf8');
    if (!done) {
      // A blocked task is recorded in the ledger, not just on disk.
      this.writeStageLog(changeDir, path.basename(changeDir), task, 'REFACTOR', 'blocked', {
        reason: `circuit breaker: ${this.failureThreshold} consecutive stage failures`,
      });
    }
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = { ExecuteCommand };
