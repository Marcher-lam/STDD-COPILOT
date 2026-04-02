/**
 * Update Command
 * Update STDD Copilot files in a project
 */

const fs = require('fs').promises;
const path = require('path');
const { getPackageRoot } = require('../../utils/path-resolver');
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
    const sourceDir = path.join(getPackageRoot(), '.claude', 'commands', 'stdd');
    const supportedAgents = [
      ".claude",
      ".qwen",
      ".cursor",
      ".codex",
      ".kiro",
      ".codebuddy",
      ".vscode",
      ".openclaw",
      ".antigravity",
      ".opencode"
];

    for (const agent of selectedAgents) {
      const targetDir = path.join(targetPath, agent, 'commands', 'stdd');
      await this.updateDirContents(sourceDir, targetDir, force);
    }
  }

  async updateDirContents(sourceDir, targetDir, force) {
    if (await this.exists(sourceDir)) {
      await fs.mkdir(targetDir, { recursive: true });
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
    const sourceSchema = path.join(getPackageRoot(), 'schemas');
    const targetSchema = path.join(targetPath, 'schemas');

    if (!await this.exists(sourceSchema)) {
      return;
    }

    await fs.mkdir(targetSchema, { recursive: true });

    // Update spec-driven schema
    const schemaPath = path.join(sourceSchema, 'spec-driven', 'schema.yaml');
    if (await this.exists(schemaPath)) {
      const targetDir = path.join(targetSchema, 'spec-driven');
      await fs.mkdir(targetDir, { recursive: true });
      const targetFile = path.join(targetDir, 'schema.yaml');
      if (!await this.exists(targetFile) || force) {
        const content = await fs.readFile(schemaPath, 'utf-8');
        await fs.writeFile(targetFile, content);
      }
    }

    // Update templates
    const templatesDir = path.join(sourceSchema, 'spec-driven', 'templates');
    if (await this.exists(templatesDir)) {
      const targetTemplatesDir = path.join(targetSchema, 'spec-driven', 'templates');
      await fs.mkdir(targetTemplatesDir, { recursive: true });
      const files = await fs.readdir(templatesDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const targetFile = path.join(targetTemplatesDir, file);
          if (!await this.exists(targetFile) || force) {
            const content = await fs.readFile(path.join(templatesDir, file), 'utf-8');
            await fs.writeFile(targetFile, content);
          }
        }
      }
    }

    // Update constitution schemas if available
    const constitutionDir = path.join(sourceSchema, 'constitution');
    if (await this.exists(constitutionDir)) {
      const targetConstitutionDir = path.join(targetSchema, 'constitution');
      await fs.mkdir(targetConstitutionDir, { recursive: true });
      const files = await fs.readdir(constitutionDir);
      for (const file of files) {
        const srcFile = path.join(constitutionDir, file);
        const stat = await fs.stat(srcFile);
        if (stat.isFile()) {
          const targetFile = path.join(targetConstitutionDir, file);
          if (!await this.exists(targetFile) || force) {
            const content = await fs.readFile(srcFile, 'utf-8');
            await fs.writeFile(targetFile, content);
          }
        }
      }
    }

    // Update hooks schemas if available
    const hooksDir = path.join(sourceSchema, 'hooks');
    if (await this.exists(hooksDir)) {
      const targetHooksDir = path.join(targetSchema, 'hooks');
      await fs.mkdir(targetHooksDir, { recursive: true });
      const files = await fs.readdir(hooksDir);
      for (const file of files) {
        const srcFile = path.join(hooksDir, file);
        const stat = await fs.stat(srcFile);
        if (stat.isFile()) {
          const targetFile = path.join(targetHooksDir, file);
          if (!await this.exists(targetFile) || force) {
            const content = await fs.readFile(srcFile, 'utf-8');
            await fs.writeFile(targetFile, content);
          }
        }
      }
    }
  }
}

module.exports = { UpdateCommand };
