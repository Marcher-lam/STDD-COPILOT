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
const { readDeferred, DEFERRED_FILENAME } = require('../../utils/deferred-work');
const { readChangeRigor, rigorNodeOptions } = require('../../utils/rigor');
const { computeProjectTestFingerprint } = require('../../utils/project-fingerprint');
const { ValidateCommand, lineDiagnostics } = require('./validate');
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
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    logger.warn(err.message);
    return null;
  }
}

/**
 * Latest `stdd verify` evidence only (unlike findLatestEvidence, guard-*
 * files never mask a failed verify run here).
 */
function findLatestVerifyEvidence(changeDir) {
  const latest = findLatestVerifyEvidenceFile(changeDir);
  return latest ? latest.data : null;
}

/**
 * Latest `stdd verify` evidence with its file identity (path + mtime), used
 * by the archive gate to prove the evidence is both a pass and FRESH —
 * newer than any change artifact it is supposed to cover (终测复验 D02).
 */
function findLatestVerifyEvidenceFile(changeDir) {
  const evidenceDir = path.join(changeDir, 'evidence');
  if (!fs.existsSync(evidenceDir)) return null;
  const files = fs.readdirSync(evidenceDir)
    .filter(f => /^verify-\d+\.json$/.test(f))
    .sort((a, b) => {
      const ta = parseInt(a.match(/-(\d+)\.json$/)[1], 10);
      const tb = parseInt(b.match(/-(\d+)\.json$/)[1], 10);
      return tb - ta;
    });
  if (files.length === 0) return null;
  const filePath = path.join(evidenceDir, files[0]);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { data, file: filePath, mtime: fs.statSync(filePath).mtimeMs };
  } catch (err) {
    logger.warn(err.message);
    return null;
  }
}

/**
 * Newest modification time across the artifacts a verification is supposed
 * to cover: tasks, proposal/design, delta specs, and the apply ledger.
 * Evidence files themselves are excluded (they are written by verify).
 */
