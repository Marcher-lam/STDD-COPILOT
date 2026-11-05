/**
 * Archive Command
 * Moves a completed change into the archive directory.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findActiveChange, checkTasksCompletion } = require('../../utils/change-utils');
const { detectWorkspaces } = require('../../utils/workspace-detector');
const { createLogger } = require('../../utils/logger');
const { applyDelta, parseDeltaSections } = require('../../utils/delta-spec');
const logger = createLogger('archive');

function extractProposalTitle(content) {
  if (!content) return 'Unknown';
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/^#\s+(?:Bug:\s+|Proposal:\s+)?(.+)$/);
    if (m) return m[1].trim();
  }
  return 'Unknown';
}

function listSpecFiles(changeDir) {
  const specsDir = path.join(changeDir, 'specs');
  if (!fs.existsSync(specsDir)) return [];
  return fs.readdirSync(specsDir).filter(f => f.endsWith('.feature') || f.endsWith('.md'));
}

function parseTaskStats(tasksPath) {
  if (!fs.existsSync(tasksPath)) return { done: 0, total: 0 };
  const lines = fs.readFileSync(tasksPath, 'utf-8').split('\n');
  let total = 0;
  let done = 0;
  for (const line of lines) {
    const m = line.match(/^(\s*- )\[([ ~x])\]/);
    if (m) {
      total++;
      if (m[2] === 'x') done++;
    }
  }
  return { done, total };
}

function findLatestEvidence(changeDir) {
  const evidenceDir = path.join(changeDir, 'evidence');
  if (!fs.existsSync(evidenceDir)) return null;
  const files = fs.readdirSync(evidenceDir)
    .filter(f => /^verify-\d+\.json$|^guard-\d+\.json$/.test(f))
    .sort((a, b) => {
      const ta = parseInt(a.match(/-(\d+)\.json$/)[1], 10);
      const tb = parseInt(b.match(/-(\d+)\.json$/)[1], 10);
      return tb - ta;
    });
  if (files.length === 0) return null;
  const filePath = path.join(evidenceDir, files[0]);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    logger.warn(err.message);
    return null;
  }
}

function workspaceIndex(cwd) {
  return detectWorkspaces(cwd).map(workspace => ({
    name: path.relative(cwd, workspace.root).replace(/\\/g, '/') || workspace.name,
    root: path.relative(cwd, workspace.root).replace(/\\/g, '/'),
  }));
}

function workspaceForPath(workspaces, filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  return workspaces.find(workspace => normalized === workspace.root || normalized.startsWith(workspace.root + '/')) || null;
}

function extractPathsFromText(text) {
  return String(text || '').match(/[\w.-]+(?:\/[\w.-]+)+\.(?:js|jsx|ts|tsx|py|json|md|yml|yaml|feature)/g) || [];
}

function extractWorkspaceMetadata(text) {
  const names = [];
  const content = String(text || '');
  const commentPattern = /^#\s*Workspace:\s*(.+)$/gmi;
  const tagPattern = /@workspace:([^\s]+)/g;
  let match;

  while ((match = commentPattern.exec(content)) !== null) {
    names.push(match[1].trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, ''));
  }

  while ((match = tagPattern.exec(content)) !== null) {
    names.push(match[1].trim());
  }

  return names.filter(Boolean);
}

function extractIssuePaths(evidence) {
  const paths = [];
  const constitution = evidence && evidence.results && evidence.results.constitution;
  const issues = constitution && (constitution.details || constitution.issues);
  if (!issues) return paths;

  const allIssues = [];
  allIssues.push(...(issues.blocking || []), ...(issues.warning || []));
  for (const issue of allIssues) {
    for (const key of ['file', 'path', 'filepath', 'filePath']) {
      if (typeof issue[key] === 'string') paths.push(issue[key]);
    }
    if (Array.isArray(issue.files)) {
      paths.push(...issue.files.filter(f => typeof f === 'string'));
    }
    paths.push(...extractPathsFromText(issue.message));
  }

  return paths;
}

function extractWorkspaceInfo(changeDir, evidence, cwd) {
  const workspaces = workspaceIndex(cwd);
  const names = new Set();
  const testResults = [];

  if (evidence && evidence.results && evidence.results.tests && Array.isArray(evidence.results.tests.workspaces)) {
    for (const result of evidence.results.tests.workspaces) {
      const workspaceName = result.workspaceName || result.workspace || result.name;
      if (workspaceName) {
        testResults.push({ workspaceName, passed: result.passed });
        names.add(workspaceName);
      }
    }
  }

  const candidateTexts = [];
  for (const rel of ['tasks.md', 'proposal.md', 'design.md']) {
    const filePath = path.join(changeDir, rel);
    if (fs.existsSync(filePath)) candidateTexts.push(fs.readFileSync(filePath, 'utf-8'));
  }

  const specsDir = path.join(changeDir, 'specs');
  if (fs.existsSync(specsDir)) {
    for (const file of fs.readdirSync(specsDir)) {
      candidateTexts.push('specs/' + file);
      const specPath = path.join(specsDir, file);
      if (fs.statSync(specPath).isFile()) {
        const content = fs.readFileSync(specPath, 'utf-8');
        candidateTexts.push(content);
        for (const workspaceName of extractWorkspaceMetadata(content)) names.add(workspaceName);
      }
    }
  }

  const paths = extractIssuePaths(evidence);
  for (const text of candidateTexts) paths.push(...extractPathsFromText(text));

  for (const candidatePath of paths) {
    const workspace = workspaceForPath(workspaces, candidatePath);
    if (workspace) names.add(workspace.name);
  }

  return { names: Array.from(names).sort(), testResults };
}

function walkSpecFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSpecFiles(fullPath));
    } else if (entry.isFile() && /\.(md|feature)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractDeltaSections(content) {
  const sections = { added: [], modified: [], removed: [] };
  let current = null;
  for (const line of content.split('\n')) {
    if (/^##\s+ADDED\b/i.test(line)) current = 'added';
    else if (/^##\s+MODIFIED\b/i.test(line)) current = 'modified';
    else if (/^##\s+REMOVED\b/i.test(line)) current = 'removed';
    else if (/^##\s+/.test(line)) current = null;
    if (current) sections[current].push(line);
  }
  for (const key of Object.keys(sections)) {
    if (sections[key].length > 0) sections[key] = sections[key].slice(1).join('\n').trim();
    else sections[key] = '';
  }
  return sections;
}

function mergeDeltaSpec(mainContent, deltaContent) {
  const sections = extractDeltaSections(deltaContent);
  const chunks = [mainContent.trimEnd()];
  if (sections.added) {
    chunks.push('', '<!-- STDD:ADDED:start -->', sections.added, '<!-- STDD:ADDED:end -->');
  }
  if (sections.modified) {
    chunks.push('', '<!-- STDD:MODIFIED:start -->', sections.modified, '<!-- STDD:MODIFIED:end -->');
  }
  if (sections.removed) {
    chunks.push('', '<!-- STDD:REMOVED:start -->', sections.removed, '<!-- STDD:REMOVED:end -->');
  }
  if (!sections.added && !sections.modified && !sections.removed) {
    chunks.push('', deltaContent.trim());
  }
  return chunks.filter(part => part !== undefined).join('\n') + '\n';
}

/**
 * Merge a change's delta specs into the main specs directory.
 *
 * When the target main spec already exists, the OpenSpec-aligned engine in
 * `src/utils/delta-spec.js` applies the delta for real (header-based match:
 * RENAMED -> REMOVED -> MODIFIED -> ADDED) and reports conflicts so the
 * archive can be aborted for manual resolution. When no main spec exists
 * yet, the legacy marker-based "created" path is kept for compatibility.
 */
