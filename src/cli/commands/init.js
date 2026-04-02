/**
 * Init Command
 * Initialize STDD Copilot in a project
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

// Template files
const AGENTS_MD_TEMPLATE = `# STDD Copilot - AI Agent Instructions

> Version: 1.0 | Last Updated: ${new Date().toISOString().split('T')[0]}

## Overview

STDD Copilot (Spec + Test Driven Development) 是一个融合了 SDD 和 TDD 最佳实践的 AI 辅助开发框架。

## 核心原则

1. **Spec-First**: 需求规格是 Source of Truth
2. **Test-Driven**: Ralph Loop 5步 TDD 循环
3. **Delta Specs**: 增量式变更管理
4. **5-Level Defense**: 防跑偏机制

## 可用命令

在支持的 AI Code 终端（Claude Code, Qwen Code, Cursor 等）中使用以下斜杠命令：

| 命令 | 说明 |
|------|------|
| \`/stdd:init\` | 初始化 STDD 工作区 |
| \`/stdd:new\` | 创建新变更提案 |
| \`/stdd:explore\` | 探索需求 |
| \`/stdd:ff\` | 快速生成 |
| \`/stdd:continue\` | 继续工作 |
| \`/stdd:apply\` | 执行 TDD 循环 |
| \`/stdd:verify\` | 验证实现 |
| \`/stdd:archive\` | 归档变更 |
| \`/stdd:graph *\` | Graph 引擎 |

## 工作流程

\`\`\`
/stdd:new → /stdd:apply → /stdd:archive
\`\`\`

详见: https://github.com/Marcher-lam/STDD-COPILOT
`;

const CONFIG_YAML_TEMPLATE = `# STDD Copilot Configuration
version: "1.0"
name: "${path.basename(process.cwd())}"

project:
  type: "\${PROJECT_TYPE:-node}"
  language: "\${LANGUAGE:-typescript}"

# Graph Configuration
graph:
  max_parallel: 4
  timeout: 3600
  history_limit: 100

# TDD Configuration
tdd:
  ralph_loop:
    max_iterations: 10
    failure_threshold: 3
    auto_rollback: true

  mutation:
    enabled: true
    threshold: 80

# Defense Mechanisms
defense:
  confirm_gate:
    enabled: true

  micro_task:
    max_tasks: 6
    max_time_minutes: 30

  failure_rollback:
    threshold: 3

# Memory System
memory:
  enabled: true
  persist: true
`;

const GITIGNORE_ENTRIES = `
# STDD Copilot
stdd/graph/cache/
stdd/memory/*.bin
.claude/tdd-guard/
`;

class InitCommand {
  constructor(spinner) {
    this.spinner = spinner;
  }

  async execute(targetPath, options = {}) {
    const inquirer = require('inquirer');
    
    // Check if already initialized
    const stddDir = path.join(targetPath, 'stdd');
    const claudeDir = path.join(targetPath, '.claude');

    // Check if already initialized
    const stddExists = await this.exists(stddDir);

    if (stddExists && !options.force) {
      throw new Error('STDD already initialized. Use --force to overwrite.');
    }

    const SUPPORTED_AGENTS = [
      { name: 'Claude Code (.claude)', value: '.claude', checked: true },
      { name: 'Qwen Code (.qwen)', value: '.qwen' },
      { name: 'Cursor (.cursor)', value: '.cursor' },
      { name: 'Codex (.codex)', value: '.codex' },
      { name: 'Kiro (.kiro)', value: '.kiro' },
      { name: 'CodeBuddy (.codebuddy)', value: '.codebuddy' },
      { name: 'VSCode (.vscode)', value: '.vscode' },
      { name: 'OpenClaw (.openclaw)', value: '.openclaw' },
      { name: 'Antigravity (.antigravity)', value: '.antigravity' },
      { name: 'OpenCode (.opencode)', value: '.opencode' }
    ];

    let selectedAgents = ['.claude']; // Default

    // In interactive mode, prompt user for extensions
    if (this.spinner) {
      if (this.spinner.stop) this.spinner.stop();
      console.log('\n');
      const answers = await inquirer.prompt([
        {
          type: 'checkbox',
          message: 'Select the AI CLI engines you want to support:',
          name: 'agents',
          choices: SUPPORTED_AGENTS,
          validate(answer) {
            if (answer.length < 1) {
              return 'You must choose at least one CLI engine.';
            }
            return true;
          },
        },
      ]);
      selectedAgents = answers.agents;
      if (this.spinner.start) this.spinner.start();
    }

    // Create directory structure
    this.spinner.text = 'Creating directory structure...';
    await this.createDirectories(targetPath, selectedAgents);

    // Create AGENTS.md
    this.spinner.text = 'Creating AGENTS.md...';
    await this.createAgentsMd(targetPath);

    // Create stdd/config.yaml
    this.spinner.text = 'Creating config.yaml...';
    await this.createConfigYaml(targetPath);

    // Copy .claude commands
    this.spinner.text = 'Copying Claude commands...';
    await this.copyClaudeCommands(targetPath, selectedAgents);

    // Copy skills payload
    this.spinner.text = 'Copying STDD skills...';
    await this.copySkills(targetPath, selectedAgents);

    // Copy schemas
    this.spinner.text = 'Copying schemas...';
    await this.copySchemas(targetPath);

    // Update .gitignore
    this.spinner.text = 'Updating .gitignore...';
    await this.updateGitignore(targetPath);

    // Print next steps
    this.printNextSteps();
  }

  async exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectories(targetPath, selectedAgents) {
    const baseDirs = [
      'stdd',
      'stdd/specs',
      'stdd/changes',
      'stdd/changes/archive',
      'stdd/memory',
      'stdd/graph',
      'stdd/explorations'
    ];

    for (const dir of baseDirs) {
      await fs.mkdir(path.join(targetPath, dir), { recursive: true });
    }

    for (const agent of selectedAgents) {
      await fs.mkdir(path.join(targetPath, agent, 'commands', 'stdd'), { recursive: true });
      await fs.mkdir(path.join(targetPath, agent, 'skills'), { recursive: true });
    }
  }

  async createAgentsMd(targetPath) {
    await fs.writeFile(
      path.join(targetPath, 'AGENTS.md'),
      AGENTS_MD_TEMPLATE
    );
  }

  async createConfigYaml(targetPath) {
    await fs.writeFile(
      path.join(targetPath, 'stdd', 'config.yaml'),
      CONFIG_YAML_TEMPLATE
    );
  }

  
  
  async copySkills(targetPath, selectedAgents) {
    const sourceDir = path.join(__dirname, '..', '..', '..', '.claude', 'skills');
    
    // Copy the entire skills directory recursively
    for (const agent of selectedAgents) {
      const targetDir = path.join(targetPath, agent, 'skills');
      if (await this.exists(sourceDir)) {
        await fs.mkdir(targetDir, { recursive: true });
        await require('fs').promises.cp(sourceDir, targetDir, { recursive: true });
      }
    }
  }

  async copyClaudeCommands(targetPath, selectedAgents) {
    const sourceDir = path.join(__dirname, '..', '..', '..', '.claude', 'commands', 'stdd');

    for (const agent of selectedAgents) {
      const targetDir = path.join(targetPath, agent, 'commands', 'stdd');
      await this.copyDirContents(sourceDir, targetDir);
    }
  }

  async copyDirContents(sourceDir, targetDir) {
    if (await this.exists(sourceDir)) {
      await fs.mkdir(targetDir, { recursive: true });
      const files = await fs.readdir(sourceDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(sourceDir, file), 'utf-8');
          await fs.writeFile(path.join(targetDir, file), content);
        }
      }
    }
  }

  async copySchemas(targetPath) {
    const sourceSchema = path.join(__dirname, '..', '..', '..', 'schemas');
    const targetSchema = path.join(targetPath, 'schemas');

    if (await this.exists(sourceSchema)) {
      await fs.mkdir(targetSchema, { recursive: true });

      // Copy schema.yaml
      const schemaPath = path.join(sourceSchema, 'spec-driven', 'schema.yaml');
      if (await this.exists(schemaPath)) {
        await fs.mkdir(path.join(targetSchema, 'spec-driven'), { recursive: true });
        const content = await fs.readFile(schemaPath, 'utf-8');
        await fs.writeFile(path.join(targetSchema, 'spec-driven', 'schema.yaml'), content);
      }

      // Copy templates
      const templatesDir = path.join(sourceSchema, 'spec-driven', 'templates');
      if (await this.exists(templatesDir)) {
        await fs.mkdir(path.join(targetSchema, 'spec-driven', 'templates'), { recursive: true });
        const files = await fs.readdir(templatesDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(templatesDir, file), 'utf-8');
            await fs.writeFile(
              path.join(targetSchema, 'spec-driven', 'templates', file),
              content
            );
          }
        }
      }
    }
  }

  async updateGitignore(targetPath) {
    const gitignorePath = path.join(targetPath, '.gitignore');

    let content = '';
    if (await this.exists(gitignorePath)) {
      content = await fs.readFile(gitignorePath, 'utf-8');
    }

    if (!content.includes('# STDD Copilot')) {
      await fs.appendFile(gitignorePath, GITIGNORE_ENTRIES);
    }
  }

  printNextSteps() {
    console.log(chalk.green('\n✅ STDD Copilot initialized!\n'));
    console.log(chalk.bold('Next steps:\n'));
    console.log('  1. In Claude Code, run:');
    console.log(chalk.cyan('     /stdd:new your-first-feature\n'));
    console.log('  2. Or start with exploration:');
    console.log(chalk.cyan('     /stdd:explore\n'));
    console.log('  3. View all commands:');
    console.log(chalk.cyan('     stdd commands\n'));
    console.log(chalk.dim('Documentation: https://github.com/Marcher-lam/STDD-COPILOT'));
  }
}

module.exports = { InitCommand };
