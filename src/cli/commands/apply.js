/**
 * Apply Command
 * TDD runner with Red → Green → Refactor phase enforcement
 * Each task must pass through all three phases before completion.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { spawnSync } = require('child_process');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');
const { injectReporter } = require('../../utils/reporter-injector');
const { resolveTestCommands, getConfigTestCommand } = require('../../utils/test-command-resolver');
const { commandToWorkspaceScope, resolveWorkspaceScope } = require('../../utils/workspace-scope');
const { runCommand: runParsedCommand } = require('../../utils/command-runner');
const { appendRuling, RULINGS_FILENAME } = require('../../utils/ruling-ledger');
const { recordInterruption } = require('../../utils/interruption');
const { readApplyLog } = require('../../utils/apply-log');
const { DELEGATION_ENGINES } = require('../../utils/delegation');
const { FixPacketCommand } = require('./fix-packet');

// TDD Phase State Machine
const TDD_PHASES = {
  RED: 'red',
  GREEN: 'green',
  REFACTOR: 'refactor',
  DONE: 'done',
};

const PHASE_LABELS = {
  red: '🔴 RED - Write failing test first',
  green: '🟢 GREEN - Minimal implementation',
  refactor: '🔵 REFACTOR - Improve code structure',
  done: '✅ DONE - Task complete',
};

const PHASE_ORDER = [TDD_PHASES.RED, TDD_PHASES.GREEN, TDD_PHASES.REFACTOR, TDD_PHASES.DONE];

function failNoTestCommand(phase = null) {
  const phasePrefix = phase ? `${phase.toUpperCase()} Phase ` : '';
  console.log(chalk.red(`\n❌ ${phasePrefix}requires test commands to be configured.`));
  console.log(chalk.yellow(`  Please configure a test command in stdd/config.yaml or pass --test-command`));
  console.log(chalk.dim(`  Use --allow-no-tests only for explicit non-code/documentation tasks.`));
  process.exitCode = 1;
}

function getCurrentPhase(taskPhase) {
  if (!taskPhase || !PHASE_ORDER.includes(taskPhase)) {
    return null;
  }
  return taskPhase;
}

function getTaskPhaseFromLine(taskLine) {
  const match = taskLine.match(/\[phase:(\w+)\]/);
  return match ? match[1] : null;
}

// getConfigTestCommand is imported from test-command-resolver module

function pickTask(tasks, options = {}) {
  if (options.task) {
    const target = String(options.task);
    return tasks.find(t =>
      !t.isDone && (t.description.includes(target) || t.line.includes(target))
    );
  }
  return tasks.find(t => !t.isDone);
}

function updateTaskLine(filePath, task, newStatus) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const oldLine = lines[task.index];
  if (!oldLine) {
    return;
  }
  const updatedLine = oldLine.replace(/\[([ ~x✓✓])\]/, `[${newStatus}]`);
  lines[task.index] = updatedLine;
  fs.writeFileSync(filePath, lines.join('\n'));
}

function updateTaskPhase(filePath, taskIndex, newPhase) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const oldLine = lines[taskIndex];
  if (!oldLine) return;

  let updatedLine = oldLine;
  if (/\[phase:\w+\]/.test(oldLine)) {
    updatedLine = oldLine.replace(/\[phase:\w+\]/, `[phase:${newPhase}]`);
  } else {
    updatedLine = oldLine.replace(/\]\s*/, `] [phase:${newPhase}] `);
  }
  lines[taskIndex] = updatedLine;
  fs.writeFileSync(filePath, lines.join('\n'));
}

function runCommand(cmd, cwd, additionalEnv) {
  const env = additionalEnv ? { ...process.env, ...additionalEnv } : undefined;
  return runParsedCommand(cmd, { cwd, stdio: 'inherit', env });
}

function writeLog(changeDir, entry) {
  const logPath = path.join(changeDir, 'apply.log');
  const line = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
  fs.appendFileSync(logPath, line);
}