function mergeDeltaSpecWithEngine(before, deltaContent) {
  if (before.trim()) {
    return applyDelta(before, deltaContent);
  }
  const parsed = parseDeltaSections(deltaContent);
  const warnings = [];
  const unappliable = [
    ...parsed.sections.modified.requirements.map(r => `MODIFIED "${r.name}"`),
    ...parsed.sections.removed.requirements.map(r => `REMOVED "${r.name}"`),
  ];
  if (unappliable.length > 0) {
    warnings.push({
      type: 'no-current-spec',
      message: `Delta contains ${unappliable.join(', ')} but no current spec exists to apply them against; stored as marker blocks.`,
    });
  }
  return {
    content: mergeDeltaSpec(before, deltaContent),
    conflicts: [],
    warnings,
    operations: ['created spec via legacy markers'],
  };
}

class ArchiveCommand {
  async execute(changeName, options = {}) {
    const cwd = process.cwd();
    const stddDir = path.join(cwd, 'stdd');

    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const resolvedName = options.change || changeName;
    const changeDir = findActiveChange(stddDir, resolvedName);
    if (!changeDir) {
      throw new Error(resolvedName
        ? `Change '${resolvedName}' not found.`
        : 'No active changes found. Create one with `stdd new change <name>`.'
      );
    }

    const changeNameActual = path.basename(changeDir);

    // Pre-check: ensure all tasks are done
    const taskCheck = checkTasksCompletion(changeDir);
    if (!taskCheck.allDone && taskCheck.total > 0) {
      console.log(chalk.red(`\n✗ Change '${changeNameActual}' has incomplete tasks:`));
      taskCheck.pending.forEach(d => {
        console.log(`    ${chalk.red('–')} ${d}`);
      });
      console.log(chalk.yellow('\n  Complete all tasks or run `stdd verify' + (resolvedName ? ' ' + resolvedName : '') + '` first.'));
      process.exitCode = 1;
      return;
    }

    // Merge delta specs into the main specs directory before moving
    const mergeReport = this.mergeDeltaSpecs(changeDir, stddDir);

    // Abort the archive when delta conflicts require manual resolution.
    const conflictEntries = mergeReport.filter(e => e.status === 'conflict');
    if (conflictEntries.length > 0) {
      fs.writeFileSync(path.join(changeDir, 'spec-merge-report.json'), JSON.stringify(mergeReport, null, 2), 'utf8');
      console.log(chalk.red(`\n✗ Spec merge conflicts detected (${conflictEntries.length} file(s)) — change NOT archived:`));
      for (const entry of conflictEntries) {
        console.log(chalk.yellow(`\n  ${path.relative(process.cwd(), entry.target)}`));
        for (const conflict of entry.conflicts) {
          console.log(`    ${chalk.red('•')} ${conflict.message}`);
        }
      }
      console.log(chalk.yellow('\n  Resolve manually: fix the delta requirement headers to match stdd/specs,'));
      console.log(chalk.yellow('  or update the main spec first, then re-run stdd archive.'));
      console.log(chalk.dim(`\n  Details: ${path.relative(process.cwd(), path.join(changeDir, 'spec-merge-report.json'))}`));
      process.exitCode = 1;
      return;
    }

    // Generate summary.md before moving
    this.generateSummary(changeDir);
    if (mergeReport.length > 0) {
      fs.writeFileSync(path.join(changeDir, 'spec-merge-report.json'), JSON.stringify(mergeReport, null, 2), 'utf8');
    }

    // Create archive directory
    const changesDir = path.join(stddDir, 'changes');
    const archiveDir = path.join(changesDir, 'archive');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Build archive name with timestamp
    const now = new Date();
    const ts = this.formatTimestamp(now);
    const archiveName = `${changeNameActual}-${ts}`;
    const destDir = path.join(archiveDir, archiveName);

    // Move change directory
    fs.renameSync(changeDir, destDir);

    // Remove spec directory if it exists (minimal approach)
    const specsChangeDir = path.join(stddDir, 'specs', changeNameActual);
    if (fs.existsSync(specsChangeDir)) {
      fs.rmSync(specsChangeDir, { recursive: true, force: true });
    }

    console.log(chalk.green(`\n✅ Archived ${chalk.cyan(changeNameActual)} as ${chalk.cyan(archiveName)}`));
  }

