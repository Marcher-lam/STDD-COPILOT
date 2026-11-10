/**
 * Recommend Engine
 * Analyzes project state and recommends the next STDD step.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { walkFiles: walkShared } = require('../../utils/file-walker');
const { hasSpecFiles } = require('../../utils/spec-discovery');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('recommend');

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.go', '.java', '.rb', '.php', '.rs']);
const TEST_PATTERN = /(?:^|[.\/-])(test|spec)\.[^.\/]+$|__tests__|tests?/;

class RecommendEngine {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.stddDir = path.join(cwd, 'stdd');
  }

  /**
   * Get all active (non-archived) change directories.
   */
  getActiveChanges() {
    const changesDir = path.join(this.stddDir, 'changes');
    if (!fs.existsSync(changesDir)) return [];
    try {
      const entries = fs.readdirSync(changesDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'archive')
        .map(e => path.join(changesDir, e.name));
    } catch (err) {
      logger.warn(err.message);
      return [];
    }
  }

  /**
   * Analyze a single change and return its state descriptor.
   */
  analyzeChange(changeDir) {
    const name = path.basename(changeDir);
    const hasProposal = fs.existsSync(path.join(changeDir, 'proposal.md'));
    const hasSpecs = this.hasAnyMarkdown(path.join(changeDir, 'specs'));
    const hasDesign = fs.existsSync(path.join(changeDir, 'design.md'));
    const tasksPath = path.join(changeDir, 'tasks.md');
    const hasTasks = fs.existsSync(tasksPath);
    const tasks = hasTasks ? parseTasks(tasksPath) : [];
    const totalTasks = tasks ? tasks.length : 0;
    const doneTasks = tasks ? tasks.filter(t => t.isDone).length : 0;
    const inProgressTasks = tasks ? tasks.filter(t => t.status === '~').length : 0;
    const pendingTasks = totalTasks - doneTasks;
    const allDone = totalTasks > 0 && doneTasks === totalTasks;
    const hasFailureLog = this.hasFailureLog(changeDir);
    const hasVerifyEvidence = this.hasVerifyEvidence(changeDir);
    const workspace = this.inferChangeWorkspace(changeDir);

    return {
      name,
      dir: changeDir,
      hasProposal,
      hasSpecs,
      hasDesign,
      hasTasks,
      tasks,
      totalTasks,
      doneTasks,
      inProgressTasks,
      pendingTasks,
      allDone,
      hasFailureLog,
      hasVerifyEvidence,
      workspace,
    };
  }

  inferChangeWorkspace(changeDir) {
    const candidates = [];
    for (const file of ['proposal.md', 'tasks.md']) {
      const filePath = path.join(changeDir, file);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = [
        ...content.matchAll(/^>\s*Workspace:\s*(.+)$/gm),
        ...content.matchAll(/^#\s*Workspace:\s*(.+)$/gm),
        ...content.matchAll(/^\|\s*Workspace\s*\|\s*([^|]+?)\s*\|/gm),
        ...content.matchAll(/^-\s*Path:\s*(.+)$/gm),
      ];
      for (const match of matches) {
        const value = String(match[1] || '').trim();
        if (value) candidates.push(value);
      }
    }

    for (const candidate of candidates) {
      const workspace = resolveWorkspace(this.cwd, candidate);
      if (workspace) {
        return {
          name: workspace.name,
          path: this.relativeWorkspaceRoot(workspace),
          sourceDir: this.normalizePath(path.relative(this.cwd, workspace.sourceDir)),
        };
      }
    }

    return null;
  }

  /**
   * Check if the directory tree contains any spec file (.feature / .md,
   * recursive — shared discovery, agrees with `stdd spec` output).
   */
  hasAnyMarkdown(dir) {
    try {
      return hasSpecFiles(dir);
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }

  /**
   * Check if apply.log contains a failed entry.
   */
  hasFailureLog(changeDir) {
    const logPath = path.join(changeDir, 'apply.log');
    if (!fs.existsSync(logPath)) return false;
    try {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      if (!lastLine) return false;
      try {
        const payload = JSON.parse(lastLine.replace(/^\[.*?\] /, ''));
        return payload && payload.status === 'failed';
      } catch (err) {
        logger.warn(err.message);
        return false;
      }
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }

  /**
   * Check if evidence/verify-*.json exists with status=pass.
   */
  hasVerifyEvidence(changeDir) {
    const evidenceDir = path.join(changeDir, 'evidence');
    if (!fs.existsSync(evidenceDir)) return false;
    try {
      const files = fs.readdirSync(evidenceDir);
      const verifyFiles = files.filter(f => f.startsWith('verify-') && f.endsWith('.json'));
      for (const file of verifyFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(evidenceDir, file), 'utf-8'));
          if (data.status === 'pass') return true;
        } catch (err) {
          logger.warn(err.message);
        }
      }
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
    return false;
  }

  hasWorkspaceVerifyEvidence(changeDir, workspace) {
    const evidenceDir = path.join(changeDir, 'evidence');
    if (!fs.existsSync(evidenceDir)) return false;
    try {
      const files = fs.readdirSync(evidenceDir).filter(f => f.startsWith('verify-') && f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(evidenceDir, file), 'utf-8'));
          if (data.status !== 'pass') continue;
          const workspaces = data.results && data.results.tests && data.results.tests.workspaces;
          if (!Array.isArray(workspaces)) return true;
          if (workspaces.some(result => this.workspaceEvidenceMatches(result, workspace) && result.passed !== false)) {
            return true;
          }
        } catch (err) {
          logger.warn(err.message);
        }
      }
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
    return false;
  }

  workspaceEvidenceMatches(result, workspace) {
    const relRoot = this.relativeWorkspaceRoot(workspace);
    return result.workspaceName === workspace.name ||
      result.workspace === workspace.name ||
      result.workspaceName === relRoot ||
      result.workspace === relRoot ||
      this.normalizePath(result.cwd) === this.normalizePath(workspace.root) ||
      this.normalizePath(result.cwd) === relRoot;
  }

  normalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/\/$/, '');
  }

  relativeWorkspaceRoot(workspace) {
    return this.normalizePath(path.relative(this.cwd, workspace.root) || workspace.name);
  }

  analyzeWorkspace(workspace) {
    const files = walkShared(workspace.sourceDir);
    const sourceFiles = files.filter(file => SOURCE_EXTENSIONS.has(path.extname(file)) && !TEST_PATTERN.test(this.normalizePath(file)));
    const testFiles = files.filter(file => TEST_PATTERN.test(this.normalizePath(file)));
    const changes = this.getActiveChanges();
    const verified = changes.some(changeDir => this.hasWorkspaceVerifyEvidence(changeDir, workspace));

    return {
      name: workspace.name,
      path: this.relativeWorkspaceRoot(workspace),
      sourceDir: this.normalizePath(path.relative(this.cwd, workspace.sourceDir)),
      hasSource: sourceFiles.length > 0,
      sourceFiles: sourceFiles.length,
      testFiles: testFiles.length,
      missingTests: sourceFiles.length > 0 && testFiles.length === 0,
      verified,
    };
  }

  workspacePayload(state) {
    return {
      name: state.name,
      path: state.path,
      sourceDir: state.sourceDir,
    };
  }

  recommendWorkspace(workspace) {
    const state = this.analyzeWorkspace(workspace);
    const workspaceText = `workspace '${state.name}' (${state.path})`;

    if (!state.hasSource) {
      return [{
        command: `stdd tdd init --source-dir ${state.sourceDir}`,
        reason: `${workspaceText} has no source files under ${state.sourceDir}. Initialize or add source before running the workflow.`,
        state: 'workspace_no_source',
        workspace: this.workspacePayload(state),
      }];
    }

    if (state.missingTests) {
      return [{
        command: `stdd tdd init --source-dir ${state.sourceDir}`,
        reason: `${workspaceText} has ${state.sourceFiles} source file(s) but no tests. Initialize tests for this workspace.`,
        state: 'workspace_missing_tests',
        workspace: this.workspacePayload(state),
      }];
    }

    if (!state.verified) {
      return [{
        command: 'stdd verify',
        reason: `${workspaceText} has source/tests but no passing verify evidence yet. Verify this workspace before archive.`,
        state: 'workspace_unverified',
        workspace: this.workspacePayload(state),
      }];
    }

    return [{
      command: 'stdd archive',
      reason: `${workspaceText} has source/tests and passing verify evidence. Archive when related change tasks are complete.`,
      state: 'workspace_verified',
      workspace: this.workspacePayload(state),
    }];
  }

  /**
   * Recommend the next step for a specific change, or overall if no change specified.
   * @param {string} [changeName] - Optional change name to analyze.
   * @returns {{ command: string, reason: string, state: string }[]}
   */
  recommend(changeName, options = {}) {
    const recommendations = [];

    if (options.workspace) {
      const workspace = resolveWorkspace(this.cwd, options.workspace);
      if (!workspace) {
        return [{
          command: `stdd graph recommend --workspace ${options.workspace}`,
          reason: `Workspace '${options.workspace}' not found`,
          state: 'workspace_not_found',
          workspace: { query: options.workspace, found: false },
        }];
      }
      return this.recommendWorkspace(workspace);
    }

    if (!fs.existsSync(this.stddDir)) {
      return [{
        command: 'stdd init',
        reason: 'STDD workspace not initialized',
        state: 'not_initialized',
      }];
    }

    if (changeName) {
      const changeDir = findActiveChange(this.stddDir, changeName);
      if (!changeDir || !fs.existsSync(changeDir)) {
        return [{
          command: `stdd new change ${changeName}`,
          reason: `Change '${changeName}' does not exist`,
          state: 'change_not_found',
        }];
      }
      const state = this.analyzeChange(changeDir);
      const rec = this.recommendFromState(state);
      return rec ? [rec] : recommendations;
    }

    const changes = this.getActiveChanges();

    if (changes.length === 0) {
      recommendations.push({
        command: 'stdd new <description>',
        reason: 'No active changes. Create your first change proposal.',
        state: 'no_changes',
      });
      return recommendations;
    }

    for (const changeDir of changes) {
      const state = this.analyzeChange(changeDir);
      const rec = this.recommendFromState(state);
      if (rec) {
        recommendations.push(rec);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        command: 'stdd new <description>',
        reason: 'All changes archived. Start a new one.',
        state: 'all_archived',
      });
    }

    return recommendations;
  }

  /**
   * Derive a recommendation from an analyzed change state.
   */
  recommendFromState(state) {
    const workspaceArg = state.workspace ? ` --workspace ${state.workspace.path}` : '';
    // State 1: No proposal
    if (!state.hasProposal) {
      return {
        command: state.hasTasks ? `stdd ff${workspaceArg}` : `stdd ff${workspaceArg} (or write proposal.md for ${state.name})`,
        reason: `Change '${state.name}' has no proposal. Generate one with \`stdd ff\` or write proposal.md manually.`,
        state: 'no_proposal',
        workspace: state.workspace,
      };
    }

    // State 2: Proposal but no tasks
    if (!state.hasTasks) {
      return {
        command: `stdd ff ${state.name}${workspaceArg} (or write tasks.md)`,
        reason: `Change '${state.name}' has a proposal but no tasks. Generate tasks with \`stdd ff\` or write tasks.md manually.`,
        state: 'no_tasks',
        workspace: state.workspace,
      };
    }

    // State 3: Tasks all pending, none started
    if (state.pendingTasks === state.totalTasks && state.inProgressTasks === 0 && !state.hasFailureLog) {
      return {
        command: `stdd apply ${state.name}${workspaceArg}`,
        reason: `All ${state.totalTasks} tasks are pending. Start the first one with \`stdd apply\`.`,
        state: 'all_pending',
        workspace: state.workspace,
      };
    }

    // State 4a: Has failure log — prioritize retry
    if (state.hasFailureLog && !state.allDone) {
      return {
        command: `stdd continue ${state.name}${workspaceArg}`,
        reason: `Last task failed. Retry with \`stdd continue\`.`,
        state: 'failure_retry',
        doneTasks: state.doneTasks,
        totalTasks: state.totalTasks,
        workspace: state.workspace,
      };
    }

    // State 4b: Mixed progress
    if (state.doneTasks > 0 && !state.allDone) {
      return {
        command: `stdd continue ${state.name}${workspaceArg}`,
        reason: `${state.doneTasks}/${state.totalTasks} tasks completed. Resume work with \`stdd continue\`.`,
        state: 'partial_progress',
        doneTasks: state.doneTasks,
        totalTasks: state.totalTasks,
        workspace: state.workspace,
      };
    }

    // State 5: All tasks done, check verification
    if (state.allDone) {
      if (state.hasVerifyEvidence) {
        return {
          command: `stdd archive ${state.name}${workspaceArg}`,
          reason: `All ${state.totalTasks} tasks completed and verified. Archive with \`stdd archive\`.`,
          state: 'verified',
          doneTasks: state.doneTasks,
          totalTasks: state.totalTasks,
          workspace: state.workspace,
        };
      }
      return {
        command: `stdd verify ${state.name}${workspaceArg}`,
        reason: `All ${state.totalTasks} tasks completed. Verify with \`stdd verify\`.`,
        state: 'tasks_done',
        doneTasks: state.doneTasks,
        totalTasks: state.totalTasks,
        workspace: state.workspace,
      };
    }

    return null;
  }
}

/**
 * Print recommendations to console.
 */
function printRecommendations(recommendations) {
  if (recommendations.length === 0) {
    console.log(chalk.yellow('No recommendations available.'));
    return;
  }

  console.log(chalk.bold('\n💡 STDD Recommendations\n'));

  recommendations.forEach((rec, index) => {
    const num = recommendations.length > 1 ? `${index + 1}. ` : '';
    console.log(chalk.cyan(`  ${num}Recommended: ${chalk.bold(rec.command)}`));
    console.log(chalk.dim(`     Reason: ${rec.reason}\n`));
  });

  if (recommendations.length > 1) {
    console.log(chalk.dim('  (Multiple changes found. Recommendations sorted by priority.)'));
  }
}

module.exports = { RecommendEngine, printRecommendations };
