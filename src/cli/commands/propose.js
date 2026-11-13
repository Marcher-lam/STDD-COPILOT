/**
 * Propose Command
 * Draft a new feature requirement with boundary clarification
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { findActiveChange } = require('../../utils/change-utils');
const inquirer = require('inquirer');
const logger = createLogger('propose');

// Advertised actions (registry helpText). Only draft existed before round 4;
// the action keyword used to be silently discarded and the draft flow ran
// instead — `stdd propose show <name>` clobbered that change's proposal.
const ACTIONS = new Set(['draft', 'show', 'validate', 'refine', 'split']);

class ProposeCommand {
  constructor() {
    this.maxWords = 500;
    this.epicThreshold = 1000;
  }

  async execute(requirement, options = {}, action = null) {
    // A lone positional that is itself an action keyword (`stdd propose show`)
    // means the action was invoked without an explicit target change.
    let effectiveAction = action && ACTIONS.has(action) ? action : null;
    if (!effectiveAction && !action && ACTIONS.has(requirement)) {
      effectiveAction = requirement;
      requirement = options.name || '';
    }

    switch (effectiveAction) {
      case 'show': return this.showChange(options.name || requirement);
      case 'validate': return this.validateChange(options.name || requirement);
      case 'refine': return this.refineChange(options.name || requirement);
      case 'split': return this.splitChange(options.name || requirement, options);
      default: return this.draft(requirement, options);
    }
  }

  /**
   * Resolve the target change dir for an action, or fail with exit 1.
   * Falls back to the first active change like verify/status do.
   */
  async resolveTargetChange(name) {
    const stddDir = path.join(process.cwd(), 'stdd');
    const changeDir = findActiveChange(stddDir, name);
    if (!changeDir) {
      console.log(chalk.red(`\n✗ ${name ? `Change '${name}' not found` : 'No active change found'}.`));
      process.exitCode = 1;
      return null;
    }
    return changeDir;
  }

  async readProposal(changeDir) {
    const proposalPath = path.join(changeDir, 'proposal.md');
    if (!fsSync.existsSync(proposalPath)) {
      console.log(chalk.red(`\n✗ No proposal found at ${path.relative(process.cwd(), proposalPath)}.`));
      process.exitCode = 1;
      return null;
    }
    return { proposalPath, proposal: await fs.readFile(proposalPath, 'utf-8') };
  }

  // -- draft ---------------------------------------------------------------

  async draft(requirement, options = {}) {
    // Two-positional documented form (`stdd propose draft <name>
    // --description ...`) carries the requirement in --description (N17);
    // prefer it only when a name was also given so the one-positional README
    // form keeps using the positional as the requirement text.
    let requirementText = (options.name && options.description) ? options.description : requirement;

    if (!requirementText || requirementText.trim() === '') {
      if (!process.stdin.isTTY) {
        throw new Error('Requirement description is required.');
      }
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'requirement',
          message: 'Describe your requirement:',
          validate: input => input.trim().length > 0 || 'Requirement cannot be empty'
        }
      ]);
      requirementText = answers.requirement;
    }

    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    console.log('');
    console.log(chalk.bold('💡 Drafting Requirement Proposal'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');

    const wordCount = requirementText.split(/\s+/).length;
    const isEpic = wordCount > this.epicThreshold;

    if (isEpic) {
      console.log(chalk.yellow('⚠ This requirement seems large (Epic detected).'));
      console.log(chalk.yellow('Consider splitting it into smaller changes.'));
      console.log('');
    }

    const proposal = await this.generateProposal(requirementText, options);

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run - proposal not saved'));
      console.log('');
      console.log(proposal);
      return proposal;
    }

    const changeName = options.name || this.suggestChangeName(requirementText);
    const changeDir = path.join(changesDir, changeName);
    const proposalPath = path.join(changeDir, 'proposal.md');

    // Never silently overwrite an existing proposal; --force is explicit
    // intent (the registered flag now does what it always claimed).
    if (!options.force && fsSync.existsSync(proposalPath)) {
      console.log(chalk.red(`\n✗ '${changeName}' already has a proposal at ${path.relative(process.cwd(), proposalPath)}.`));
      console.log(chalk.yellow(`  Inspect it with stdd propose show ${changeName}, or pass --force to overwrite.`));
      process.exitCode = 1;
      return { created: false, reason: 'proposal-exists', changeName };
    }

    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(proposalPath, proposal);

    const statusPath = path.join(changeDir, '.status.yaml');
    await fs.writeFile(statusPath, `status: proposal\ncreated: ${new Date().toISOString()}\n`);

    await this.updateGlobalStatus(changeName);

    console.log(chalk.green(`✓ Proposal created: ${proposalPath}`));
    console.log('');
    console.log(chalk.cyan(`Next step: stdd clarify ${changeName}`));
    console.log('');

    return { changeName, path: proposalPath };
  }

  // -- show ------------------------------------------------------------------

  async showChange(name) {
    const changeDir = await this.resolveTargetChange(name);
    if (!changeDir) return null;
    const read = await this.readProposal(changeDir);
    if (!read) return null;
    const changeName = path.basename(changeDir);

    console.log('');
    console.log(chalk.bold(`📄 Proposal: ${changeName}`));
    console.log(chalk.dim(`   ${path.relative(process.cwd(), read.proposalPath)}`));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(read.proposal);
    return { changeName, path: read.proposalPath };
  }

  // -- validate --------------------------------------------------------------

  async validateChange(name) {
    const changeDir = await this.resolveTargetChange(name);
    if (!changeDir) return null;
    const read = await this.readProposal(changeDir);
    if (!read) return null;
    const changeName = path.basename(changeDir);

    const { ConfirmCommand } = require('./confirm');
    const validation = new ConfirmCommand().validateProposal(read.proposal);

    console.log('');
    console.log(chalk.bold(`🔍 Proposal validation: ${changeName}`));
    if (validation.valid) {
      console.log(chalk.green('✓ All required sections present (title, description, scope, success_criteria).'));
    } else {
      console.log(chalk.red('✗ Missing sections:'));
      for (const section of validation.missing) console.log(chalk.red(`   • ${section}`));
    }
    for (const warning of validation.warnings) console.log(chalk.yellow(`⚠ ${warning}`));
    console.log(chalk.dim(`\nDeepen the proposal with: stdd propose refine ${changeName}`));
    if (!validation.valid) process.exitCode = 1;
    return { changeName, ...validation };
  }

  // -- refine ----------------------------------------------------------------

  /**
   * Deterministically regenerate the Clarifying Questions section from the
   * proposal's CURRENT state (missing/empty sections and vague phrasing get
   * targeted questions first, then the base checklist). This is a checklist
   * generator, not an AI rewrite — content sections are left untouched.
   */
  async refineChange(name) {
    const changeDir = await this.resolveTargetChange(name);
    if (!changeDir) return null;
    const read = await this.readProposal(changeDir);
    if (!read) return null;
    const changeName = path.basename(changeDir);

    const questions = this.buildRefinedQuestions(read.proposal);
    const section = [
      '## Clarifying Questions',
      '',
      `<!-- refined: ${new Date().toISOString()} — regenerated from the current proposal state -->`,
      ...questions.map(q => `- [ ] ${q}`),
      '',
    ].join('\n');

    const updated = this.replaceSection(read.proposal, 'Clarifying Questions', section);
    await fs.writeFile(read.proposalPath, updated, 'utf-8');

    console.log(chalk.green(`\n✓ Clarifying Questions regenerated for ${changeName} (${questions.length} question(s))`));
    console.log(chalk.dim(`   ${path.relative(process.cwd(), read.proposalPath)}`));
    console.log(chalk.cyan(`\nNext step: answer them, then stdd confirm ${changeName}`));
    return { changeName, questions };
  }

  buildRefinedQuestions(proposal) {
    const questions = [];
    const description = this.extractProposalSection(proposal, 'description');
    const scope = this.extractProposalSection(proposal, 'scope');
    const criteria = this.extractProposalSection(proposal, 'success_criteria');

    if (!description) questions.push('What exactly should this change do? Add a ## Description section.');
    else if (description.split(/\s+/).length < 20) questions.push('The description is very brief — what are the concrete inputs, outputs, and user actions?');

    const scopeItems = this.extractBullets(scope);
    if (!scope) questions.push('What is explicitly in scope and out of scope for this change?');
    else if (scopeItems.length === 0) questions.push('Scope has no concrete items yet — list at least one in-scope bullet.');

    const criteriaItems = this.extractChecklist(criteria);
    if (!criteria) questions.push('What measurable criteria define "done" for this change?');
    else if (criteriaItems.length === 0) questions.push('Success criteria are empty — add at least one checkbox criterion.');

    questions.push(...this.generateClarifyingQuestions(description || 'this change'));
    return questions;
  }

  // -- split -----------------------------------------------------------------

  /**
   * Split an epic-sized proposal into a deterministic plan: concrete scope
   * bullets are chunked (≤3 items per sub-change) into split-plan.md, and —
   * unless --dry-run — each sub-change is scaffolded with a draft proposal
   * (existing sub-changes are never overwritten).
   */
  async splitChange(name, options = {}) {
    const changeDir = await this.resolveTargetChange(name);
    if (!changeDir) return null;
    const read = await this.readProposal(changeDir);
    if (!read) return null;
    const changeName = path.basename(changeDir);

    const scopeItems = this.extractBullets(this.extractProposalSection(read.proposal, 'scope'));
    const criteriaItems = this.extractChecklist(this.extractProposalSection(read.proposal, 'success_criteria'));

    if (scopeItems.length < 2) {
      console.log(chalk.red(`\n✗ Nothing to split: fewer than two concrete scope items in ${changeName}'s proposal.`));
      console.log(chalk.yellow('  Fill the ## Scope section (or run stdd propose refine) first.'));
      process.exitCode = 1;
      return { changeName, subs: [] };
    }

    const per = 3;
    const usedNames = new Set([changeName]);
    const subs = [];
    for (let i = 0; i < scopeItems.length; i += per) {
      const scopeSlice = scopeItems.slice(i, i + per);
      const criteriaSlice = criteriaItems.slice(i, i + per);
      let subName = this.suggestChangeName(scopeSlice[0]);
      if (!subName || usedNames.has(subName)) subName = `${changeName}-part-${subs.length + 1}`;
      usedNames.add(subName);
      subs.push({ name: subName, scope: scopeSlice, criteria: criteriaSlice });
    }

    const planLines = [
      `# Split Plan: ${changeName}`,
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      `Parent: ${changeName} (${scopeItems.length} scope item(s) → ${subs.length} change(s), ≤${per} item(s) each)`,
      '',
    ];
    for (const sub of subs) {
      planLines.push(`## ${sub.name}`, '', '### Scope', '');
      for (const item of sub.scope) planLines.push(`- ${item}`);
      if (sub.criteria.length > 0) {
        planLines.push('', '### Success Criteria', '');
        for (const item of sub.criteria) planLines.push(`- [ ] ${item}`);
      }
      planLines.push('');
    }
    planLines.push('---', '', 'Each sub-change above is scaffolded with a draft proposal; refine them individually before confirm.', '');

    if (options.dryRun) {
      console.log(chalk.yellow('\nDry run — plan printed, nothing written:'));
      console.log('');
      console.log(planLines.join('\n'));
      return { changeName, subs, dryRun: true };
    }

    const planPath = path.join(changeDir, 'split-plan.md');
    await fs.writeFile(planPath, planLines.join('\n'), 'utf-8');

    for (const sub of subs) {
      const subDir = path.join(process.cwd(), 'stdd', 'changes', sub.name);
      const subProposalPath = path.join(subDir, 'proposal.md');
      if (fsSync.existsSync(subProposalPath)) {
        console.log(chalk.yellow(`⊘ ${sub.name} already exists — skipped`));
        continue;
      }
      await fs.mkdir(subDir, { recursive: true });
      const description = `Part of ${changeName}: ${sub.scope.join('; ')}`;
      const proposal = await this.generateProposal(description, {});
      await fs.writeFile(subProposalPath, proposal, 'utf-8');
      await fs.writeFile(path.join(subDir, '.status.yaml'), `status: proposal\ncreated: ${new Date().toISOString()}\n`);
      console.log(chalk.green(`✓ Scaffolded ${sub.name}`));
    }
    console.log(chalk.green(`\n✓ Split plan written: ${path.relative(process.cwd(), planPath)}`));
    return { changeName, subs, dryRun: false };
  }

  // -- shared helpers --------------------------------------------------------

  extractBullets(sectionText) {
    if (!sectionText) return [];
    return sectionText.split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('- '))
      .map(l => l.slice(2).trim())
      .filter(l => l && !l.startsWith('<!--'))
      .filter(l => !/^(in|out) of scope:$/i.test(l));
  }

  extractChecklist(sectionText) {
    if (!sectionText) return [];
    return sectionText.split('\n')
      .map(l => l.trim().match(/^-\s*\[ \]\s*(.+)$/))
      .filter(Boolean)
      .map(m => m[1].trim())
      .filter(Boolean);
  }

  /**
   * Full-content section extraction. ConfirmCommand.extractSection caps
   * content at 200 chars for display; refine/split need the whole body.
   * `(?![\s\S])` is a true end-of-string anchor — with the m flag, `$`
   * would stop the lazy group at the first line end.
   */
  extractProposalSection(proposal, sectionName) {
    const re = new RegExp(
      `^#{1,6}\\s*${sectionName.replace(/_/g, '[ _-]?')}\\s*\\n([\\s\\S]*?)(?=\\n#{1,6} \\S|\\n---|(?![\\s\\S]))`,
      'im'
    );
    const m = String(proposal || '').match(re);
    return m ? m[1].trim() : null;
  }

  /** Replace a `## Heading` section body (append when the heading is absent). */
  replaceSection(proposal, heading, newSection) {
    const start = String(proposal).search(new RegExp(`^## ${heading}`, 'm'));
    if (start === -1) return proposal.trimEnd() + '\n\n' + newSection + '\n';
    const after = proposal.slice(start);
    const firstNewline = after.indexOf('\n');
    const body = after.slice(firstNewline + 1);
    const nextHeading = body.search(/^## /m);
    const nextRule = body.search(/^---/m);
    const candidates = [nextHeading, nextRule, body.length].filter(i => i !== -1);
    const endRel = Math.min(...candidates);
    return proposal.slice(0, start) + newSection + '\n' + body.slice(endRel);
  }

  async generateProposal(requirement, options) {
    const date = new Date().toISOString().split('T')[0];
    const clarifyingQuestions = this.generateClarifyingQuestions(requirement);

    let proposal = `# Proposal: ${this.extractTitle(requirement)}\n\n`;
    proposal += `**Created**: ${date}\n`;
    proposal += `**Status**: draft\n\n`;
    proposal += `---\n\n`;

    proposal += `## Description\n\n`;
    proposal += `${requirement}\n\n`;

    proposal += `## Scope\n\n`;
    proposal += `<!-- Define what is included and what is excluded -->\n\n`;
    proposal += `- In scope:\n`;
    proposal += `- Out of scope:\n\n`;

    proposal += `## Success Criteria\n\n`;
    proposal += `<!-- Define measurable success criteria -->\n\n`;
    proposal += `- [ ] \n\n`;

    proposal += `## Constraints\n\n`;
    proposal += `<!-- Any technical, time, or resource constraints -->\n\n`;

    proposal += `## Clarifying Questions\n\n`;
    for (const question of clarifyingQuestions) {
      proposal += `- [ ] ${question}\n`;
    }
    proposal += `\n`;

    proposal += `## Edge Cases\n\n`;
    proposal += `<!-- Consider edge cases and error scenarios -->\n\n`;

    proposal += `## Dependencies\n\n`;
    proposal += `<!-- List any dependencies on other changes or systems -->\n\n`;

    proposal += `---\n\n`;
    proposal += `status: draft\n`;

    return proposal;
  }

  extractTitle(requirement) {
    const words = requirement.trim().split(/\s+/);
    const titleWords = words.slice(0, 8);
    return titleWords.join(' ').replace(/[.!?]$/, '');
  }

  suggestChangeName(requirement) {
    const words = requirement.trim().toLowerCase().split(/\s+/);
    const keyWords = words.filter(w => w.length > 3).slice(0, 3);
    const name = keyWords.join('-').replace(/[^a-z0-9-]/g, '-');
    return name.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'change-' + Date.now();
  }

  generateClarifyingQuestions(requirement) {
    const questions = [
      'What are the specific inputs and outputs?',
      'Who are the users/actors involved?',
      'What are the error conditions?',
      'Are there performance requirements?',
      'Are there security considerations?',
      'How should this be tested?',
      'What constitutes "done"?'
    ];

    return questions;
  }

  async updateGlobalStatus(changeName) {
    const statusPath = path.join(process.cwd(), 'stdd', '.status.yaml');
    let content = '';
    try {
      content = await fs.readFile(statusPath, 'utf-8');
    } catch {
      content = 'active_change: none\nstatus: idle\n';
    }

    content = content.replace(/active_change:\s*.+/, `active_change: ${changeName}`);
    content = content.replace(/status:\s*.+/, 'status: proposal');

    await fs.writeFile(statusPath, content);
  }
}

module.exports = { ProposeCommand };
