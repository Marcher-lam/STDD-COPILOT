/**
 * Plan Command
 * Evaluate architecture changes and generate micro-task list
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { createLogger } = require('../../utils/logger');
const { TechStackDetector } = require('../../utils/tech-stack-detector');
const { readDeferred } = require('../../utils/deferred-work');
const { readRulings } = require('../../utils/ruling-ledger');
const logger = createLogger('plan');

// Cross-cutting concern signals that justify a wider task budget.
const SCALE_RISK_RE = /migration|database|schema|\bauth\b|\bsecurity\b|\bpayment\b|\bapi\b|deploy|infra|integrat/i;

class PlanCommand {
  constructor() {
    // Task budget is adaptive (see resolveTaskBudget): the old hardcoded
    // 6-task cap was a weak-model compensation; scale-based budgets with a
    // config override (planning.max_tasks) fit strong base models better.
    this.maxTaskTime = 30;
    this.budgetFloor = 3;
    this.budgetCeiling = 10;
  }

  /**
   * Resolve the task budget for a change.
   *
   * `planning.max_tasks` in stdd/config.yaml pins an exact number; 'auto'
   * (or absent) derives the budget from proposal scale: base 4, +1/+2 for
   * scope items, +1 for long proposals, +1 for multiple cross-cutting risk
   * signals — clamped to [3, 10].
   */
  async resolveTaskBudget(proposal, cwd) {
    const pinned = await this.readConfiguredMaxTasks(cwd);
    if (Number.isFinite(pinned)) {
      return {
        budget: pinned,
        basis: 'config planning.max_tasks',
        scale: null,
      };
    }
    const scale = this.assessProposalScale(proposal);
    return { budget: scale.budget, basis: scale.basis, scale };
  }

  async readConfiguredMaxTasks(cwd) {
    try {
      const configPath = path.join(cwd, 'stdd', 'config.yaml');
      try {
        await fs.access(configPath);
      } catch {
        return null;
      }
      const config = yaml.load(await fs.readFile(configPath, 'utf8')) || {};
      const value = config && config.planning ? config.planning.max_tasks : undefined;
      if (value === undefined || value === null || value === 'auto') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch (err) {
      logger.warn(`Could not read planning config: ${err.message}`);
      return null;
    }
  }

  assessProposalScale(proposal) {
    const words = String(proposal || '').split(/\s+/).filter(Boolean).length;
    const scopeItems = this.countScopeItems(proposal);
    const riskSignals = Array.from(new Set(
      (proposal.match(new RegExp(SCALE_RISK_RE.source, 'gi')) || []).map(s => s.toLowerCase())
    ));

    let budget = 4;
    if (scopeItems >= 3) budget += 1;
    if (scopeItems >= 5) budget += 1;
    if (words >= 600) budget += 1;
    if (riskSignals.length >= 2) budget += 1;
    budget = Math.max(this.budgetFloor, Math.min(this.budgetCeiling, budget));

    const basis = [
      `~${words} words`,
      `${scopeItems} scope item(s)`,
      `risk signal(s): ${riskSignals.length > 0 ? riskSignals.slice(0, 4).join(', ') : 'none'}`,
      'override via planning.max_tasks',
    ].join(', ');

    return { words, scopeItems, riskSignals, budget, basis };
  }

  /** Count list items inside the (In) Scope section via a line scan. */
  countScopeItems(proposal) {
    const lines = String(proposal || '').split('\n');
    let inScope = false;
    let count = 0;
    for (const line of lines) {
      if (/^#{2,3}\s*(?:in[ _-]?)?scope\b/i.test(line)) {
        inScope = true;
        continue;
      }
      if (inScope && /^#{1,3}\s/.test(line)) break; // next heading ends the section
      if (inScope && /^\s*-\s+\S/.test(line)) count++;
    }
    return count;
  }

  /**
   * 终测复验 D09/D12: the registry wires `plan [action] [change]`, so the
   * first positional is the action when it is one of show/estimate/
   * dependencies/generate; anything else is a change name (default action:
   * generate). Programmatic callers keep (changeName, options).
   */
  async execute(firstArg, secondArg, thirdArg) {
    const KNOWN_ACTIONS = new Set(['generate', 'show', 'estimate', 'dependencies']);
    let action = 'generate';
    let changeName = null;
    let options = {};
    if (secondArg !== null && typeof secondArg === 'object' && !Array.isArray(secondArg)) {
      options = secondArg;
      changeName = firstArg || null;
    } else if (firstArg && KNOWN_ACTIONS.has(String(firstArg))) {
      action = String(firstArg);
      changeName = secondArg || null;
      options = (thirdArg && typeof thirdArg === 'object') ? thirdArg : {};
    } else {
      changeName = firstArg || null;
      options = (secondArg && typeof secondArg === 'object') ? secondArg : ((thirdArg && typeof thirdArg === 'object') ? thirdArg : {});
    }

    const stddDir = path.join(process.cwd(), 'stdd');
    const changesDir = path.join(stddDir, 'changes');
    const changeDir = changeName
      ? path.join(changesDir, changeName)
      : await this.getActiveChangeDir(changesDir);

    if (!changeDir) {
      throw new Error('No active change found. Use `stdd new change <name>` first.');
    }

    if (action === 'show') return this.showTasks(changeDir, options);
    if (action === 'estimate') return this.showEstimates(changeDir, options);
    if (action === 'dependencies') return this.showDependencies(changeDir, options);

    const proposalPath = path.join(changeDir, 'proposal.md');
    const proposalExists = await this.fileExists(proposalPath);

    if (!proposalExists) {
      throw new Error(`No proposal found. Create a proposal first.`);
    }

    const proposal = await fs.readFile(proposalPath, 'utf-8');
    const techStack = TechStackDetector.analyze(process.cwd());

    console.log('');
    console.log(chalk.bold('📋 Generating Task Breakdown'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');
    console.log(chalk.dim('Analyzing requirements and tech stack...'));
    console.log('');

    const taskBudget = await this.resolveTaskBudget(proposal, process.cwd());
    console.log(chalk.dim(`Task Budget: ${taskBudget.budget} (basis: ${taskBudget.basis})`));
    console.log('');

    const tasks = await this.generateTasks(proposal, techStack, taskBudget.budget);
    const tasksContent = this.formatTasks(tasks);

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run - tasks not saved'));
      console.log('');
      console.log(tasksContent);
      return tasks;
    }

    const tasksPath = path.join(changeDir, 'tasks.md');
    const intelligence = await this.buildPreviousIntelligence(stddDir);
    await fs.writeFile(tasksPath, intelligence ? `${tasksContent.trimEnd()}\n${intelligence}` : tasksContent);

    console.log(chalk.green(`✓ Tasks generated: ${tasksPath}`));
    console.log('');
    this.printTaskSummary(tasks);
    console.log('');
    console.log(chalk.cyan(`Next step: stdd apply ${path.basename(changeDir)}`));
    console.log('');

    return tasks;
  }

  async getActiveChangeDir(changesDir) {
    try {
      const statusPath = path.join(process.cwd(), 'stdd', '.status.yaml');
      const statusExists = await this.fileExists(statusPath);

      if (statusExists) {
        const status = await fs.readFile(statusPath, 'utf-8');
        const match = status.match(/active_change:\s*(.+)/);
        if (match && match[1].trim() !== 'none') {
          const changeDir = path.join(changesDir, match[1].trim());
          const exists = await this.fileExists(changeDir);
          if (exists) return changeDir;
        }
      }

      const entries = await fs.readdir(changesDir, { withFileTypes: true });
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

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async generateTasks(proposal, techStack, budget) {
    const requirements = this.extractRequirements(proposal);
    const tasks = [];

    const taskTemplates = this.getTaskTemplates(requirements, techStack, proposal);

    const limit = Math.min(taskTemplates.length, budget);
    if (taskTemplates.length > limit) {
      console.log(chalk.yellow(`⚠ Proposal scale exceeds the task budget (${taskTemplates.length} candidate tasks > ${limit}).`));
      console.log(chalk.yellow('  Consider splitting the change (a proposal this large is usually an Epic).'));
      console.log('');
    }

    for (let i = 0; i < limit; i++) {
      tasks.push({
        id: `TASK-${String(i + 1).padStart(3, '0')}`,
        title: taskTemplates[i].title,
        description: taskTemplates[i].description,
        estimatedMinutes: taskTemplates[i].estimatedMinutes || this.maxTaskTime,
        dependencies: taskTemplates[i].dependencies || []
      });
    }

    return tasks;
  }

  extractRequirements(proposal) {
    const requirements = {
      title: this.extractField(proposal, 'title') || 'Untitled',
      description: this.extractField(proposal, 'description') || '',
      scope: this.extractField(proposal, 'scope') || '',
      constraints: this.extractField(proposal, 'constraints') || '',
      acceptance: this.extractField(proposal, 'acceptance') || this.extractField(proposal, 'success_criteria') || ''
    };

    return requirements;
  }

  extractField(content, fieldName) {
    const patterns = [
      new RegExp(`^#+\\s*${fieldName}\\s*\\n([\\s\\S]+?)(?=\\n#+|\\n*$)`, 'im'),
      new RegExp(`\\*\\*${fieldName}\\*\\*:\\s*([\\s\\S]+?)(?=\\n\\*\\*|\\n*$)`, 'im'),
      new RegExp(`${fieldName}:\\s*([\\s\\S]+?)(?=\\n\\w+:|\\n*$)`, 'im')
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  getTaskTemplates(requirements, techStack, proposal = '') {
    // Derive implementation tasks from the proposal's In-Scope items —
    // task CONTENT follows the change, not a fixed template. Quality-gate
    // and refactor scaffolding fill the remaining budget.
    const scopeItems = this.extractScopeItems(proposal);
    const templates = [];
    for (const item of scopeItems) {
      templates.push({
        title: `Implement: ${item}`,
        description: `Failing test first, then minimal implementation for: ${item}`,
        estimatedMinutes: 30,
        dependencies: templates.length === 0 ? [] : [templates[templates.length - 1].id || `TASK-${String(templates.length).padStart(3, '0')}`],
      });
    }
    templates.push(...this.getSupportTemplates(scopeItems.length > 0));
    return templates.slice(0, 10);
  }

  /**
   * Extract In-Scope items from the proposal's (In) Scope section via a
   * line scan. extractField's multiline `$` lookahead truncates the section
   * to its first line, so it cannot be used here.
   */
  extractScopeItems(proposal) {
    const lines = String(proposal || '').split('\n');
    const items = [];
    let inScope = false;
    for (const line of lines) {
      if (/^#{2,3}\s*(in[ _-]?)?scope\b/i.test(line)) { inScope = true; continue; }
      if (inScope && /^#{1,3}\s/.test(line)) break;
      if (!inScope) continue;
      const match = line.match(/^\s*-\s+(?:\[[ xX]?\]\s*)?(.+)$/);
      if (!match) continue;
      const text = match[1].trim();
      if (text.length > 2 && !/^(高级特性|性能优化|out of scope|排除)/i.test(text)) {
        items.push(text);
      }
    }
    return items.slice(0, 8);
  }

  getSupportTemplates(hasScopeTasks) {
    const support = [
      {
        title: 'Add error handling and edge cases',
        description: 'Handle invalid inputs and boundary conditions',
        estimatedMinutes: 30,
        dependencies: []
      },
      {
        title: 'Run mutation testing',
        description: 'Verify tests detect code mutations',
        estimatedMinutes: 30,
        dependencies: []
      }
    ];
    if (!hasScopeTasks) {
      support.unshift(
        {
          title: 'Set up test infrastructure',
          description: 'Configure test framework, test environment, and testing utilities',
          estimatedMinutes: 30,
          dependencies: []
        },
        {
          title: 'Write failing tests for core functionality',
          description: 'Create test cases that define the expected behavior',
          estimatedMinutes: 30,
          dependencies: []
        },
        {
          title: 'Implement core functionality',
          description: 'Write the minimum code to make tests pass',
          estimatedMinutes: 30,
          dependencies: []
        }
      );
    }
    return support;
  }

  /**
   * Previous Change Intelligence (BMAD create-story practice): feed the
   * still-open deferred-work items of the most recently archived change
   * back into the new task list so deferred findings loop instead of
   * rotting in the archive. Returns '' when there is nothing to feed back.
   */
  async buildPreviousIntelligence(stddDir) {
    try {
      const archiveDir = path.join(stddDir, 'changes', 'archive');
      const exists = await this.fileExists(archiveDir);
      if (!exists) return '';
      const entries = await fs.readdir(archiveDir, { withFileTypes: true });
      const names = entries.filter(e => e.isDirectory()).map(e => e.name);
      if (names.length === 0) return '';
      // Archive names are `<change>-<YYYYMMDDHHMMSS>`: sorting lexicographically
      // is dominated by the change-name prefix — sort by the trailing timestamp.
      const tsOf = name => (name.match(/-(\d{14})$/) || [])[1] || '';
      const latest = names.reduce((a, b) => (tsOf(b) > tsOf(a) ? b : a));
      const state = readDeferred(path.join(archiveDir, latest));
      const openItems = state.entries.filter(e => !e.checked);
      const rulings = readRulings(path.join(archiveDir, latest));
      const recentRulings = rulings.entries.slice(-3).reverse();
      if (openItems.length === 0 && recentRulings.length === 0) return '';

      const lines = [
        '',
        '---',
        '',
        '## Previous Change Intelligence',
        '',
        `> 来自最近归档变更 \`${latest}\`：`,
        '',
      ];
      if (openItems.length > 0) {
        lines.push('**未决暂缓项**（defer 不是丢弃）：');
        lines.push('');
        for (const item of openItems) {
          // NOT a checkbox: `- [ ]` matches TASK_PATTERN and would make every
          // consumer treat these findings as real tasks (verify FAIL / archive
          // blocked). Use a suspended-marker bullet instead.
          lines.push(`- ⏸ #${item.n} [${item.date}] ${item.text}`);
          lines.push(`  - Source: stdd/changes/archive/${latest}/deferred-work.md`);
        }
        lines.push('');
      }
      if (recentRulings.length > 0) {
        lines.push('**Recent Rulings**（上一变更的执行裁决，本变更需遵守或显式推翻）：');
        lines.push('');
        for (const ruling of recentRulings) {
          lines.push(`- #${ruling.n} [${ruling.date}] ${ruling.text}`);
          lines.push(`  - Source: stdd/changes/archive/${latest}/rulings.md`);
        }
        lines.push('');
      }
      lines.push('在本次变更中评估是否处理以上事项；暂不处理则继续以 `stdd verify <change> --defer` 记录。');
      lines.push('');
      return lines.join('\n');
    } catch (err) {
      logger.warn(`Previous change intelligence skipped: ${err.message}`);
      return '';
    }
  }

  formatTasks(tasks) {
    let content = `# Task Breakdown\n\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;
    content += `## Tasks\n\n`;

    for (const task of tasks) {
      // Canonical `TASK-NNN: title` form (no bold) so every consumer —
      // including the strict spec-generator parser — can read the line.
      // The `[phase:red]` marker puts the task on the TDD state machine's
      // default path: apply enforces RED → GREEN → REFACTOR with recorded
      // evidence instead of falling back to legacy mark-done (终测复验 D12).
      content += `- [ ] ${task.id}: ${task.title} [phase:red]\n`;
      content += `  - Estimated: ${task.estimatedMinutes} minutes\n`;
      if (task.dependencies.length > 0) {
        content += `  - Dependencies: ${task.dependencies.join(', ')}\n`;
      }
      if (task.description) {
        content += `  - ${task.description}\n`;
      }
      content += `\n`;
    }

    content += `## Guidelines\n\n`;
    content += `- Each task should be completable in ~${this.maxTaskTime} minutes\n`;
    content += `- Follow TDD: Red → Green → Refactor\n`;
    content += `- Mark tasks as completed when done\n\n`;

    return content;
  }

  /** `stdd plan show <change>`: read-only view of the current task list. */
  showTasks(changeDir, options = {}) {
    const tasksPath = path.join(changeDir, 'tasks.md');
    if (!fsSync.existsSync(tasksPath)) {
      throw new Error(`No tasks.md found in ${path.basename(changeDir)}. Run \`stdd plan ${path.basename(changeDir)}\` first.`);
    }
    const content = fsSync.readFileSync(tasksPath, 'utf-8');
    const tasks = [];
    for (const line of content.split('\n')) {
      const m = line.match(/^(\s*- )\[([ ~x])\]\s*(.+)$/);
      if (m) {
        const phase = (m[3].match(/\[phase:(\w+)\]/) || [])[1] || null;
        tasks.push({
          status: m[2] === 'x' ? 'done' : m[2] === '~' ? 'in-progress' : 'pending',
          phase,
          title: m[3].replace(/\s*\[phase:\w+\]/g, '').trim(),
        });
      }
    }
    if (options.json) {
      console.log(JSON.stringify({ change: path.basename(changeDir), tasks }, null, 2));
      return tasks;
    }
    console.log(chalk.bold(`\n📋 Tasks: ${chalk.cyan(path.basename(changeDir))}\n`));
    if (tasks.length === 0) {
      console.log(chalk.dim('  No tasks found.'));
      return tasks;
    }
    for (const t of tasks) {
      const icon = t.status === 'done' ? chalk.green('[x]') : t.status === 'in-progress' ? chalk.yellow('[~]') : chalk.dim('[ ]');
      const phase = t.phase ? chalk.dim(` (phase:${t.phase})`) : '';
      console.log(`  ${icon} ${t.title}${phase}`);
    }
    console.log('');
    return tasks;
  }

  /** `stdd plan estimate <change>`: per-task time estimates. */
  showEstimates(changeDir, options = {}) {
    const tasksPath = path.join(changeDir, 'tasks.md');
    if (!fsSync.existsSync(tasksPath)) {
      throw new Error(`No tasks.md found in ${path.basename(changeDir)}.`);
    }
    const lines = fsSync.readFileSync(tasksPath, 'utf-8').split('\n');
    const estimates = [];
    for (const [i, line] of lines.entries()) {
      const taskMatch = line.match(/^(\s*- )\[([ ~x])\]\s*(.+)$/);
      if (!taskMatch) continue;
      const next = (lines[i + 1] || '') + (lines[i + 2] || '');
      const est = (next.match(/Estimated:\s*(\d+)\s*minutes/i) || [])[1];
      estimates.push({
        title: taskMatch[3].replace(/\s*\[phase:\w+\]/g, '').trim(),
        status: taskMatch[2] === 'x' ? 'done' : 'pending',
        estimatedMinutes: est ? Number(est) : null,
      });
    }
    const total = estimates.reduce((sum, e) => sum + (e.estimatedMinutes || 0), 0);
    if (options.json) {
      console.log(JSON.stringify({ change: path.basename(changeDir), estimates, totalMinutes: total }, null, 2));
      return estimates;
    }
    console.log(chalk.bold(`\n⏱ Task Estimates: ${chalk.cyan(path.basename(changeDir))}\n`));
    for (const e of estimates) {
      console.log(`  ${e.status === 'done' ? chalk.green('✓') : chalk.dim('·')} ${e.title} — ${e.estimatedMinutes === null ? 'n/a' : e.estimatedMinutes + ' min'}`);
    }
    console.log(chalk.cyan(`\n  Total: ${total} minutes\n`));
    return estimates;
  }

  /** `stdd plan dependencies <change>`: declared task dependencies. */
  showDependencies(changeDir, options = {}) {
    const tasksPath = path.join(changeDir, 'tasks.md');
    if (!fsSync.existsSync(tasksPath)) {
      throw new Error(`No tasks.md found in ${path.basename(changeDir)}.`);
    }
    const lines = fsSync.readFileSync(tasksPath, 'utf-8').split('\n');
    const deps = [];
    for (const [i, line] of lines.entries()) {
      const taskMatch = line.match(/^(\s*- )\[([ ~x])\]\s*(.+)$/);
      if (!taskMatch) continue;
      const next = (lines[i + 1] || '') + (lines[i + 2] || '');
      const depLine = (next.match(/Dependencies:\s*([^\n]+)/i) || [])[1];
      const dependencies = depLine ? depLine.split(',').map(d => d.trim()).filter(Boolean) : [];
      deps.push({
        title: taskMatch[3].replace(/\s*\[phase:\w+\]/g, '').trim(),
        dependencies,
      });
    }
    if (options.json) {
      console.log(JSON.stringify({ change: path.basename(changeDir), dependencies: deps }, null, 2));
      return deps;
    }
    console.log(chalk.bold(`\n🔗 Task Dependencies: ${chalk.cyan(path.basename(changeDir))}\n`));
    for (const d of deps) {
      const depStr = d.dependencies.length > 0 ? chalk.cyan(` ← ${d.dependencies.join(', ')}`) : chalk.dim(' (none)');
      console.log(`  ${d.title}${depStr}`);
    }
    console.log('');
    return deps;
  }

  printTaskSummary(tasks) {
    console.log(chalk.bold('Task Summary'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log('');
    console.log(`Total Tasks: ${tasks.length}`);
    console.log(`Estimated Time: ${tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)} minutes`);
    console.log('');
    console.log(chalk.bold('Tasks:'));
    console.log('');

    for (const task of tasks) {
      const deps = task.dependencies.length > 0 ? ` (deps: ${task.dependencies.join(', ')})` : '';
      console.log(`  ${chalk.cyan(task.id)}: ${task.title}${deps}`);
    }
    console.log('');
  }
}

module.exports = { PlanCommand };
