/**
 * Status Command
 * Show status of current work or specific change
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class StatusCommand {
  async execute(changeName, options = {}) {
    const stddDir = path.join(process.cwd(), 'stdd');

    if (!changeName) {
      await this.showOverallStatus(stddDir, options);
    } else {
      await this.showChangeStatus(stddDir, changeName, options);
    }
  }

  async showOverallStatus(stddDir, options) {
    console.log(chalk.bold('\n📊 STDD Copilot Status\n'));

    // Check initialization
    const configPath = path.join(stddDir, 'config.yaml');
    const isInitialized = await this.exists(configPath);

    if (!isInitialized) {
      console.log(chalk.yellow('⚠️  STDD not initialized in this directory.'));
      console.log(chalk.dim('   Run `stdd init` to get started.'));
      return;
    }

    console.log(chalk.green('✅ STDD initialized'));

    // Count specs
    const specsDir = path.join(stddDir, 'specs');
    const specCount = await this.countItems(specsDir);
    console.log(`📚 Specs: ${chalk.cyan(specCount)} domains`);

    // Count changes
    const changesDir = path.join(stddDir, 'changes');
    const changes = await this.getActiveChanges(changesDir);
    console.log(`🔄 Active changes: ${chalk.cyan(changes.length)}`);

    // Show current work
    if (changes.length > 0) {
      console.log(chalk.bold('\n  Current Changes:\n'));
      for (const change of changes.slice(0, 5)) {
        const status = await this.getDetailedStatus(path.join(changesDir, change));
        console.log(`    ${status.icon} ${chalk.cyan(change)}`);
        if (status.tasksProgress) {
          console.log(`       Tasks: ${status.tasksProgress}`);
        }
        if (status.phase) {
          console.log(`       Phase: ${status.phase}`);
        }
      }
      if (changes.length > 5) {
        console.log(chalk.dim(`    ... and ${changes.length - 5} more`));
      }
    }

    // Memory status
    const memoryDir = path.join(stddDir, 'memory');
    const memoryFiles = await this.countItems(memoryDir);
    console.log(`\n🧠 Memory: ${chalk.cyan(memoryFiles)} files`);

    if (options.json) {
      console.log('\n' + JSON.stringify({
        initialized: true,
        specs: specCount,
        changes: changes.length,
        memory: memoryFiles
      }, null, 2));
    }
  }

  async showChangeStatus(stddDir, changeName, options) {
    const changeDir = path.join(stddDir, 'changes', changeName);

    if (!await this.exists(changeDir)) {
      throw new Error(`Change '${changeName}' not found.`);
    }

    const status = await this.getDetailedStatus(changeDir);

    console.log(chalk.bold(`\n📋 Change: ${changeName}\n`));

    // Artifacts status
    console.log(chalk.bold('  Artifacts:'));
    console.log(`    ${status.hasProposal ? '✅' : '❌'} proposal.md`);
    console.log(`    ${status.hasSpecs ? '✅' : '❌'} specs/`);
    console.log(`    ${status.hasDesign ? '✅' : '❌'} design.md`);
    console.log(`    ${status.hasTasks ? '✅' : '❌'} tasks.md`);

    // Tasks progress
    if (status.totalTasks > 0) {
      console.log(chalk.bold('\n  Tasks:'));
      console.log(`    Progress: ${status.tasksCompleted}/${status.totalTasks}`);
      console.log(`    ${this.getProgressBar(status.tasksCompleted, status.totalTasks)}`);
    }

    // Phase
    if (status.phase) {
      console.log(chalk.bold('\n  Current Phase:'));
      console.log(`    ${status.phase}`);
    }

    if (options.json) {
      console.log('\n' + JSON.stringify(status, null, 2));
    }
  }

  async exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async countItems(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter(e => !e.name.startsWith('.')).length;
    } catch {
      return 0;
    }
  }

  async getActiveChanges(changesDir) {
    try {
      const entries = await fs.readdir(changesDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .filter(e => e.name !== 'archive')
        .map(e => e.name);
    } catch {
      return [];
    }
  }

  async getDetailedStatus(changeDir) {
    const status = {
      hasProposal: false,
      hasSpecs: false,
      hasDesign: false,
      hasTasks: false,
      tasksCompleted: 0,
      totalTasks: 0,
      tasksProgress: null,
      phase: null,
      icon: '❓'
    };

    // Check proposal
    try {
      await fs.access(path.join(changeDir, 'proposal.md'));
      status.hasProposal = true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(chalk.dim(`Warning: could not check proposal.md - ${error.message}`));
      }
    }

    // Check specs
    try {
      const specsDir = path.join(changeDir, 'specs');
      const files = await fs.readdir(specsDir);
      status.hasSpecs = files.some(f => f.endsWith('.md'));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(chalk.dim(`Warning: could not read specs/ - ${error.message}`));
      }
    }

    // Check design
    try {
      await fs.access(path.join(changeDir, 'design.md'));
      status.hasDesign = true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(chalk.dim(`Warning: could not check design.md - ${error.message}`));
      }
    }

    // Check tasks
    try {
      const tasksPath = path.join(changeDir, 'tasks.md');
      const content = await fs.readFile(tasksPath, 'utf-8');
      status.hasTasks = true;
      status.tasksCompleted = (content.match(/\[x\]/gi) || []).length;
      status.totalTasks = (content.match(/\[[ x]\]/gi) || []).length;
      if (status.totalTasks > 0) {
        status.tasksProgress = `${status.tasksCompleted}/${status.totalTasks}`;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(chalk.dim(`Warning: could not read tasks.md - ${error.message}`));
      }
    }

    // Determine phase
    if (!status.hasProposal) {
      status.phase = 'Phase 1: Proposal (pending)';
      status.icon = '📝';
    } else if (!status.hasSpecs) {
      status.phase = 'Phase 2: Specification';
      status.icon = '📋';
    } else if (!status.hasDesign) {
      status.phase = 'Phase 3: Design';
      status.icon = '🎨';
    } else if (status.totalTasks === 0 || status.tasksCompleted < status.totalTasks) {
      status.phase = 'Phase 4: Implementation';
      status.icon = '🔧';
    } else {
      status.phase = 'Phase 5: Verification';
      status.icon = '✅';
    }

    return status;
  }

  getProgressBar(completed, total) {
    const width = 30;
    const ratio = total > 0 ? completed / total : 0;
    const filled = Math.round(width * ratio);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percent = Math.round(ratio * 100);

    if (percent === 100) {
      return chalk.green(`    [${bar}] ${percent}%`);
    } else if (percent >= 50) {
      return chalk.yellow(`    [${bar}] ${percent}%`);
    } else {
      return chalk.red(`    [${bar}] ${percent}%`);
    }
  }
}

module.exports = { StatusCommand };