function writeEvidence(changeDir, name, data) {
  const evidenceDir = path.join(changeDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const filePath = path.join(evidenceDir, `${name}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}

function countConsecutiveTaskFailures(changeDir, taskDescription) {
  const entries = readApplyLog(changeDir);
  let count = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.task !== taskDescription) continue;
    if (entry.status === 'failed') count++;
    else break;
  }
  return count;
}

function delegationPlan(resultStatus, testResults, options = {}) {
  if (resultStatus !== 'failed') return null;
  const engines = DELEGATION_ENGINES;
  return {
    trigger: 'apply-test-failure',
    strategy: options.delegate ? 'delegate-requested' : 'recommend-delegation',
    suggestedEngines: engines,
    reason: 'Tests failed during apply; request a fresh model or role to inspect failing output before retrying.',
    failedCommands: testResults.filter(r => !r.passed).map(r => ({ workspace: r.workspaceName, command: r.command })),
  };
}

class ApplyCommand {
  async execute(changeName, options = {}) {
    const cwd = process.cwd();
    const stddDir = path.join(cwd, 'stdd');

    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const changeDir = findActiveChange(stddDir, options.change || changeName);
    if (!changeDir) {
      throw new Error(options.change
        ? `Change '${options.change}' not found.`
        : 'No active changes found. Create one with `stdd new change <name>`.'
      );
    }

    const changeNameActual = path.basename(changeDir);
    const tasksPath = path.join(changeDir, 'tasks.md');
    const requestedWorkspace = options.workspace ? resolveWorkspaceScope(cwd, options.workspace) : null;

    // Ruling ledger action ("Rulings, not stalls"): record an execution-time
    // decision (决定 — 理由 — 出错了的代价) as a durable artifact, then exit
    // without running any task work.
    if (options.ruling) {
      const { n } = appendRuling(changeDir, options.ruling);
      console.log(chalk.yellow(`\n⚖ Ruling #${n} recorded in stdd/changes/${changeNameActual}/${RULINGS_FILENAME}`));
      console.log(chalk.dim('  Format: 决定 — 理由 — 出错了的代价. Feed back to later changes via stdd plan.'));
      return;
    }

    // Capture the pre-implementation git baseline once, so verification and
    // review can diff against the state before any code was written
    // (BMAD baseline_revision practice). Skipped in dry-run: a preview must
    // not mutate change state.
    if (!options.dryRun) {
      this.captureBaselineCommit(cwd, changeDir);
    }

    if (!fs.existsSync(tasksPath)) {
      throw new Error(`tasks.md not found in ${changeNameActual}. Add tasks before running apply.`);
    }

    const tasks = parseTasks(tasksPath);
    if (!tasks || tasks.length === 0) {
      throw new Error(`No tasks found in ${changeNameActual}/tasks.md.`);
    }

    const selectedTask = pickTask(tasks, { task: options.task });
    if (!selectedTask) {
      console.log(chalk.green(`\n✅ All tasks completed in ${changeNameActual}`));
      return;
    }

    // Determine current TDD phase for this task
    const taskPhase = getTaskPhaseFromLine(selectedTask.line) || getCurrentPhase(selectedTask.tddPhase);
    const requestedPhase = options.phase;

    // If no phase specified in task or request, use legacy mode (direct test-and-mark)
    const useLegacyMode = !taskPhase && !requestedPhase;

    if (useLegacyMode) {
      return this._executeLegacyMode(changeDir, changeNameActual, tasksPath, selectedTask, options, requestedWorkspace);
    }

    // If user requested a specific phase, validate the transition
    if (requestedPhase) {
      if (requestedPhase === TDD_PHASES.DONE) {
        throw new Error(`Cannot execute 'done' phase directly. It is set automatically after REFACTOR.`);
      }
      if (!PHASE_ORDER.includes(requestedPhase)) {
        throw new Error(`Invalid phase '${requestedPhase}'. Valid phases: red, green, refactor`);
      }

      const currentIdx = PHASE_ORDER.indexOf(taskPhase);
      const requestedIdx = PHASE_ORDER.indexOf(requestedPhase);

      if (requestedIdx < currentIdx) {
        throw new Error(`Cannot go back to phase '${requestedPhase}'. Current phase is '${taskPhase}'.`);
      }

      if (requestedIdx > currentIdx + 1) {
        throw new Error(`Cannot skip phase(s). Must complete '${taskPhase}' first before '${requestedPhase}'.`);
      }
    }

    // Determine the phase to execute
    const phase = requestedPhase || taskPhase;

    console.log(chalk.bold(`\n📌 Applying task in ${changeNameActual}:`));
    console.log(`  ${chalk.cyan(selectedTask.description)}`);
    console.log(`  ${PHASE_LABELS[phase]}\n`);

    if (options.dryRun) {
      const testCommands = resolveTestCommands(cwd, {
        testCommand: options.testCommand,
        configCommand: getConfigTestCommand(cwd),
        workspace: options.workspace,
      });
      console.log(`  ${chalk.yellow('Dry run mode')} — no commands will execute.`);
      if (testCommands.length > 0) {
        for (const testCommand of testCommands) {
          const rel = path.relative(cwd, testCommand.cwd) || '.';
          console.log(`  Test command would run (${testCommand.workspaceName}, ${rel}): ${chalk.cyan(testCommand.command)}`);
        }
      } else {
        console.log(`  ${chalk.dim('No test command configured.')}`);
      }
      return;
    }

    // RED Phase: Tests MUST fail before implementation
    if (phase === TDD_PHASES.RED) {
      return this._executeRedPhase(changeDir, changeNameActual, tasksPath, selectedTask, options, requestedWorkspace);
    }

    // GREEN Phase: Minimal implementation to make tests pass
    if (phase === TDD_PHASES.GREEN) {
      return this._executeGreenPhase(changeDir, changeNameActual, tasksPath, selectedTask, options, requestedWorkspace);
    }

    // REFACTOR Phase: Improve code structure while keeping tests green
    if (phase === TDD_PHASES.REFACTOR) {
      return this._executeRefactorPhase(changeDir, changeNameActual, tasksPath, selectedTask, options, requestedWorkspace);
    }
  }

  /**
   * 3-strikes escalation (superpowers systematic-debugging): three or more
   * consecutive failures on the same task is an architecture problem, not a
   * symptom to keep patching. Prints circuit-breaker guidance and records
   * escalation evidence for the fix-packet / handoff flow.
   */
  escalateOnRepeatedFailure(changeDir, changeName, task) {
    const consecutive = countConsecutiveTaskFailures(changeDir, task.description);
    if (consecutive < 3) return null;
    // A circuit-break is a human interruption — count it against the budget.
    recordInterruption(changeDir, `3-strikes: ${task.description}`);
    console.log(chalk.red(`\n🛑 ${consecutive} consecutive failures on "${task.description}"`));
    console.log(chalk.yellow('  Three failed fixes in a row is an architecture problem, not a symptom.'));
    console.log(chalk.yellow('  STOP patching. Re-examine the design (stdd plan), question the'));
    console.log(chalk.yellow('  approach, or hand off to a fresh agent/engine with this evidence.'));
    const evidencePath = writeEvidence(changeDir, 'escalation', {
      status: 'escalated',
      change: changeName,
      task: task.description,
      escalation: {
        consecutiveFailures: consecutive,
        rule: '3-strikes: consecutive failures indicate an architecture problem',
        guidance: 'Re-plan (stdd plan) or delegate to a fresh engine with the fix packet instead of patching symptoms.',
        task: task.description,
      },
    });
    console.log(chalk.yellow(`  Escalation evidence: ${path.relative(process.cwd(), evidencePath)}`));
    return evidencePath;
  }

  /**
   * Record `baseline_commit: "<sha>"` in stdd/changes/<name>/.state.yaml on
   * the first apply. Idempotent: an existing baseline is never overwritten.
   * Silently skipped outside a git repository.
   */
  captureBaselineCommit(cwd, changeDir) {
    try {
      const statePath = path.join(changeDir, '.state.yaml');
      if (fs.existsSync(statePath)) {
        const existing = fs.readFileSync(statePath, 'utf8');
        if (/^baseline_commit:/m.test(existing)) return;
      }
      const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' });
      if (result.status !== 0 || !result.stdout) return;
      const sha = result.stdout.trim();
      if (!/^[0-9a-f]{7,40}$/i.test(sha)) return;
      const line = `baseline_commit: "${sha}"`;
      if (fs.existsSync(statePath)) {
        // Guard the append: a file without a trailing newline would merge
        // the key into the last line and silently lose both.
        const existing = fs.readFileSync(statePath, 'utf8');
        const prefix = existing.endsWith('\n') ? '' : '\n';
        fs.appendFileSync(statePath, `${prefix}${line}\n`, 'utf8');
      } else {
        fs.writeFileSync(statePath, `# STDD change state\n${line}\n`, 'utf8');
      }
    } catch (err) {
      // Baseline capture is best-effort evidence; never block apply on it.
      writeLog(changeDir, {
        change: path.basename(changeDir),
        event: 'baseline-capture-skipped',
        reason: err.message,
      });
    }
  }

  /**
   * Anti fake-green evidence (report finding P0-1): a legacy-mode task may
   * only be marked done when the apply log holds RED evidence for it —
   * either a recorded failed run (tests observed failing, the existing
   * fix-packet flow) or an explicit RED-phase pass from the phase machine.
   * "Old tests already green" no longer completes a task.
   * Config failures never count: the no-test-command entry writes
   * status 'failed' with command '(none)' without ever running a test —
   * treating it as RED would let the fake green resurface (OCR finding).
   */
  _hasRedEvidence(changeDir, taskDescription) {
    const entries = readApplyLog(changeDir);
    return entries.some(entry => entry.task === taskDescription && (
      (entry.status === 'failed' && entry.command !== '(none)' && !entry.error)
      || (entry.phase === 'red' && entry.status === 'passed')
    ));
  }

  async _executeLegacyMode(changeDir, changeName, tasksPath, task, options, workspace) {
    const cwd = process.cwd();
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: workspace,
    });

    const e2eEvidence = options.e2eCommand ? this.runE2EProbe(options.e2eCommand, cwd, changeDir) : null;

    console.log(chalk.bold(`\n📌 Applying task in ${changeName}:`));
    console.log(`  ${chalk.cyan(task.description)}`);

    if (options.dryRun) {
      console.log(`  ${chalk.yellow('Dry run mode')} — no commands will execute.`);
      if (testCommands.length > 0) {
        for (const testCommand of testCommands) {
          const rel = path.relative(cwd, testCommand.cwd) || '.';
          console.log(`  Test command would run (${testCommand.workspaceName}, ${rel}): ${chalk.cyan(testCommand.command)}`);
        }
      } else {
        console.log(`  ${chalk.dim('No test command configured.')}`);
      }
      return;
    }

    updateTaskLine(tasksPath, task, '~');

    let resultStatus;
    const testResults = [];
    if (testCommands.length === 0) {
      // P0-1 Fix: In TDD mode, no test command should not silently complete.
      // Mark as failed and exit with error to enforce TDD discipline.
      failNoTestCommand();
      updateTaskLine(tasksPath, task, ' ');  // Keep task pending
      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        command: '(none)',
        workspaces: [],
        status: 'failed',
        error: 'No test command configured. TDD requires tests to run.',
      });
      return;
    } else {
      console.log(`\n  ${chalk.dim('📡 STDD Reporter linked for better evidence')}`);

      for (const testCommand of testCommands) {
        const injected = injectReporter(testCommand.command, testCommand.cwd);
        const testCmd = injected.command;
        const testEnv = injected.env;
        const label = testCommand.source === 'workspace'
          ? `${testCommand.workspaceName} (${path.relative(cwd, testCommand.cwd)})`
          : testCommand.workspaceName;

        console.log(`  Running ${chalk.cyan(label)}: ${chalk.cyan(testCmd)}\n`);

        let result = runCommand(testCmd, testCommand.cwd, testEnv);

        if (result.status !== 0 && injected.command !== testCommand.command) {
          console.log(chalk.dim(`  Reporter injection failed, retrying without reporter...`));
          result = runCommand(testCommand.command, testCommand.cwd);
        }

        testResults.push({
          workspaceName: testCommand.workspaceName,
          source: testCommand.source,
          cwd: testCommand.cwd,
          command: testCommand.command,
          passed: result.status === 0,
          workspace: commandToWorkspaceScope(cwd, testCommand),
        });
      }

      resultStatus = testResults.every(result => result.passed) ? 'passed' : 'failed';
    }

    let hasRedEvidence = false;
    if (resultStatus === 'passed') {
      // P0-1: green alone is not completion evidence. Without a recorded
      // RED for this task, the green may just be the pre-existing suite.
      hasRedEvidence = this._hasRedEvidence(changeDir, task.description);
      if (!options.allowNoTests && !hasRedEvidence) {
        console.log(chalk.red(`\n🛑 Green without RED: no failing-test evidence recorded for this task.`));
        console.log(chalk.yellow(`  A passing suite proves nothing about unimplemented work — old tests`));
        console.log(chalk.yellow(`  stay green while this task's behavior is missing.`));
        console.log(chalk.yellow(`  1. Write the failing test(s) for this task, then re-run apply —`));
        console.log(chalk.yellow(`     the failure is recorded as RED evidence (a fix packet is generated).`));
        console.log(chalk.yellow(`  2. Implement, then re-run apply to complete the task.`));
        console.log(chalk.dim(`  Non-code task (config/docs)? Re-run with --allow-no-tests (recorded).`));
        updateTaskLine(tasksPath, task, ' '); // keep pending
        const blockedEntry = {
          change: changeName,
          task: task.description,
          command: testCommands.map(tc => tc.command).join(' && '),
          workspaces: testResults,
          status: 'blocked-no-red-evidence',
          reason: 'suite green but no RED recorded for this task (anti fake-green)',
        };
        if (e2eEvidence) blockedEntry.e2e = e2eEvidence;
        writeLog(changeDir, blockedEntry);
        process.exitCode = 1;
        return;
      }
      if (options.allowNoTests && !hasRedEvidence) {
        console.log(chalk.dim(`  Completed without RED evidence (--allow-no-tests, recorded in log).`));
      }
      updateTaskLine(tasksPath, task, 'x');
      console.log(chalk.green(`\n✅ Task passed tests`));
    } else if (resultStatus === 'failed') {
      updateTaskLine(tasksPath, task, ' ');
      console.log(chalk.red(`\n✗ Task failed tests — reverted to pending`));
      const fixPacket = new FixPacketCommand(cwd).execute(changeName, {
        task: task.description,
        testCommand: testCommands.map(tc => tc.command).join(' && '),
        silent: true,
      });
      console.log(chalk.yellow(`  Fix packet: ${fixPacket.output}`));
    } else {
      throw new Error(`Unexpected result status: ${resultStatus}`);
    }

    const workspaceResults = testResults.map(result => result.workspace).filter(Boolean);
    const logEntry = {
      change: changeName,
      task: task.description,
      command: testCommands.length > 0 ? testCommands.map(tc => tc.command).join(' && ') : '(none)',
      workspaces: testResults,
      status: resultStatus,
    };
    if (resultStatus === 'passed' && options.allowNoTests && !hasRedEvidence) {
      logEntry.redEvidenceWaived = '--allow-no-tests';
    }
    if (workspace) logEntry.workspace = workspace;
    else if (workspaceResults.length === 1) logEntry.workspace = workspaceResults[0];
    else if (workspaceResults.length > 1) logEntry.workspaceScopes = workspaceResults;

    const delegation = delegationPlan(resultStatus, testResults, options);
    if (delegation) {
      logEntry.delegation = delegation;
      const evidencePath = writeEvidence(changeDir, 'delegation', {
        status: 'recommend',
        change: changeName,
        task: task.description,
        delegation,
      });
      console.log(chalk.yellow(`  Delegation evidence: ${path.relative(cwd, evidencePath)}`));
    }
    if (e2eEvidence) logEntry.e2e = e2eEvidence;
    writeLog(changeDir, logEntry);

    if (resultStatus === 'failed') {
      this.escalateOnRepeatedFailure(changeDir, changeName, task);
      process.exitCode = 1;
    }
  }

  async _executeRedPhase(changeDir, changeName, tasksPath, task, options, workspace) {
    const cwd = process.cwd();
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: workspace,
    });

    if (testCommands.length === 0) {
      if (options.allowNoTests) {
        console.log(chalk.yellow(`\n⚠ RED Phase skipped because --allow-no-tests was provided.`));
        updateTaskPhase(tasksPath, task.index, TDD_PHASES.GREEN);
        writeLog(changeDir, {
          change: changeName,
          task: task.description,
          phase: TDD_PHASES.RED,
          status: 'skipped',
          reason: '--allow-no-tests',
        });
        return;
      }
      failNoTestCommand(TDD_PHASES.RED);
      return;
    }

    // Run tests - they MUST fail in RED phase
    const testResults = await this._runTests(testCommands, cwd);
    const allFailed = testResults.every(r => !r.passed);

    if (!allFailed) {
      const passedTests = testResults.filter(r => r.passed);
      console.log(chalk.red(`\n❌ RED Phase Violation: ${passedTests.length} test(s) passed when they should fail!`));
      console.log(chalk.yellow(`  TDD requires tests to fail first before implementation.`));
      console.log(chalk.yellow(`  Please write a failing test for the new behavior.`));
      process.exitCode = 1;
      return;
    }

    console.log(chalk.green(`\n✅ Tests failed as expected (RED phase)`));
    updateTaskPhase(tasksPath, task.index, TDD_PHASES.GREEN);
    writeLog(changeDir, {
      change: changeName,
      task: task.description,
      phase: TDD_PHASES.RED,
      status: 'passed',
      message: 'Tests failed as expected, advancing to GREEN phase',
    });
  }

  async _executeGreenPhase(changeDir, changeName, tasksPath, task, options, workspace) {
    const cwd = process.cwd();
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: workspace,
    });

    const e2eEvidence = options.e2eCommand ? this.runE2EProbe(options.e2eCommand, cwd, changeDir) : null;

    if (testCommands.length === 0) {
      if (!options.allowNoTests) {
        failNoTestCommand(TDD_PHASES.GREEN);
        return;
      }
      console.log(chalk.yellow(`  No test command configured. Skipping test execution because --allow-no-tests was provided.`));
      updateTaskPhase(tasksPath, task.index, TDD_PHASES.REFACTOR);
      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.GREEN,
        status: 'skipped',
      });
      return;
    }

    console.log(`\n  ${chalk.dim('📡 STDD Reporter linked for better evidence')}`);

    const testResults = await this._runTests(testCommands, cwd);
    const allPassed = testResults.every(r => r.passed);

    if (allPassed) {
      console.log(chalk.green(`\n✅ Tests passed (GREEN phase)`));
      updateTaskPhase(tasksPath, task.index, TDD_PHASES.REFACTOR);

      const logEntry = {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.GREEN,
        command: testCommands.map(tc => tc.command).join(' && '),
        workspaces: testResults,
        status: 'passed',
      };
      if (workspace) logEntry.workspace = workspace;
      if (e2eEvidence) logEntry.e2e = e2eEvidence;
      writeLog(changeDir, logEntry);
    } else {
      const failedTests = testResults.filter(r => !r.passed);
      console.log(chalk.red(`\n❌ ${failedTests.length} test(s) still failing (GREEN phase)`));
      console.log(chalk.yellow(`  Implement the minimum code to make tests pass.`));

      const fixPacket = new FixPacketCommand(cwd).execute(changeName, {
        task: task.description,
        testCommand: testCommands.map(tc => tc.command).join(' && '),
        silent: true,
      });
      console.log(chalk.yellow(`  Fix packet: ${fixPacket.output}`));

      const delegation = delegationPlan('failed', testResults, options);
      if (delegation) {
        const evidencePath = writeEvidence(changeDir, 'delegation', {
          status: 'recommend',
          change: changeName,
          task: task.description,
          phase: TDD_PHASES.GREEN,
          delegation,
        });
        console.log(chalk.yellow(`  Delegation evidence: ${path.relative(cwd, evidencePath)}`));
      }

      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.GREEN,
        command: testCommands.map(tc => tc.command).join(' && '),
        workspaces: testResults,
        status: 'failed',
      });
      this.escalateOnRepeatedFailure(changeDir, changeName, task);
      process.exitCode = 1;
      return;
    }
  }

  async _executeRefactorPhase(changeDir, changeName, tasksPath, task, options, workspace) {
    const cwd = process.cwd();
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: workspace,
    });

    if (testCommands.length === 0) {
      if (!options.allowNoTests) {
        failNoTestCommand(TDD_PHASES.REFACTOR);
        return;
      }
      console.log(chalk.yellow(`  No test command configured. Marking complete because --allow-no-tests was provided.`));
      updateTaskLine(tasksPath, task, 'x');
      updateTaskPhase(tasksPath, task.index, TDD_PHASES.DONE);
      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.REFACTOR,
        command: '(none)',
        workspaces: [],
        status: 'skipped',
        reason: '--allow-no-tests',
      });
      return;
    }

    console.log(`\n  ${chalk.dim('📡 STDD Reporter linked for better evidence')}`);

    const testResults = await this._runTests(testCommands, cwd);
    const allPassed = testResults.every(r => r.passed);

    if (allPassed) {
      console.log(chalk.green(`\n✅ Tests still passing after refactoring (REFACTOR phase)`));
      updateTaskLine(tasksPath, task, 'x');
      updateTaskPhase(tasksPath, task.index, TDD_PHASES.DONE);

      const logEntry = {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.REFACTOR,
        command: testCommands.map(tc => tc.command).join(' && '),
        workspaces: testResults,
        status: 'passed',
      };
      if (workspace) logEntry.workspace = workspace;
      writeLog(changeDir, logEntry);

      console.log(chalk.green(`  Task marked as complete!`));
    } else {
      const failedTests = testResults.filter(r => !r.passed);
      console.log(chalk.red(`\n❌ ${failedTests.length} test(s) failing after refactoring!`));
      console.log(chalk.yellow(`  Refactoring must not change behavior. Revert and try again.`));

      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.REFACTOR,
        command: testCommands.map(tc => tc.command).join(' && '),
        workspaces: testResults,
        status: 'failed',
      });
      this.escalateOnRepeatedFailure(changeDir, changeName, task);
      process.exitCode = 1;
      return;
    }
  }

  async _runTests(testCommands, cwd) {
    const testResults = [];

    for (const testCommand of testCommands) {
      const injected = injectReporter(testCommand.command, testCommand.cwd);
      const testCmd = injected.command;
      const testEnv = injected.env;
      const label = testCommand.source === 'workspace'
        ? `${testCommand.workspaceName} (${path.relative(cwd, testCommand.cwd)})`
        : testCommand.workspaceName;

      console.log(`  Running ${chalk.cyan(label)}: ${chalk.cyan(testCmd)}\n`);

      let result = runCommand(testCmd, testCommand.cwd, testEnv);

      if (result.status !== 0 && injected.command !== testCommand.command) {
        console.log(chalk.dim(`  Reporter injection failed, retrying without reporter...`));
        result = runCommand(testCommand.command, testCommand.cwd);
      }

      testResults.push({
        workspaceName: testCommand.workspaceName,
        source: testCommand.source,
        cwd: testCommand.cwd,
        command: testCommand.command,
        passed: result.status === 0,
        workspace: commandToWorkspaceScope(cwd, testCommand),
      });
    }

    return testResults;
  }

  runE2EProbe(command, cwd, changeDir) {
    console.log(`\n  Running E2E probe: ${chalk.cyan(command)}\n`);
    const result = runCommand(command, cwd);
    const report = {
      status: result.status === 0 ? 'pass' : 'fail',
      command,
      timestamp: new Date().toISOString(),
    };
    const evidencePath = writeEvidence(changeDir, 'e2e', report);
    report.evidence = path.relative(cwd, evidencePath);
    return report;
  }
}

module.exports = { ApplyCommand };
