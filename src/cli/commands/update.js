/**
 * Update Command
 * Update STDD Copilot files in a project
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class UpdateCommand {
  constructor(spinner) {
    this.spinner = spinner;
  }

  async execute(targetPath, options = {}) {
    const stddDir = path.join(targetPath, 'stdd');

    // Check if STDD is initialized
    if (!await this.exists(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    // Update .claude commands
    this.spinner.text = 'Updating Claude commands...';
    await this.updateClaudeCommands(targetPath, options.force);

    // Update schemas if needed
    this.spinner.text = 'Updating schemas...';
    await this.updateSchemas(targetPath, options.force);

    console.log(chalk.green('\n✅ STDD Copilot updated!'));
  }

  async exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async updateClaudeCommands(targetPath, force) {
    const sourceDir = path.join(__dirname, '..', '..', '..', '.claude', 'commands', 'stdd');
    const targetDir = path.join(targetPath, '.claude', 'commands', 'stdd');

    if (await this.exists(sourceDir)) {
      const files = await fs.readdir(sourceDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const targetFile = path.join(targetDir, file);
          if (!await this.exists(targetFile) || force) {
            const content = await fs.readFile(path.join(sourceDir, file), 'utf-8');
            await fs.writeFile(targetFile, content);
          }
        }
      }
    }
  }

  async updateSchemas(targetPath, force) {
    // Similar to init, but only update if files don't exist or force is true
    // Implementation similar to InitCommand.copySchemas
  }
}

module.exports = { UpdateCommand };
