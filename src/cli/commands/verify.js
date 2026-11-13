/**
 * Verify Command
 * Validates that a change is ready for archival:
 *   - All tasks in tasks.md are completed.
 *   - Test suite passes.
 *   - (Optional) Lint / type check.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findActiveChange, checkTasksCompletion, taskKey } = require('../../utils/change-utils');
const { ConstitutionChecker } = require('./constitution-checker');
const EvidenceCapture = require('../../utils/evidence-capture');
const { injectReporter } = require('../../utils/reporter-injector');
const { resolveTestCommands, getConfigTestCommand } = require('../../utils/test-command-resolver');
const { commandToWorkspaceScope, resolveWorkspaceScope } = require('../../utils/workspace-scope');
const { findLatestMutationEvidence } = require('./mutation');
const { runCommand: runParsedCommand } = require('../../utils/command-runner');
const { readDeferred, appendDeferred, resolveDeferred, DEFERRED_FILENAME } = require('../../utils/deferred-work');
const { readChangeRigor, rigorNodeOptions } = require('../../utils/rigor');
const { readApplyLog } = require('../../utils/apply-log');

// getConfigTestCommand is now imported from test-command-resolver

function runCommand(cmd, cwd, additionalEnv) {
  const env = additionalEnv ? { ...process.env, ...additionalEnv } : undefined;
  return runParsedCommand(cmd, { cwd, stdio: 'pipe', env });
}

class VerifyCommand {
  /**
   * TDD RED-phase evidence gate: every task that went through the TDD phase
   * state machine must have a recorded RED pass (tests observed failing)
   * before its GREEN pass, otherwise the green may be fake. Legacy-mode
   * tasks (logged without phases) are counted but not blocked.
   */
  checkTDDEvidence(changeDir) {
    const logPath = path.join(changeDir, 'apply.log');
    if (!fs.existsSync(logPath)) {
      return { available: false, tasksWithPhaseEvidence: 0, withRedEvidence: 0, missingRed: [], legacyTasks: 0 };
    }
    const entries = readApplyLog(changeDir);
    const byTask = new Map();
    for (const entry of entries) {
      if (!entry.task) continue;
      // Phase transitions rewrite tasks.md lines with [phase:*] markers, so
      // the same task logs different text per phase. Key on the stable
      // TASK-### id (phase markers stripped) to correlate the evidence.
      const key = taskKey(entry.task);
      if (!byTask.has(key)) {
        byTask.set(key, { hasRed: false, hasGreen: false, isLegacy: true });
      }
      const state = byTask.get(key);
      if (entry.phase === 'red' && entry.status === 'passed') state.hasRed = true;
      if (entry.phase === 'green' && entry.status === 'passed') state.hasGreen = true;
      if (entry.phase) state.isLegacy = false;
    }
    let withRedEvidence = 0;
    let legacyTasks = 0;
    const missingRed = [];
    let tasksWithPhaseEvidence = 0;
    for (const [task, state] of byTask) {
      if (state.isLegacy) {
        legacyTasks++;
        continue;
      }
      tasksWithPhaseEvidence++;
      if (state.hasRed) withRedEvidence++;
      if (state.hasGreen && !state.hasRed) missingRed.push(task);
    }
    return { available: true, tasksWithPhaseEvidence, withRedEvidence, missingRed, legacyTasks };
  }

  async execute(changeName, options = {}) {
    const cwd = process.cwd();
    const stddDir = path.join(cwd, 'stdd');

    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const resolvedName = options.change || changeName;
    const changeDir = findActiveChange(stddDir, resolvedName);
    if (!changeDir) {
      throw new Error(resolvedName
        ? `Change '${resolvedName}' not found.`
        : 'No active changes found. Create one with `stdd new change <name>`.'
      );
    }

    // Deferred-work ledger management actions: record or resolve a deferred
    // finding, then exit without running the full verification.
    if (options.defer) {
      const { n } = appendDeferred(changeDir, options.defer, 'verify');
      console.log(chalk.yellow(`\n📝 Deferred #${n} recorded in stdd/changes/${path.basename(changeDir)}/${DEFERRED_FILENAME}`));
      console.log(chalk.dim('  Resolve later with: stdd verify <change> --resolve ' + n));
      return;
    }
    if (options.resolve !== undefined && options.resolve !== null) {
      const result = resolveDeferred(changeDir, options.resolve);
      if (result.resolved) {
        console.log(chalk.green(`\n✅ Deferred #${result.n} resolved`));
      } else {
        console.log(chalk.red(`\n✗ Could not resolve deferred item: ${result.reason}`));
        process.exitCode = 1;
      }
      return;
    }

    const changeNameActual = path.basename(changeDir);
    const report = { tasks: null, tests: null, lint: null, constitution: null, mutation: null };

    // Change-level rigor (recorded by ff/issue at creation): scale the gates
    // unless the user explicitly overrode them on this invocation.
    const changeRigor = readChangeRigor(changeDir);
    if (changeRigor) {
      const rigorOptions = rigorNodeOptions('stdd-verify', changeRigor);
      // Commander's negatable --no-constitution defaults to true when absent,
      // so `=== true` means "user did not explicitly disable it".
      if (options.constitution === true && rigorOptions.constitution === false) {
        options.constitution = false;
        // Record WHY the check is off: rigor downgrade vs explicit flag are
        // different audit facts (OCR finding on the P1-3 fix).
        options.constitutionSkipReason = `change rigor: ${changeRigor}`;
      }
      // --no-lint is the explicit escape from a strict change's lint default.
      if (options.lint === undefined && !options.noLint && rigorOptions.lint) options.lint = true;
      console.log(chalk.dim(`  Rigor: ${changeRigor} (from change state) — override with explicit flags`));
    }
    let healthy = true;
    const requestedWorkspace = options.workspace ? resolveWorkspaceScope(cwd, options.workspace) : null;

    // 1) Tasks check
    console.log(chalk.bold(`\n🔍 Verifying ${chalk.cyan(changeNameActual)}\n`));

    const taskCheck = checkTasksCompletion(changeDir);
    report.tasks = taskCheck;
    if (taskCheck.allDone) {
      console.log(`  ${chalk.green('✓')} Tasks: ${taskCheck.done}/${taskCheck.total} completed`);
    } else {
      console.log(`  ${chalk.red('✗')} Tasks: ${taskCheck.done}/${taskCheck.total} completed`);
      taskCheck.pending.forEach(d => {
        console.log(`      ${chalk.red('–')} ${d}`);
      });
      healthy = false;
    }

    // 2) Tests check
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: options.workspace,
    });
    if (testCommands.length > 0) {
      const testResults = [];
      console.log(`\n  📡 STDD Reporter linked for better evidence`);

      for (const testCommand of testCommands) {
        const injected = injectReporter(testCommand.command, testCommand.cwd);
        const testCmd = injected.command;
        const testEnv = injected.env;
        const label = testCommand.source === 'workspace'
          ? `${testCommand.workspaceName} (${path.relative(cwd, testCommand.cwd)})`
          : testCommand.workspaceName;

        console.log(`  Running ${chalk.cyan(label)}: ${chalk.cyan(testCmd)}`);

        let result = runCommand(testCmd, testCommand.cwd, testEnv);

        if (result.status !== 0 && result.error) {
          result.stderr = (result.stderr || '') + `\nCommand error: ${result.error.message}`;
        }

        if (result.status !== 0 && injected.command !== testCommand.command) {
          result = runCommand(testCommand.command, testCommand.cwd);
          if (result.error) {
            result.stderr = (result.stderr || '') + `\nCommand error: ${result.error.message}`;
          }
        }

        const testResult = {
          workspaceName: testCommand.workspaceName,
          source: testCommand.source,
          cwd: testCommand.cwd,
          command: testCommand.command,
          passed: result.status === 0,
          output: (result.stdout || ''),
          error: (result.stderr || ''),
        };
        const workspaceScope = commandToWorkspaceScope(cwd, testCommand);
        if (workspaceScope) {
          testResult.workspace = workspaceScope;
        }
        testResults.push(testResult);

        if (result.status === 0) {
          console.log(`  ${chalk.green('✓')} Tests (${label}): passed`);
        } else {
          console.log(`  ${chalk.red('✗')} Tests (${label}): failed`);
          if (result.stderr) {
            const tail = result.stderr.trim().split('\n').slice(-3).join('\n      ');
            console.log(`      ${chalk.dim(tail)}`);
          }
        }
      }

      const passed = testResults.every(result => result.passed);
      report.tests = {
        passed,
        output: testResults.map(result => result.output).filter(Boolean).join('\n'),
        error: testResults.map(result => result.error).filter(Boolean).join('\n'),
        workspaces: testResults,
      };
      const workspaceResults = testResults.map(result => result.workspace).filter(Boolean);
      if (requestedWorkspace) {
        report.tests.workspace = requestedWorkspace;
      } else if (workspaceResults.length === 1) {
        report.tests.workspace = workspaceResults[0];
      } else if (workspaceResults.length > 1) {
        report.tests.workspaces = testResults;
      }
      if (!passed) {
        healthy = false;
      }
    } else {
      console.log(`\n  ${chalk.yellow('⚠')} Tests: no test command configured (skipped)`);
      report.tests = { passed: null };
    }

    // 3) Constitution check
    if (options.constitution !== false) {
      console.log(`\n  ${chalk.bold('Constitution Compliance')}`);
      const checker = new ConstitutionChecker(cwd);
      const issues = checker.run();
      const hasBlocking = issues.blocking.length > 0;
      const hasWarnings = issues.warning.length > 0;
      report.constitution = { status: hasBlocking ? 'fail' : 'pass', issues };

      if (hasBlocking) {
        console.log(`  ${chalk.red('✗')} Constitution: ${issues.blocking.length} blocking issue(s)`);
        for (const b of issues.blocking) {
          console.log(`      ${chalk.red('✗')} Article ${b.article} (${b.name}): ${b.message}`);
        }
        healthy = false;
      } else if (hasWarnings) {
        console.log(`  ${chalk.yellow('⚠')} Constitution: passed with ${issues.warning.length} warning(s)`);
        for (const w of issues.warning) {
          console.log(`      ${chalk.yellow('⚠')} Article ${w.article} (${w.name}): ${w.message}`);
        }
      } else {
        console.log(`  ${chalk.green('✓')} Constitution: passed`);
      }

      if (issues.skipped.length > 0) {
        for (const s of issues.skipped) {
          console.log(`      ${chalk.dim('⊘ Article ' + s.article + ' (' + s.name + '): ' + s.reason)}`);
        }
      }
    } else {
      console.log(`\n  ${chalk.dim('Constitution: skipped (use --no-constitution)')}`);
      // An explicitly skipped check is NOT a pass — PASS/SKIPPED have
      // different audit meanings (report finding P1-3). Consumers
      // (evidence, archive summary) must render SKIPPED, not PASS.
      report.constitution = {
        status: 'skipped',
        reason: options.constitutionSkipReason || '--no-constitution',
        issues: { blocking: [], warning: [], info: [], skipped: [] },
      };
    }

    const mutationEvidence = findLatestMutationEvidence(cwd, {
      changeName: changeNameActual,
      workspace: requestedWorkspace || null,
    });
    if (mutationEvidence) {
      const score = (mutationEvidence.data.mutationScore !== undefined && mutationEvidence.data.mutationScore !== null) ? mutationEvidence.data.mutationScore : (mutationEvidence.data.score ?? null);
      report.mutation = {
        status: mutationEvidence.data.status,
        score,
        threshold: mutationEvidence.data.threshold,
        mode: mutationEvidence.data.mode,
        evidence: path.relative(cwd, mutationEvidence.filePath),
      };
      console.log(`\n  ${chalk.dim('Mutation: latest evidence')} ${report.mutation.status} (${score === null ? 'n/a' : score + '%'})`);
    } else {
      report.mutation = { status: 'skipped', reason: 'No mutation evidence found' };
      console.log(`\n  ${chalk.dim('Mutation: skipped (no evidence; run `stdd mutation`)')}`);
    }

    // 4) Optional lint check (--lint or --lint-command)
    if (options.lint || options.lintCommand) {
      const lintCmd = options.lintCommand || 'npm run lint';
      console.log(`\n  Running: ${chalk.cyan(lintCmd)}`);
      const result = runCommand(lintCmd, cwd);
      report.lint = { passed: result.status === 0, output: result.stdout, error: result.stderr };
      if (result.status === 0) {
        console.log(`  ${chalk.green('✓')} Lint: passed`);
      } else {
        // P0-4 Fix: Lint failure should affect verification health
        console.log(`  ${chalk.red('✗')} Lint: failed`);
        healthy = false;
      }
    } else {
      console.log(`\n  ${chalk.dim('Lint: skipped (use --lint to run "npm run lint")')}`);
      report.lint = null;
    }

    // 1.5) TDD RED-phase evidence gate (superpowers: watch the test fail)
    const tdd = this.checkTDDEvidence(changeDir);
    report.tdd = tdd;
    if (tdd.available) {
      if (tdd.missingRed.length > 0) {
        console.log(`  ${chalk.red('✗')} TDD: ${tdd.missingRed.length} task(s) reached GREEN without a recorded RED pass`);
        tdd.missingRed.forEach(d => {
          console.log(`      ${chalk.red('–')} ${d}`);
        });
        healthy = false;
      } else if (tdd.withRedEvidence > 0) {
        console.log(`  ${chalk.green('✓')} TDD: RED evidence present for ${tdd.withRedEvidence}/${tdd.tasksWithPhaseEvidence} task(s)${tdd.legacyTasks > 0 ? chalk.dim(` (+${tdd.legacyTasks} legacy)`) : ''}`);
      } else if (tdd.tasksWithPhaseEvidence > 0) {
        console.log(`  ${chalk.dim(`TDD: ${tdd.tasksWithPhaseEvidence} task(s) ran phases but recorded no RED pass (--allow-no-tests?)`)}`);
      } else if (tdd.legacyTasks > 0) {
        console.log(`  ${chalk.dim(`TDD: ${tdd.legacyTasks} legacy-mode task(s), no phase evidence to check`)}`);
      }
    }

    // 5) Deferred-work ledger status
    const deferred = readDeferred(changeDir);
    report.deferred = { open: deferred.open, total: deferred.total };

    // Summary
    console.log(chalk.bold('\n📊 Verification Report'));
    console.log(`  Tasks:       ${report.tasks.allDone ? chalk.green('PASS') : chalk.red('FAIL')}  (${report.tasks.done}/${report.tasks.total})`);
    if (report.tests.passed !== null) {
      console.log(`  Tests:       ${report.tests.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
      if (report.tests.workspaces && report.tests.workspaces.length > 1) {
        for (const result of report.tests.workspaces) {
          const rel = path.relative(cwd, result.cwd) || '.';
          console.log(`    ${result.workspaceName} (${rel}): ${result.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
        }
      }
    } else {
      console.log(`  Tests:       ${chalk.yellow('SKIP')}`);
    }
    const constitutionLabel = report.constitution.status === 'pass'
      ? chalk.green('PASS')
      : report.constitution.status === 'skipped' ? chalk.yellow('SKIPPED') : chalk.red('FAIL');
    console.log(`  Constitution: ${constitutionLabel}`);
    if (report.lint !== null) {
      console.log(`  Lint:        ${report.lint.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
    }
    if (report.tdd && report.tdd.available && report.tdd.tasksWithPhaseEvidence > 0) {
      const cell = report.tdd.missingRed.length > 0
        ? chalk.red('FAIL')
        : report.tdd.withRedEvidence > 0 ? chalk.green('PASS') : chalk.yellow('NOTE');
      console.log(`  TDD:         ${cell}  (RED evidence ${report.tdd.withRedEvidence}/${report.tdd.tasksWithPhaseEvidence})`);
    }
    if (deferred.total > 0) {
      console.log(`  Deferred:    ${deferred.open > 0 ? chalk.yellow(`${deferred.open} open / ${deferred.total} total`) : chalk.green(`0 open / ${deferred.total} total`)}`);
    }

    console.log('');

    const capture = new EvidenceCapture();
    const metadata = {
      changeName: changeNameActual,
      os: process.platform,
      nodeVersion: process.version,
      cwd,
    };
    const evidenceWorkspaceResults = report.tests && Array.isArray(report.tests.workspaces)
      ? report.tests.workspaces.map(result => result.workspace).filter(Boolean)
      : [];
    if (requestedWorkspace) {
      metadata.workspace = requestedWorkspace;
      report.workspace = requestedWorkspace;
    } else if (evidenceWorkspaceResults.length === 1) {
      metadata.workspace = evidenceWorkspaceResults[0];
      report.workspace = evidenceWorkspaceResults[0];
    } else if (evidenceWorkspaceResults.length > 1) {
      metadata.workspaces = evidenceWorkspaceResults;
      report.workspaces = evidenceWorkspaceResults;
    }
    const evidenceReport = capture.captureVerify('verify', report, metadata);
    const evidencePath = capture.saveToFile(evidenceReport, changeDir, 'verify');
    const relativeEvidencePath = path.relative(cwd, evidencePath);
    console.log(`  ${chalk.dim('📝 Evidence saved to')} ${chalk.cyan(relativeEvidencePath)}`);

    if (!healthy) {
      console.log(chalk.red(`✗ Verification failed for ${changeNameActual}`));
      process.exitCode = 1;
      // Escape hatch for orchestrators (graph run): throw instead of only
      // setting exit code, so parallel layers attribute the failure to THIS
      // node instead of a best-effort exit-code heuristic.
      if (options.throwOnFailure) throw new Error(`verification failed for ${changeNameActual}`);
      return;
    }

    console.log(chalk.green(`\n✅ Verification passed for ${changeNameActual}`));
  }
}

module.exports = { VerifyCommand };