function findNewestArtifactMtime(changeDir) {
  let newest = 0;
  const consider = (filePath) => {
    try {
      const mtime = fs.statSync(filePath).mtimeMs;
      if (mtime > newest) newest = mtime;
    } catch { /* unreadable artifact — nothing to compare */ }
  };
  for (const rel of ['tasks.md', 'proposal.md', 'design.md', 'apply.log', '.state.yaml']) {
    consider(path.join(changeDir, rel));
  }
  for (const file of walkSpecFiles(path.join(changeDir, 'specs'))) consider(file);
  return newest;
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
    ...parsed.sections.renamed.entries.map(e => `RENAMED "${e.from}" -> "${e.to}"`),
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
    // 终测复验 D02: an empty (or missing) task list has nothing verified —
    // "0/0 completed" must not masquerade as a verified change. This check
    // is deliberately NOT nested under !allDone: checkTasksCompletion
    // reports empty task files as allDone=true, total=0.
    if (taskCheck.total === 0) {
      console.log(chalk.red(`\n✗ Change '${changeNameActual}' has no tasks to verify (tasks.md missing or empty) — change NOT archived:`));
      console.log(chalk.yellow(`\n  Add tasks (\`stdd plan ${changeNameActual}\`), complete them, then verify.`));
      console.log(chalk.dim(`  Escape hatch: stdd archive ${changeNameActual} --force`));
      process.exitCode = 1;
      if (options.throwOnFailure) throw new Error(`archive refused: no tasks in ${changeNameActual}`);
      return;
    }
    if (!taskCheck.allDone) {
      console.log(chalk.red(`\n✗ Change '${changeNameActual}' has incomplete tasks:`));
      taskCheck.pending.forEach(d => {
        console.log(`    ${chalk.red('–')} ${d}`);
      });
      console.log(chalk.yellow('\n  Complete all tasks or run `stdd verify' + (resolvedName ? ' ' + resolvedName : '') + '` first.'));
      process.exitCode = 1;
      if (options.throwOnFailure) throw new Error(`archive refused: incomplete tasks in ${changeNameActual}`);
      return;
    }

    // Verification gate (终测复验 D02): archiving requires verification
    // evidence that (1) exists, (2) is a pass, and (3) is FRESH — newer
    // than every change artifact it covers. Previously only "an existing
    // failed verify" blocked; a never-verified change, an empty task list,
    // or tests edited to fail after a green verify all slipped through.
    // --force is the explicit escape hatch and still records the rejection
    // in summary.md.
    if (!options.force) {
      const latest = findLatestVerifyEvidenceFile(changeDir);
      const refuse = (lines) => {
        console.log(chalk.red(`\n✗ Verification gate for '${changeNameActual}' — change NOT archived:`));
        lines.forEach(l => console.log(l));
        console.log(chalk.yellow(`\n  Run ${chalk.cyan(`stdd verify ${changeNameActual}`)} and archive while the evidence is fresh.`));
        console.log(chalk.dim(`  Escape hatch: stdd archive ${changeNameActual} --force`));
        process.exitCode = 1;
        if (options.throwOnFailure) throw new Error(`archive refused: verification gate for ${changeNameActual}`);
      };

      if (!latest) {
        refuse([
          chalk.yellow('  No verification evidence found — the change was never verified.'),
        ]);
        return;
      }
      if (latest.data.status === 'fail') {
        refuse([
          chalk.yellow(`  Latest verification evidence FAILED (${path.basename(latest.file)}).`),
        ]);
        return;
      }
      if (latest.data.status !== 'pass') {
        refuse([
          chalk.yellow(`  Latest verification evidence status is '${latest.data.status}', not a pass.`),
        ]);
        return;
      }
      const newestArtifact = findNewestArtifactMtime(changeDir);
      if (newestArtifact > latest.mtime) {
        refuse([
          chalk.yellow('  Verification evidence is STALE: change artifacts were modified after the last passing verify.'),
          chalk.dim('  Edit tests/code, then re-run stdd verify before archiving.'),
        ]);
        return;
      }
      // Stale green via PROJECT edits (test scripts / test files live
      // outside the change dir): compare the fingerprint verify recorded.
      const recorded = latest.data.metadata && latest.data.metadata.projectFingerprint;
      if (recorded) {
        const current = computeProjectTestFingerprint(cwd);
        if (current !== recorded) {
          refuse([
            chalk.yellow('  Verification evidence is STALE: the project\'s tests or test scripts changed since the last passing verify.'),
            chalk.dim('  Re-run stdd verify against the current test suite before archiving.'),
          ]);
          return;
        }
      }
    }

    // Pre-archive strict validation gate (OpenSpec-style): blocking delta
    // structure issues refuse the archive before any spec file is touched.
    // Change-level rigor (from ff/issue) can relax it for routine work;
    // an explicit --skip-strict / --rigor flag always wins.
    const changeRigor = readChangeRigor(changeDir);
    if (changeRigor && options.skipStrict === undefined && rigorNodeOptions('stdd-archive', changeRigor).skipStrict) {
      options.skipStrict = true;
      console.log(chalk.dim(`  Rigor: ${changeRigor} (from change state) — strict gate relaxed for this routine change`));
    }
    if (!options.skipStrict) {
      const gate = this.runStrictGate(changeDir, cwd);
      if (!gate.ok) {
        console.log(chalk.red(`\n✗ Strict spec validation failed (${gate.blocking.length} blocking) — change NOT archived:`));
        for (const item of gate.blocking) {
          console.log(`    ${chalk.red('•')} ${item.file}:${item.line} ${chalk.bold(item.rule)}`);
          console.log(`      ${item.message}`);
        }
        console.log(chalk.yellow(`\n  Run ${chalk.cyan(`stdd validate ${changeNameActual} --strict`)} for the full report (including warnings),`));
        console.log(chalk.yellow('  fix the issues above, then re-run stdd archive.'));
        console.log(chalk.dim('  Escape hatch: stdd archive --skip-strict'));
        process.exitCode = 1;
        return;
      }
    }

    // Merge delta specs into the main specs directory before moving
    const mergeReport = this.mergeDeltaSpecs(changeDir, stddDir);

    // Abort the archive when delta conflicts require manual resolution.
    const conflictEntries = mergeReport.filter(e => e.status === 'conflict');
    if (conflictEntries.length > 0) {
      this.writeMergeReport(changeDir, mergeReport);
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
      if (options.throwOnFailure) throw new Error(`archive refused: spec merge conflicts in ${changeNameActual}`);
      return;
    }

    // Generate summary.md before moving
    this.generateSummary(changeDir);
    this.writeMergeReport(changeDir, mergeReport);

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

    // Deferred-work ledger: open items are carried into the archive, not
    // silently dropped (BMAD deferred-work practice).
    const deferredState = readDeferred(changeDir);
    if (deferredState.open > 0) {
      console.log(chalk.yellow(`\n⚠ ${deferredState.open} deferred item(s) open in ${DEFERRED_FILENAME} — carried into the archive for a later sweep`));
    }

    // Move change directory
    fs.renameSync(changeDir, destDir);

    // Remove spec directory if it exists (minimal approach)
    const specsChangeDir = path.join(stddDir, 'specs', changeNameActual);
    if (fs.existsSync(specsChangeDir)) {
      fs.rmSync(specsChangeDir, { recursive: true, force: true });
    }

    console.log(chalk.green(`\n✅ Archived ${chalk.cyan(changeNameActual)} as ${chalk.cyan(archiveName)}`));
  }

  writeMergeReport(changeDir, mergeReport) {
    if (mergeReport.length === 0) return;
    fs.writeFileSync(path.join(changeDir, 'spec-merge-report.json'), JSON.stringify(mergeReport, null, 2), 'utf8');
  }

  mergeDeltaSpecs(changeDir, stddDir) {
    const changeSpecsDir = path.join(changeDir, 'specs');
    const mainSpecsDir = path.join(stddDir, 'specs');
    const files = walkSpecFiles(changeSpecsDir);
    const report = [];
    if (files.length === 0) return report;
    fs.mkdirSync(mainSpecsDir, { recursive: true });
    // Two-phase merge: compute every result first, write targets only when
    // NO entry conflicts — the conflict-abort is then truly atomic and the
    // "idempotent re-archive" invariant holds for every path.
    const plannedWrites = [];
    for (const file of files) {
      const rel = path.relative(changeSpecsDir, file).replace(/\\/g, '/');
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
        plannedWrites.push({ target, content: result.content, dirs: path.dirname(target) });
      }
      report.push(entry);
    }
    const hasConflict = report.some(e => e.status === 'conflict');
    if (!hasConflict) {
      for (const write of plannedWrites) {
        fs.writeFileSync(write.target, write.content, 'utf8');
      }
    }
    return report;
  }

  /**
   * Run the strict delta-spec validation gate for a change.
   * Returns { ok: true } when there is nothing to validate or no blocking
   * finding; otherwise returns the blocking diagnostics.
   */
  runStrictGate(changeDir, cwd) {
    const changeSpecsDir = path.join(changeDir, 'specs');
    if (!fs.existsSync(changeSpecsDir)) return { ok: true };
    // Scope must match the merge loop: contracts/ and api-spec.* files are
    // never merged, so they must not gate the archive either.
    const files = walkSpecFiles(changeSpecsDir).filter(f => {
      const rel = path.relative(changeSpecsDir, f);
      return !/^contracts\//.test(rel) && !/^api-spec\./.test(path.basename(rel));
    });
    if (files.length === 0) return { ok: true };
    const validator = new ValidateCommand(cwd);
    const diagnostics = validator.strictDiagnostics(changeDir, files);
    // 终测复验 D06: `stdd validate --strict` also runs the per-line
    // leakage/shape rules over .feature files, but strictDiagnostics skips
    // them — so placeholder specs that failed strict validation still
    // archived. Run the same line rules here so the two gates agree.
    for (const file of files) {
      diagnostics.push(...lineDiagnostics(file, cwd));
    }
    // Structure rules only. Stateful delta-vs-main rules (target-missing,
    // added-conflict, ...) reflect merge state: after a conflict-aborted
    // partial merge they fire on already-applied entries and would block the
    // idempotent re-run. The merge engine reports those states itself as
    // conflicts/warnings. Line rules that are warnings for validate stay
    // warnings here; only blocking severities gate.
    const STATEFUL_RULES = new Set([
      'removed-target-missing', 'renamed-source-missing', 'modified-target-missing',
      'added-conflict', 'renamed-target-exists',
    ]);
    const blocking = diagnostics.filter(d => d.severity === 'blocking' && !STATEFUL_RULES.has(d.rule));
    return { ok: blocking.length === 0, blocking };
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
        // Constitution status from evidence — PASS / SKIPPED / FAIL stay
        // distinct so a skipped check is never summarized as a pass.
        if (evidence.results.constitution) {
          const constResult = evidence.results.constitution;
          constitutionStatus = constResult.status === 'pass'
            ? 'PASS'
            : constResult.status === 'skipped' ? 'SKIPPED' : 'FAIL';
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

    // Retrospective verdict (BMAD retrospective: accepted /
    // accepted-with-open-items / rejected), computed from the evidence:
    // failed verification => rejected; open deferred items =>
    // accepted-with-open-items; otherwise accepted.
    const deferredState = readDeferred(changeDir);
    let verdict = 'accepted';
    let verdictReason = evidence
      ? 'Verification passed with no open deferred items.'
      : 'No verification evidence recorded; archived without verification.';
    if (verificationStatus === 'FAIL') {
      verdict = 'rejected';
      verdictReason = 'Latest verification evidence failed.';
    } else if (deferredState.open > 0) {
      verdict = 'accepted-with-open-items';
      verdictReason = `${deferredState.open} deferred item(s) remain open in ${DEFERRED_FILENAME}; sweep them in a later change.`;
    }
    lines.push('## Retrospective Verdict');
    lines.push('');
    lines.push(`Verdict: ${verdict}`);
    lines.push('');
    lines.push(`Reason: ${verdictReason}`);
    lines.push('');

    const summaryPath = path.join(changeDir, 'summary.md');
    fs.writeFileSync(summaryPath, lines.join('\n'), 'utf-8');
  }
}

module.exports = { ArchiveCommand };
