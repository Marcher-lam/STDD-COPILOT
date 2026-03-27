/**
 * Init Command
 * Initialize STDD Copilot in a project
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

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

在 Claude Code 中使用以下斜杠命令：

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
    const stddDir = path.join(targetPath, 'stdd');
    const claudeDir = path.join(targetPath, '.claude');

    // Check if already initialized
    const stddExists = await this.exists(stddDir);
    const claudeExists = await this.exists(claudeDir);

    if (stddExists && !options.force) {
      throw new Error('STDD already initialized. Use --force to overwrite.');
    }

    // Create directory structure
    this.spinner.text = 'Creating directory structure...';
    await this.createDirectories(targetPath);

    // Create AGENTS.md
    this.spinner.text = 'Creating AGENTS.md...';
    await this.createAgentsMd(targetPath);

    // Create stdd/config.yaml
    this.spinner.text = 'Creating config.yaml...';
    await this.createConfigYaml(targetPath);

    // Copy .claude commands
    this.spinner.text = 'Copying Claude commands...';
    await this.copyClaudeCommands(targetPath);

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

  async createDirectories(targetPath) {
    const dirs = [
      'stdd',
      'stdd/specs',
      'stdd/changes',
      'stdd/changes/archive',
      'stdd/memory',
      'stdd/graph',
      'stdd/explorations',
      '.claude/commands/stdd',
      '.claude/skills'
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(targetPath, dir), { recursive: true });
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

  async copyClaudeCommands(targetPath) {
    const sourceDir = path.join(__dirname, '..', '..', '..', '.claude', 'commands', 'stdd');
    const targetDir = path.join(targetPath, '.claude', 'commands', 'stdd');

    // Check if source exists
    if (await this.exists(sourceDir)) {
      const files = await fs.readdir(sourceDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(sourceDir, file), 'utf-8');
          await fs.writeFile(path.join(targetDir, file), content);
        }
      }
    } else {
      // Create minimal commands
      const commands = {
        'init.md': `---
description: Initialize STDD workspace
---

Initialize STDD workspace in current project. Creates stdd/ directory with specs/, changes/, memory/, graph/ subdirectories.`,
        'new.md': `---
description: Create new change proposal
arguments: "[change-description]"
---

Create a new change proposal with Delta Specs support.`,
        'apply.md': `---
description: Execute TDD cycle
---

Execute Ralph Loop TDD cycle for current change.`,
        'archive.md': `---
description: Archive completed change
---

Archive the completed change, merge Delta Specs to main specs.`,
        'graph.md': `---
description: Graph engine commands
---

Graph engine: visualize, analyze, run, parallel, history, replay, recommend.`
      };

      for (const [file, content] of Object.entries(commands)) {
        await fs.writeFile(path.join(targetDir, file), content);
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
