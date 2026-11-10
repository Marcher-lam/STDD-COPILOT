/**
 * Continue Command
 * Resume a paused `stdd apply` flow from the last active task.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');
const { ApplyCommand } = require('./apply');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('continue');

class ContinueCommand {
  /**
   * Update a task's checkbox status in tasks.md.
   */
  updateTaskLine(filePath, task, newStatus) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const oldLine = lines[task.index];
      if (!oldLine) return;
      lines[task.index] = oldLine.replace(/\[([ ~x])\]/, `[${newStatus}]`);
      fs.writeFileSync(filePath, lines.join('\n'));
    } catch (e) {
      throw new Error(`Failed to update task in ${path.basename(filePath)}: ${e.message}`);
    }
  }

  /**
   * Find the most recently active change (has tasks.md with unfinished tasks).
   */
  findMostRecentActiveChange(stddDir) {
    const changesDir = path.join(stddDir, 'changes');
    try {
      const entries = fs.readdirSync(changesDir, { withFileTypes: true });
      const candidates = entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'archive')
        .map(e => path.join(changesDir, e.name))
        .filter(dir => {
          const tasksPath = path.join(dir, 'tasks.md');
          if (!fs.existsSync(tasksPath)) return false;
          const tasks = parseTasks(tasksPath);
          if (!tasks || tasks.length === 0) return false;
          return tasks.some(t => !t.isDone);
        })
        .sort((a, b) => {
          // Prefer change with apply.log, sorted by mtime descending
          const aLog = path.join(a, 'apply.log');
          const bLog = path.join(b, 'apply.log');
          const aMtime = fs.existsSync(aLog) ? fs.statSync(aLog).mtimeMs : 0;
          const bMtime = fs.existsSync(bLog) ? fs.statSync(bLog).mtimeMs : 0;
          return bMtime - aMtime;
        });
      if (candidates.length === 0) return null;
      return candidates[0];
    } catch (err) {
      logger.warn(err.message);
      return null;
    }
  }

  /**
   * Read last line from apply.log (if exists).
   */
  readLastLogLine(changeDir) {
    const logPath = path.join(changeDir, 'apply.log');
    if (!fs.existsSync(logPath)) return null;
    try {
      const content = fs.readFileSync(logPath, 'utf-8').trim();
      if (!content) return null;
      const lines = content.split('\n');
      return lines[lines.length - 1];
    } catch (err) {
      logger.warn(err.message);
      return null;
    }
  }

  /**
   * Pick the task to continue on.
   * Priority: [~] in-progress > task from last failed log line > first [ ] pending.
   */
  pickContinueTask(tasks, changeDir, options = {}) {
    // Force: re-run last completed task for regression testing
    if (options.force) {
      const lastLog = this.readLastLogLine(changeDir);
      if (lastLog) {
        try {
          const payload = JSON.parse(lastLog.replace(/^\[.*?\] /, ''));
          if (payload && payload.task) {
            const match = tasks.find(t => t.description === payload.task);
            if (match) return match;
          }
        } catch (err) {
          logger.warn(err.message);
        }
      }
      // No log entry; pick last completed task
      const doneTasks = tasks.filter(t => t.isDone);
      if (doneTasks.length > 0) return doneTasks[doneTasks.length - 1];
    }

    // 1. Find in-progress task
    const inProgress = tasks.find(t => t.status === '~');
    if (inProgress) return inProgress;

    // 2. Check if last log was a failure — try to match task name
    const lastLog = this.readLastLogLine(changeDir);
    if (lastLog) {
      try {
        const payload = JSON.parse(lastLog.replace(/^\[.*?\] /, ''));
        if (payload && payload.status === 'failed' && payload.task) {
          // Look for a pending task matching the failed one
          const match = tasks.find(t => !t.isDone && t.description === payload.task);
          if (match) return match;
        }
      } catch (err) {
        logger.warn(err.message);
      }
    }

    // 3. First pending task
    const pending = tasks.find(t => !t.isDone);
    if (pending) return pending;

    // 4. All done
    return null;
  }

  async execute(changeName, options = {}) {
    const cwd = process.cwd();
    const stddDir = path.join(cwd, 'stdd');

    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    // 1. Locate the change
    let changeDir;
    if (changeName) {
      changeDir = findActiveChange(stddDir, changeName);
      if (!fs.existsSync(changeDir)) {
        throw new Error(`Change '${changeName}' not found.`);
      }
    } else {
      changeDir = this.findMostRecentActiveChange(stddDir);
      if (!changeDir) {
        throw new Error('No active changes found. Create one with `stdd new change <name>`.');
      }
    }

    const changeNameActual = path.basename(changeDir);
    const tasksPath = path.join(changeDir, 'tasks.md');

    if (!fs.existsSync(tasksPath)) {
      throw new Error(`tasks.md not found in ${changeNameActual}. Add tasks before continuing.`);
    }

    const tasks = parseTasks(tasksPath);
    if (!tasks || tasks.length === 0) {
      throw new Error(`No tasks found in ${changeNameActual}/tasks.md.`);
    }

    // 2. Check if all tasks are done
    const allDone = tasks.every(t => t.isDone);
    if (allDone && !options.force) {
      console.log(chalk.green(`\n✅ All tasks completed in ${changeNameActual}`));
      console.log(chalk.cyan('   Run `stdd verify` to validate the change.'));
      return;
    }

    // 3. Pick task
    const selectedTask = this.pickContinueTask(tasks, changeDir, options);

    if (!selectedTask) {
      console.log(chalk.green(`\n✅ All tasks completed in ${changeNameActual}`));
      console.log(chalk.cyan('   Run `stdd verify` to validate the change.'));
      return;
    }

    // 4. Show previous failure summary if applicable
    const lastLog = this.readLastLogLine(changeDir);
    if (lastLog) {
      try {
        const payload = JSON.parse(lastLog.replace(/^\[.*?\] /, ''));
        if (payload && payload.status === 'failed') {
          console.log(chalk.red(`\n⚠ Previous failure detected:`));
          console.log(chalk.red(`   Task: ${payload.task}`));
          console.log(chalk.red(`   Command: ${payload.command}`));
          console.log(chalk.yellow('   Retrying...\n'));
        }
      } catch (err) {
        logger.warn(err.message);
      }
    }

    // If task is marked complete (force mode), reset to pending so ApplyCommand can pick it
    if (selectedTask.isDone) {
      this.updateTaskLine(tasksPath, selectedTask, ' ');
      selectedTask.status = ' ';
      selectedTask.isDone = false;
    }

    // 5. Delegate to ApplyCommand with the task
    console.log(chalk.bold(`\n▶ Continuing change: ${changeNameActual}`));
    console.log(chalk.bold(`  Current task: ${selectedTask.description}\n`));

    const applyCommand = new ApplyCommand();
    await applyCommand.execute(changeNameActual, {
      task: selectedTask.description,
      testCommand: options.testCommand,
      dryRun: options.dryRun,
      allowNoTests: options.allowNoTests,
    });
  }
}

module.exports = { ContinueCommand };
