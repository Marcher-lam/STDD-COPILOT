/**
 * Clarify Command
 * Multi-round clarification sessions for requirement drafts
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('clarify');

class ClarifyCommand {
  constructor() {
    this.clarificationAreas = [
      'boundary_conditions',
      'edge_cases',
      'implicit_constraints',
      'non_functional_requirements',
      'integration_points'
    ];
    // Conversational mode (model-strength adaptation): a small core set plus
    // signal-selected questions instead of the same 20-question dump for
    // every proposal. --exhaustive restores the full checklist.
    this.coreQuestions = {
      boundary_conditions: ['What are the input boundaries (min/max values, formats)?'],
      edge_cases: [
        'What happens with empty/null inputs?',
        'What are the failure scenarios?'
      ]
    };
    this.signalQuestions = {
      non_functional_requirements: {
        signal: /\bperf(ormance)?\b|性能|latency|延迟|throughput|吞吐/i,
        questions: [
          'What is the expected response time?',
          'What is the expected throughput?'
        ]
      },
      integration_points: {
        signal: /\bapi\b|integration|http|webhook|集成|external/i,
        questions: [
          'What external systems need to be integrated?',
          'What are the error handling strategies for integration failures?'
        ]
      },
      edge_cases: {
        signal: /\bdata\b|database|schema|数据|concurrent|并发/i,
        questions: [
          'What happens with malformed data?',
          'What are the concurrent access scenarios?'
        ]
      },
      implicit_constraints: {
        signal: /\bauth\b|permission|security|权限|安全|compliance|合规/i,
        questions: [
          'Are there security or compliance requirements?',
          'Are there backward compatibility requirements?'
        ]
      }
    };
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
    const clarification = await this.generateClarification(proposal, options);

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run - clarification not saved'));
      this.printClarification(clarification);
      return clarification;
    }

    await this.updateProposal(proposalPath, proposal, clarification);
    this.printClarification(clarification);
    this.printNextSteps(changeName);

    return clarification;
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

  async generateClarification(proposal, options = {}) {
    const exhaustive = options.exhaustive === true;
    const clarification = {
      timestamp: new Date().toISOString(),
      mode: exhaustive ? 'exhaustive' : 'conversational',
      areas: {}
    };

    for (const area of this.clarificationAreas) {
      clarification.areas[area] = this.generateAreaQuestions(area, proposal, { exhaustive });
    }

    return clarification;
  }

  /** Conversational core + signal-selected questions; exhaustive = full set. */
  pickConversationalQuestions(area, proposal) {
    const questions = [...(this.coreQuestions[area] || [])];
    const rule = this.signalQuestions[area];
    if (rule && rule.signal.test(proposal)) {
      questions.push(...rule.questions);
    }
    return questions;
  }

  generateAreaQuestions(area, proposal, { exhaustive } = {}) {
    const fullQuestions = {
      boundary_conditions: [
        'What are the input boundaries (min/max values, formats)?',
        'What are the output boundaries?',
        'What are the system constraints (memory, time, resources)?',
        'What are the access control boundaries?'
      ],
      edge_cases: [
        'What happens with empty/null inputs?',
        'What happens with malformed data?',
        'What are the concurrent access scenarios?',
        'What are the failure scenarios?'
      ],
      implicit_constraints: [
        'Are there performance requirements?',
        'Are there security requirements?',
        'Are there compliance requirements?',
        'Are there backward compatibility requirements?'
      ],
      non_functional_requirements: [
        'What is the expected response time?',
        'What is the expected throughput?',
        'What is the availability target?',
        'What is the maintainability target?'
      ],
      integration_points: [
        'What external systems need to be integrated?',
        'What are the APIs/protocols involved?',
        'What are the data formats?',
        'What are the error handling strategies?'
      ]
    };

    const questions = exhaustive
      ? (fullQuestions[area] || [])
      : this.pickConversationalQuestions(area, proposal);

    return {
      area: area.replace(/_/g, ' '),
      questions,
      status: 'pending'
    };
  }

  async updateProposal(proposalPath, existingProposal, clarification) {
    const areasWithQuestions = Object.entries(clarification.areas)
      .filter(([, value]) => value.questions.length > 0);

    const clarificationSection = `
## Clarification

Generated: ${clarification.timestamp}
Mode: ${clarification.mode}${clarification.mode === 'conversational' ? '（默认；--exhaustive 查看全量问题清单）' : ''}

${areasWithQuestions.map(([, value]) => `
### ${value.area}

${value.questions.map(q => `- [ ] ${q}`).join('\n')}
`).join('\n')}
`;

    const updatedProposal = existingProposal.includes('## Clarification')
      ? existingProposal.replace(/## Clarification[\s\S]*$/, clarificationSection.trim())
      : existingProposal + '\n' + clarificationSection.trim();

    await fs.writeFile(proposalPath, updatedProposal);
  }

  printClarification(clarification) {
    console.log('');
    console.log(chalk.bold('🔍 Requirement Clarification'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');

    for (const [key, value] of Object.entries(clarification.areas)) {
      if (value.questions.length === 0) continue;
      console.log(chalk.bold(`📋 ${value.area}`));
      console.log(chalk.dim('─'.repeat(40)));

      for (const question of value.questions) {
        console.log(`  ${chalk.blue('•')} ${question}`);
      }
      console.log('');
    }

    console.log(chalk.dim('─'.repeat(50)));
    console.log('');
  }

  printNextSteps(changeName) {
    console.log(chalk.yellow('💭 Next Steps:'));
    console.log('   1. Answer the clarification questions');
    console.log(`   2. Run: ${chalk.cyan('stdd confirm ' + changeName)}`);
    console.log('   3. Then proceed to specification');
    console.log('');
  }
}

module.exports = { ClarifyCommand };
