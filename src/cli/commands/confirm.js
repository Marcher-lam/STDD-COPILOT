/**
 * Confirm Command
 * User review and confirmation gate before specification phase
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { createLogger } = require('../../utils/logger');
const { recordInterruption, budgetState } = require('../../utils/interruption');
const logger = createLogger('confirm');

// Irreversible / high-risk signals that always require a human regardless
// of confidence (risk-triggered gate): a strong model being confident about
// a destructive change is exactly when the human must still look. Shared
// with the rigor escalation so the two gates can never drift apart.
const RISK_SIGNAL_RE = require('../../utils/rigor').IRREVERSIBLE_RE;

// Fallback thresholds; canonical values live in stdd/config.yaml tdd.certainty.
const DEFAULT_THRESHOLDS = { confirm: 0.7, auto: 0.95 };

class ConfirmCommand {
  constructor() {
    this.requiredSections = ['title', 'description', 'scope', 'success_criteria'];
  }

  async execute(changeName, options = {}) {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    const changeDir = changeName
      ? path.join(changesDir, changeName)
      : await this.getActiveChangeDir(changesDir);

    if (!changeDir) {
      throw new Error('No active change found. Use `stdd new change <name>` first.');
    }

    const proposalPath = path.join(changeDir, 'proposal.md');
    const proposalExists = await this.fileExists(proposalPath);

    if (!proposalExists) {
      throw new Error(`No proposal found at ${proposalPath}. Create a proposal first.`);
    }

    const proposal = await fs.readFile(proposalPath, 'utf-8');
    const summary = this.extractSummary(proposal);
    const validation = this.validateProposal(proposal);

    this.printConfirmationGate(summary, validation);

    if (options.dryRun) {
      console.log(chalk.yellow('\nDry run - confirmation not recorded'));
      return { summary, validation, confirmed: false };
    }

    // Risk-triggered gate: the gate itself decides whether a human is needed,
    // instead of pausing every run at the same stage boundary.
    const hitlMode = await this.readHitlMode();
    if (hitlMode === 'risk-triggered') {
      return this.executeRiskTriggered(changeDir, proposalPath, proposal, { summary, validation }, options);
    }

    const statusPath = path.join(process.cwd(), 'stdd', '.status.yaml');
    const confirmed = options.skip ? true : await this.promptConfirmation();

    if (confirmed) {
      await this.updateStatus(statusPath, path.basename(changeDir), 'confirmed');
      await this.updateProposalStatus(proposalPath, 'confirmed');
      console.log(chalk.green('\n✓ Proposal confirmed!'));
      console.log(chalk.cyan('\nNext step: stdd spec ' + path.basename(changeDir)));
      return { summary, validation, confirmed: true };
    } else {
      console.log(chalk.yellow('\n⚠ Confirmation cancelled. Return to proposal phase.'));
      console.log(chalk.cyan('\nNext step: /stdd:propose to revise'));
      return { summary, validation, confirmed: false };
    }
  }

  async readHitlMode() {
    try {
      const configPath = path.join(process.cwd(), 'stdd', 'config.yaml');
      if (!(await this.fileExists(configPath))) return null;
      const config = yaml.load(await fs.readFile(configPath, 'utf8')) || {};
      return config && config.hitl && config.hitl.mode ? String(config.hitl.mode) : null;
    } catch (err) {
      logger.warn(`Could not read hitl config: ${err.message}`);
      return null;
    }
  }

  async readThresholds() {
    try {
      const configPath = path.join(process.cwd(), 'stdd', 'config.yaml');
      if (await this.fileExists(configPath)) {
        const config = yaml.load(await fs.readFile(configPath, 'utf8')) || {};
        // Thresholds live at tdd.certainty in the shipped template; accept a
        // top-level certainty section too (both are honored).
        const certainty = (config && config.certainty) || (config && config.tdd && config.tdd.certainty);
        if (certainty) {
          const confirm = Number(certainty.confirm_threshold ?? DEFAULT_THRESHOLDS.confirm);
          const auto = Number(certainty.auto_threshold ?? DEFAULT_THRESHOLDS.auto);
          if (Number.isFinite(confirm) && Number.isFinite(auto)) {
            return { confirm, auto };
          }
          // Fail closed: a malformed value must not disable the gate.
          logger.warn('Invalid certainty thresholds in stdd/config.yaml; using defaults');
        }
      }
    } catch (err) {
      logger.warn(`Could not read certainty thresholds: ${err.message}`);
    }
    return { ...DEFAULT_THRESHOLDS };
  }

  /** Latest certainty assessment recorded for this change, or null. */
  async readCertaintyEvidence(changeName) {
    try {
      const historyPath = path.join(process.cwd(), 'stdd', 'memory', 'certainty-history.jsonl');
      if (!(await this.fileExists(historyPath))) return null;
      const lines = (await fs.readFile(historyPath, 'utf8')).split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        let entry;
        try { entry = JSON.parse(lines[i]); } catch { continue; }
        // Tolerate both 'demo' and 'stdd/changes/demo' style contexts.
        if (entry && typeof entry.overall === 'number'
          && path.basename(String(entry.context)) === changeName) {
          return entry;
        }
      }
      return null;
    } catch (err) {
      logger.warn(`Could not read certainty history: ${err.message}`);
      return null;
    }
  }

  /** Distinct risk-signal categories matched in the proposal text. */
  scanRiskSignals(proposal) {
    const signals = new Set();
    for (const match of proposal.matchAll(new RegExp(RISK_SIGNAL_RE.source, 'gi'))) {
      signals.add(match[0].toLowerCase());
    }
    return Array.from(signals);
  }

  async executeRiskTriggered(changeDir, proposalPath, proposal, context, options = {}) {
    const changeName = path.basename(changeDir);
    const thresholds = await this.readThresholds();
    const certainty = await this.readCertaintyEvidence(changeName);
    const riskSignals = this.scanRiskSignals(proposal);

    const basis = {
      mode: 'risk-triggered',
      thresholds,
      overall: certainty ? certainty.overall : null,
      certaintyTimestamp: certainty ? certainty.timestamp : null,
      riskSignals,
    };

    const needsHuman = !certainty
      || certainty.overall < thresholds.confirm
      || riskSignals.length > 0;

    const decisionPath = path.join(changeDir, 'confirm-decision.json');

    if (needsHuman && options.skip) {
      // Explicit human override (--skip): the gate's job is to force a human
      // decision — a human running with --skip IS that decision.
      const decision = {
        status: 'manual-override',
        change: changeName,
        basis: { ...basis, override: 'confirm --skip' },
        reasons: ['Human override via --skip after gate requested confirmation.'],
        timestamp: new Date().toISOString(),
      };
      await fs.writeFile(decisionPath, JSON.stringify(decision, null, 2), 'utf8');
      const statusPath = path.join(process.cwd(), 'stdd', '.status.yaml');
      await this.updateStatus(statusPath, changeName, 'confirmed');
      await this.updateProposalStatus(proposalPath, 'confirmed');
      console.log(chalk.yellow('\n⚠ Gate requested a human — overridden via --skip (recorded as manual-override)'));
      console.log(chalk.cyan('\nNext step: stdd spec ' + changeName));
      return { ...context, confirmed: true, manualOverride: true, decision };
    }

    if (needsHuman) {
      const reasons = [];
      if (!certainty) reasons.push('no certainty assessment on record (run: stdd certainty assess)');
      else if (certainty.overall < thresholds.confirm) reasons.push(`certainty ${certainty.overall} < confirm threshold ${thresholds.confirm}`);
      if (riskSignals.length > 0) reasons.push(`irreversible/high-risk signal(s): ${riskSignals.slice(0, 5).join(', ')}`);

      // Interruption budget: a human pause is real work against a budget.
      recordInterruption(changeDir, `confirm-needs-human: ${reasons[0] || 'unspecified'}`);
      const { used, budget, exceeded: budgetExceeded } = budgetState(changeDir, process.cwd());

      const decision = {
        status: 'pending-human',
        change: changeName,
        basis,
        reasons,
        interruptionsUsed: used,
        interruptionBudget: budget,
        ...(budgetExceeded ? { budgetExceeded: true } : {}),
        timestamp: new Date().toISOString(),
      };
      await fs.writeFile(decisionPath, JSON.stringify(decision, null, 2), 'utf8');
      console.log(chalk.yellow('\n⚠ This confirmation needs human confirmation (not auto-approved):'));
      for (const reason of reasons) console.log(chalk.yellow(`   • ${reason}`));
      console.log(chalk.dim(`   Interruption budget: ${used}/${budget} used`));
      if (budgetExceeded) {
        console.log(chalk.yellow('   ⚠ interruption budget exceeded — the change keeps asking for humans.'));
        console.log(chalk.yellow('     Consider splitting the change or tightening certainty/risk thresholds.'));
      }
      console.log(chalk.dim(`   Decision recorded: ${path.relative(process.cwd(), decisionPath)}`));
      console.log(chalk.cyan('\nNext step: review the proposal, then re-run with a human decision'));
      return { ...context, confirmed: false, needsHuman: true, decision };
    }

    // Auto-approve: high certainty AND no irreversible signals. Warning band
    // (confirm..auto) still passes, mirroring the certainty protocol.
    const warned = certainty.overall < thresholds.auto;
    const decision = { status: 'auto-approved', change: changeName, basis, warning: warned || undefined, timestamp: new Date().toISOString() };
    await fs.writeFile(decisionPath, JSON.stringify(decision, null, 2), 'utf8');
    const statusPath = path.join(process.cwd(), 'stdd', '.status.yaml');
    await this.updateStatus(statusPath, changeName, 'confirmed');
    await this.updateProposalStatus(proposalPath, 'confirmed');
    const levelText = warned
      ? `certainty ${certainty.overall} (confirm band, < auto ${thresholds.auto})`
      : `certainty ${certainty.overall} ≥ ${thresholds.auto}`;
    console.log(chalk.green(`\n✓ Proposal auto-approved (${levelText}, no risk signals)`));
    if (warned) console.log(chalk.yellow(`  ⚠ note: certainty below auto threshold ${thresholds.auto} — passed with warning`));
    console.log(chalk.dim(`   Decision recorded: ${path.relative(process.cwd(), decisionPath)}`));
    console.log(chalk.cyan('\nNext step: stdd spec ' + changeName));
    return { ...context, confirmed: true, autoApproved: true, decision };
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

  extractSummary(proposal) {
    const summary = {
      title: this.extractSection(proposal, 'title') || 'Untitled',
      description: this.extractSection(proposal, 'description') || '',
      scope: this.extractSection(proposal, 'scope') || '',
      success_criteria: this.extractSection(proposal, 'success_criteria') || '',
      constraints: this.extractSection(proposal, 'constraints') || ''
    };

    return summary;
  }

  extractSection(proposal, sectionName) {
    const patterns = [
      new RegExp(`^#+\\s*${sectionName.replace(/_/g, '([ _-]?)')}\\s*\\n([\\s\\S]+?)(?=\\n#+|\\n*$)`, 'im'),
      new RegExp(`\\*\\*${sectionName}\\*\\*:\\s*([\\s\\S]+?)(?=\\n\\*\\*|\\n*$)`, 'im'),
      new RegExp(`${sectionName}:\\s*([\\s\\S]+?)(?=\\n\\w+:|\\n*$)`, 'im')
    ];

    for (const pattern of patterns) {
      const match = proposal.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 200);
      }
    }

    return null;
  }

  validateProposal(proposal) {
    const validation = {
      valid: true,
      missing: [],
      warnings: []
    };

    for (const section of this.requiredSections) {
      const content = this.extractSection(proposal, section);
      if (!content) {
        validation.missing.push(section);
        validation.valid = false;
      }
    }

    const wordCount = proposal.split(/\s+/).length;
    if (wordCount < 50) {
      validation.warnings.push('Proposal seems too brief (< 50 words)');
    }

    return validation;
  }

  printConfirmationGate(summary, validation) {
    console.log('');
    console.log(chalk.bold('📋 Proposal Confirmation Gate'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');

    console.log(chalk.bold(`Title: ${summary.title}`));
    console.log('');

    if (summary.description) {
      console.log(chalk.dim('Description:'));
      console.log(chalk.dim(summary.description.substring(0, 150) + '...'));
      console.log('');
    }

    if (summary.scope) {
      console.log(chalk.dim('Scope:'));
      console.log(chalk.dim(summary.scope.substring(0, 100) + '...'));
      console.log('');
    }

    if (!validation.valid) {
      console.log(chalk.red('⚠ Missing Sections:'));
      for (const missing of validation.missing) {
        console.log(chalk.red(`   • ${missing}`));
      }
      console.log('');
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('⚠ Warnings:'));
      for (const warning of validation.warnings) {
        console.log(chalk.yellow(`   • ${warning}`));
      }
      console.log('');
    }

    console.log(chalk.dim('─'.repeat(50)));
    console.log('');
  }

  async promptConfirmation() {
    // In non-interactive mode, auto-confirm
    if (!process.stdin.isTTY) {
      return true;
    }

    try {
      const inquirer = require('inquirer');
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Do you confirm this proposal and proceed to specification?',
          default: false
        }
      ]);
      return answers.confirmed;
    } catch (err) {
      logger.warn(`Could not prompt for confirmation: ${err.message}`);
      return false;
    }
  }

  async updateStatus(statusPath, changeName, status) {
    let content = '';
    try {
      content = await fs.readFile(statusPath, 'utf-8');
    } catch {
      content = 'active_change: none\nstatus: proposal\n';
    }

    content = content.replace(/active_change:\s*.+/, `active_change: ${changeName}`);
    content = content.replace(/status:\s*.+/, `status: ${status}`);

    await fs.writeFile(statusPath, content);
  }

  async updateProposalStatus(proposalPath, status) {
    let proposal = await fs.readFile(proposalPath, 'utf-8');

    if (proposal.includes('status:')) {
      proposal = proposal.replace(/status:\s*\w+/, `status: ${status}`);
    } else {
      proposal += `\n\nstatus: ${status}`;
    }

    await fs.writeFile(proposalPath, proposal);
  }
}

module.exports = { ConfirmCommand };
