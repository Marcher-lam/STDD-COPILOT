#!/usr/bin/env node

/**
 * STDD Copilot CLI
 * Spec + Test Driven Development Copilot
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { InitCommand } = require('./src/cli/commands/init');
const { UpdateCommand } = require('./src/cli/commands/update');
const { ListCommand } = require('./src/cli/commands/list');
const { NewCommand } = require('./src/cli/commands/new');
const { StatusCommand } = require('./src/cli/commands/status');
const hooksCommand = require('./src/cli/commands/hooks');

const program = new Command();
const packageJson = require('./package.json');

// Simple spinner implementation
function createSpinner(text) {
  let interval;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  return {
    start() {
      process.stdout.write(`${frames[i]} ${text}`);
      interval = setInterval(() => {
        i = (i + 1) % frames.length;
        process.stdout.write(`\r${frames[i]} ${text}`);
      }, 80);
      return this;
    },
    succeed(msg) {
      if (interval) clearInterval(interval);
      process.stdout.write(`\r${chalk.green('✓')} ${msg || text}\n`);
    },
    fail(msg) {
      if (interval) clearInterval(interval);
      process.stdout.write(`\r${chalk.red('✗')} ${msg || text}\n`);
    },
    text: ''
  };
}

program
  .name('stdd')
  .description('STDD Copilot - Spec + Test Driven Development Framework')
  .version(packageJson.version);

// Global options
program.option('--no-color', 'Disable color output');

// Init command
program
  .command('init [path]')
  .description('Initialize STDD Copilot in your project')
  .option('--force', 'Overwrite existing files')
  .option('--skip-skills', 'Skip copying skills directory')
  .action(async (targetPath = '.', options = {}) => {
    const spinner = createSpinner('Initializing STDD Copilot...').start();
    try {
      const resolvedPath = path.resolve(targetPath);
      const initCommand = new InitCommand(spinner);
      await initCommand.execute(resolvedPath, options);
      spinner.succeed('STDD Copilot initialized successfully!');
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Update command
program
  .command('update [path]')
  .description('Update STDD Copilot files in your project')
  .option('--force', 'Force update even when files exist')
  .action(async (targetPath = '.', options = {}) => {
    const spinner = createSpinner('Updating STDD Copilot...').start();
    try {
      const resolvedPath = path.resolve(targetPath);
      const updateCommand = new UpdateCommand(spinner);
      await updateCommand.execute(resolvedPath, options);
      spinner.succeed('STDD Copilot updated successfully!');
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List all changes or specs')
  .option('--changes', 'List changes (default)')
  .option('--specs', 'List specs')
  .option('--archived', 'Include archived items')
  .option('--json', 'Output as JSON')
  .action(async (options = {}) => {
    try {
      const listCommand = new ListCommand();
      await listCommand.execute('.', options);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Status command
program
  .command('status [change]')
  .description('Show status of a change or current work')
  .option('--json', 'Output as JSON')
  .action(async (changeName, options = {}) => {
    try {
      const statusCommand = new StatusCommand();
      await statusCommand.execute(changeName, options);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// New command group
const newCmd = program.command('new').description('Create new items');

newCmd
  .command('change <name>')
  .description('Create a new change proposal')
  .option('--title <title>', 'Change title')
  .option('--description <desc>', 'Change description')
  .action(async (name, options = {}) => {
    const spinner = createSpinner(`Creating change: ${name}...`).start();
    try {
      const newCommand = new NewCommand(spinner);
      await newCommand.createChange(name, options);
      spinner.succeed(`Change '${name}' created!`);
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    }
  });

newCmd
  .command('spec <domain>')
  .description('Create a new spec file')
  .action(async (domain, options = {}) => {
    const spinner = createSpinner(`Creating spec: ${domain}...`).start();
    try {
      const newCommand = new NewCommand(spinner);
      await newCommand.createSpec(domain, options);
      spinner.succeed(`Spec '${domain}' created!`);
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Skills command
program
  .command('skills')
  .description('List all available STDD skills')
  .option('--phase <phase>', 'Filter by phase (1-5)')
  .action(async (options = {}) => {
    try {
      const skillsPath = path.join(__dirname, '.claude', 'skills');
      const stddSkillsPath = path.join(__dirname, 'src', 'stdd-skills');

      console.log(chalk.bold('\n📚 STDD Copilot Skills\n'));

      // Core skills
      console.log(chalk.cyan('Core Skills:'));
      const coreSkills = fs.existsSync(path.join(__dirname, 'src', 'core-skills'))
        ? fs.readdirSync(path.join(__dirname, 'src', 'core-skills')).filter(f => !f.startsWith('.'))
        : [];
      coreSkills.forEach(skill => {
        console.log(`  • ${skill}`);
      });

      // Phase-based skills
      console.log(chalk.cyan('\nPhase-based Skills:'));
      [1, 2, 3, 4, 5].forEach(phase => {
        const phasePath = path.join(stddSkillsPath, `${phase}-*`);
        const phaseSkills = fs.existsSync(stddSkillsPath)
          ? fs.readdirSync(stddSkillsPath).filter(f => f.startsWith(`${phase}-`))
          : [];
        if (phaseSkills.length > 0) {
          const phaseNames = {
            1: 'Proposal',
            2: 'Specification',
            3: 'Design',
            4: 'Implementation',
            5: 'Verification'
          };
          console.log(`  ${chalk.yellow(`Phase ${phase}`)} (${phaseNames[phase]}):`);
          phaseSkills.forEach(skill => {
            console.log(`    • ${skill}`);
          });
        }
      });

      console.log(chalk.dim('\nUse in Claude Code: /stdd:<skill-name>'));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Commands reference
program
  .command('commands')
  .description('List all Claude Code slash commands')
  .action(async () => {
    console.log(chalk.bold('\n🔧 STDD Copilot Commands\n'));

    const commands = [
      { cmd: '/stdd:init', desc: 'Initialize STDD workspace' },
      { cmd: '/stdd:new', desc: 'Create new change proposal' },
      { cmd: '/stdd:explore', desc: 'Explore requirements' },
      { cmd: '/stdd:ff', desc: 'Fast-forward generation' },
      { cmd: '/stdd:continue', desc: 'Continue paused work' },
      { cmd: '/stdd:apply', desc: 'Apply change (TDD cycle)' },
      { cmd: '/stdd:verify', desc: 'Verify implementation' },
      { cmd: '/stdd:archive', desc: 'Archive completed change' },
      { cmd: '/stdd:constitution', desc: 'Constitution management' },
      { cmd: '/stdd:graph *', desc: 'Graph engine commands' },
    ];

    commands.forEach(({ cmd, desc }) => {
      console.log(`  ${chalk.cyan(cmd.padEnd(24))} ${desc}`);
    });

    console.log(chalk.dim('\nUse these commands in Claude Code conversations.'));
  });

// Hooks command (使用函数式导入)
hooksCommand(program);

// Constitution command
program
  .command('constitution [action]')
  .description('Manage STDD Constitution (9 articles)')
  .option('--article <n>', 'Specific article number')
  .option('--reason <reason>', 'Reason for waiver')
  .option('--days <days>', 'Waiver duration in days')
  .action(async (action = 'show', options = {}) => {
    try {
      const constitutionPath = path.join(__dirname, 'schemas', 'constitution', 'constitution.yaml');

      if (action === 'show') {
        console.log(chalk.bold('\n📋 STDD Constitution - 9 篇开发条例\n'));

        const articles = [
          { n: 1, name: 'Library-First', priority: 'Warning', desc: '优先使用成熟库' },
          { n: 2, name: 'TDD', priority: 'Blocking', desc: '测试先行' },
          { n: 3, name: 'Small Commits', priority: 'Warning', desc: '原子提交' },
          { n: 4, name: 'Code Style', priority: 'Warning', desc: '统一风格' },
          { n: 5, name: 'Documentation', priority: 'Suggestion', desc: '文档即代码' },
          { n: 6, name: 'Error Handling', priority: 'Warning', desc: '显式错误处理' },
          { n: 7, name: 'Security', priority: 'Blocking', desc: '安全优先' },
          { n: 8, name: 'Performance', priority: 'Suggestion', desc: '性能默认' },
          { n: 9, name: 'CI/CD', priority: 'Blocking', desc: '自动化流水线' },
        ];

        const blocking = articles.filter(a => a.priority === 'Blocking');
        const warning = articles.filter(a => a.priority === 'Warning');
        const suggestion = articles.filter(a => a.priority === 'Suggestion');

        console.log(chalk.red('Priority 1 (Blocking):'));
        blocking.forEach(a => {
          console.log(`  Article ${a.n}: ${chalk.bold(a.name)} - ${a.desc}`);
        });

        console.log(chalk.yellow('\nPriority 2 (Warning):'));
        warning.forEach(a => {
          console.log(`  Article ${a.n}: ${chalk.bold(a.name)} - ${a.desc}`);
        });

        console.log(chalk.blue('\nPriority 3 (Suggestion):'));
        suggestion.forEach(a => {
          console.log(`  Article ${a.n}: ${chalk.bold(a.name)} - ${a.desc}`);
        });

        console.log(chalk.dim('\n详情: stdd constitution show <article>'));
        console.log(chalk.dim('检查: stdd constitution check'));
      } else if (action === 'check') {
        console.log(chalk.bold('\n🔍 Constitution 合规检查\n'));
        console.log('请使用 Claude Code 运行: /stdd:constitution check');
      } else {
        console.log(`未知操作: ${action}`);
        console.log('可用操作: show, check, waiver');
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