  mergeDeltaSpecs(changeDir, stddDir) {
    const changeSpecsDir = path.join(changeDir, 'specs');
    const mainSpecsDir = path.join(stddDir, 'specs');
    const files = walkSpecFiles(changeSpecsDir);
    const report = [];
    if (files.length === 0) return report;
    fs.mkdirSync(mainSpecsDir, { recursive: true });
    for (const file of files) {
      const rel = path.relative(changeSpecsDir, file);
      if (/^contracts\//.test(rel) || /^api-spec\./.test(path.basename(rel))) continue;
      const target = path.join(mainSpecsDir, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const deltaContent = fs.readFileSync(file, 'utf8');
      const before = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
      const result = mergeDeltaSpecWithEngine(before, deltaContent);
      const entry = {
        source: path.relative(process.cwd(), file),
        target: path.relative(process.cwd(), target),
        action: before ? 'merged' : 'created',
        status: result.conflicts.length > 0 ? 'conflict' : before ? 'merged' : 'created',
        operations: result.operations,
      };
      if (result.warnings.length > 0) entry.warnings = result.warnings;
      if (result.conflicts.length > 0) {
        entry.conflicts = result.conflicts;
        // Conflicted targets stay untouched so they can be resolved manually.
      } else {
        fs.writeFileSync(target, result.content, 'utf8');
      }
      report.push(entry);
    }
    return report;
  }

  formatTimestamp(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}${m}${d}${h}${min}${s}`;
  }

  generateSummary(changeDir) {
    const proposalPath = path.join(changeDir, 'proposal.md');
    const tasksPath = path.join(changeDir, 'tasks.md');

    // 1. Read proposal title
    let proposalTitle = 'Unknown';
    if (fs.existsSync(proposalPath)) {
      const proposalContent = fs.readFileSync(proposalPath, 'utf-8');
      proposalTitle = extractProposalTitle(proposalContent);
    }

    // 2. Parse task stats
    const { done, total } = parseTaskStats(tasksPath);

    // 3. Scan specs
    const specFiles = listSpecFiles(changeDir);

    // 4. Read latest evidence
    const evidence = findLatestEvidence(changeDir);
    const workspaceInfo = extractWorkspaceInfo(changeDir, evidence, process.cwd());
    let verificationStatus = 'PASS';
    let constitutionStatus = 'N/A';
    let constitutionScore = null;
    let testRunner = 'N/A';

    if (evidence) {
      verificationStatus = evidence.status === 'pass' ? 'PASS' : 'FAIL';

      if (evidence.results) {
        // Constitution status from evidence
        if (evidence.results.constitution) {
          const constResult = evidence.results.constitution;
          constitutionStatus = constResult.status === 'pass' ? 'PASS' : 'FAIL';
          if (constResult.score !== undefined) {
            constitutionScore = constResult.score;
          }
        }

        // Test runner from metadata
        if (evidence.metadata && evidence.metadata.testRunner) {
          testRunner = evidence.metadata.testRunner;
        }
      }
    }

    // 5. Build markdown
    const now = new Date();
    const timestamp = now.toISOString();
    const lines = [
      `# Archive Summary: ${proposalTitle}`,
      '',
      `- **Archived at**: ${timestamp}`,
      `- **Status**: Verification ${verificationStatus === 'PASS' ? 'Passed' : 'Failed'}`,
      `- **Proposal**: ${proposalTitle}`,
      '',
      '## Tasks',
      `- ${done}/${total} completed (${total > 0 ? Math.round((done / total) * 100) : 0}%)`,
      '',
      '## Specs',
    ];

    if (specFiles.length > 0) {
      for (const f of specFiles) {
        lines.push(`- \`specs/${f}\``);
      }
    } else {
      lines.push('- No spec files');
    }

    lines.push('');
    lines.push('## Verification Evidence');

    if (constitutionScore !== null) {
      lines.push(`- Constitution Status: ${constitutionStatus} (Score: ${constitutionScore}%)`);
    } else {
      lines.push(`- Constitution Status: ${constitutionStatus}`);
    }
    lines.push(`- Test Runner: ${testRunner}`);
    lines.push('');

    if (workspaceInfo.names.length > 0 || workspaceInfo.testResults.length > 0) {
      lines.push('## Workspaces');
      if (workspaceInfo.names.length > 0) {
        lines.push('- Involved: ' + workspaceInfo.names.map(name => `\`${name}\``).join(', '));
      }
      if (workspaceInfo.testResults.length > 0) {
        lines.push('- Test Results:');
        for (const result of workspaceInfo.testResults) {
          const status = result.passed === null || result.passed === undefined ? 'SKIP' : result.passed ? 'PASS' : 'FAIL';
          lines.push(`  - ${result.workspaceName}: ${status}`);
        }
      }
      lines.push('');
    }

    const summaryPath = path.join(changeDir, 'summary.md');
    fs.writeFileSync(summaryPath, lines.join('\n'), 'utf-8');
  }
}

module.exports = { ArchiveCommand };
