/**
 * Validate Command
 * Runtime spec validation plus Spec Guardian leakage checks.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');
const EvidenceCapture = require('../../utils/evidence-capture');
const { walkFiles } = require('../../utils/file-walker');
const { createLogger } = require('../../utils/logger');
const { parseDeltaSections, parseSpecRequirements, foldBody } = require('../../utils/delta-spec');
const logger = createLogger('validate');

// Accepts both Gherkin ("When ...") and OpenSpec-style ("- **WHEN** ...") steps.
const GWT_PATTERN = /^\s*(?:[-*]\s*)?(?:\*\*)?\s*(Given|When|Then|And|But)\b/i;
const SCENARIO_STEP_RE = /^#{4}\s+Scenario\b/im;
const SHALL_RE = /\b(SHALL|MUST)\b/;

const LEAKAGE_RULES = [
  {
    id: 'code-path',
    severity: 'blocking',
    pattern: /(?:src|lib|app|packages|tests?)\/[\w./-]+\.(?:js|jsx|ts|tsx|py|go|rs|java|php)/i,
    message: 'Spec references source/test file paths; use domain language instead.',
  },
  {
    id: 'implementation-type',
    severity: 'warning',
    pattern: /\b(class|function|method|component|hook|middleware|repository|controller|service)\b/i,
    message: 'Spec appears to mention implementation types.',
  },
  {
    id: 'database-detail',
    severity: 'warning',
    pattern: /\b(table|column|SQL|migration|index|foreign key|primary key)\b/i,
    message: 'Spec appears to mention database implementation details.',
  },
  {
    id: 'api-detail',
    severity: 'warning',
    pattern: /\b(GET|POST|PUT|PATCH|DELETE)\s+\/[\w/{}/:-]+|\b(endpoint|REST|GraphQL|OpenAPI)\b/i,
    message: 'Spec appears to mention transport/API implementation details.',
  },
  {
    id: 'test-placeholder',
    severity: 'blocking',
    pattern: /\b(TODO|TBD|FIXME|placeholder)\b/i,
    message: 'Spec contains unresolved placeholder language.',
  },
];

function lineDiagnostics(filePath, cwd) {
  const relFile = path.relative(cwd, filePath).replace(/\\/g, '/');
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return [{ file: relFile, line: 0, rule: 'read-error', severity: 'error', message: `Cannot read file: ${e.message}`, text: '', suggestion: '' }];
  }
  const lines = content.split('\n');
  const diagnostics = [];
  let scenarioCount = 0;
  let gwtCount = 0;

  for (const [index, line] of lines.entries()) {
    if (/^\s*(?:#{2,5}\s*)?Scenario\b/i.test(line)) scenarioCount++;
    if (GWT_PATTERN.test(line)) gwtCount++;

    for (const rule of LEAKAGE_RULES) {
      if (rule.pattern.test(line)) {
        diagnostics.push({
          file: relFile,
          line: index + 1,
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
          text: line.trim(),
          suggestion: 'Rewrite this line as externally observable behavior without naming implementation details.',
        });
      }
    }
  }

  if (scenarioCount === 0 && /\.(feature|md)$/.test(filePath)) {
    diagnostics.push({
      file: relFile,
      line: 1,
      rule: 'missing-scenario',
      severity: 'warning',
      message: 'Spec has no Scenario section.',
      text: '',
      suggestion: 'Add at least one Given/When/Then scenario.',
    });
  }

  if (scenarioCount > 0 && gwtCount === 0) {
    diagnostics.push({
      file: relFile,
      line: 1,
      rule: 'missing-gwt',
      severity: 'blocking',
      message: 'Scenario exists but no Given/When/Then steps were found.',
      text: '',
      suggestion: 'Add Given/When/Then steps to make the requirement testable.',
    });
  }

  return diagnostics;
}

class ValidateCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  /** Find the 1-based line number of a requirement header, 1 when absent. */
  findRequirementLine(content, name) {
    const target = `### Requirement: ${name}`;
    const index = content.split('\n').findIndex(line => line.trim() === target);
    return index >= 0 ? index + 1 : 1;
  }

  strictDiagnostics(changeDir, specFiles) {
    const diagnostics = [];
    for (const file of specFiles) {
      const relFile = path.relative(this.cwd, file).replace(/\\/g, '/');
      let content;
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch (err) {
        logger.warn(err.message);
        continue;
      }
      if (changeDir) {
        const rel = path.relative(path.join(changeDir, 'specs'), file);
        const mainPath = path.join(this.cwd, 'stdd', 'specs', rel);
        let mainContent = null;
        try {
          mainContent = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : null;
        } catch (err) {
          logger.warn(err.message); // fall back to no cross-checks
        }
        diagnostics.push(...this.checkDeltaFile(relFile, content, mainContent));
      } else {
        diagnostics.push(...this.checkMainFile(relFile, content));
      }
    }
    // Stable decision ID checks for the change's design.md (BMAD AD-n:
    // never renumber, never reuse; Supersedes must reference an existing AD).
    // design.md is deliberately NOT run through the spec leakage rules —
    // design documents implementation detail by design.
    if (changeDir) {
      const designPath = path.join(changeDir, 'design.md');
      if (fs.existsSync(designPath)) {
        try {
          diagnostics.push(...this.checkDecisionIds(designPath));
        } catch (err) {
          logger.warn(err.message);
        }
      }
    }
    return diagnostics;
  }

  checkDecisionIds(designPath) {
    const relFile = path.relative(this.cwd, designPath).replace(/\\/g, '/');
    const content = fs.readFileSync(designPath, 'utf8');
    const diagnostics = [];
    const numbers = [];
    let legacyCount = 0;
    for (const [index, line] of content.split('\n').entries()) {
      const adMatch = line.match(/^###\s+AD-(\d+)\s*:/);
      if (adMatch) {
        numbers.push({ n: Number(adMatch[1]), line: index + 1 });
        continue;
      }
      if (/^###\s+Decision:/.test(line)) legacyCount++;
    }
    if (legacyCount > 0) {
      diagnostics.push({
        file: relFile,
        line: 1,
        rule: 'ad-legacy-format',
        severity: 'warning',
        message: `${legacyCount} decision heading(s) use the legacy "### Decision:" format without stable IDs.`,
        text: '',
        suggestion: 'Use "### AD-n: [name]" so decision IDs are never renumbered or reused; supersede via a higher number plus "Supersedes: AD-x".',
      });
    }
    const seen = new Set();
    for (const { n, line } of numbers) {
      if (seen.has(n)) {
        diagnostics.push({
          file: relFile,
          line,
          rule: 'ad-duplicate',
          severity: 'blocking',
          message: `Duplicate decision ID AD-${n}; decision IDs must never be reused.`,
          text: `### AD-${n}:`,
          suggestion: 'Give the newer decision its own higher number and mark it "Supersedes: AD-n" instead of reusing the ID.',
        });
      }
      seen.add(n);
    }
    for (const [index, line] of content.split('\n').entries()) {
      for (const match of line.matchAll(/Supersedes:\s*AD-(\d+)/g)) {
        const target = Number(match[1]);
        if (!seen.has(target)) {
          diagnostics.push({
            file: relFile,
            line: index + 1,
            rule: 'ad-supersedes-missing',
            severity: 'blocking',
            message: `"Supersedes: AD-${target}" references a decision that does not exist in this design.`,
            text: line.trim(),
            suggestion: 'Reference the exact AD number being superseded, or add the referenced decision.',
          });
        }
      }
    }
    return diagnostics;
  }

  checkDeltaFile(relFile, content, mainContent) {
    const diagnostics = [];
    const parsed = parseDeltaSections(content);
    const main = mainContent !== null ? parseSpecRequirements(mainContent) : null;
    const mainNames = new Set(main ? main.requirements.map(r => r.name) : []);
    const mainBodies = new Map(main ? main.requirements.map(r => [r.name, r.body]) : []);
    const renameMap = new Map(parsed.sections.renamed.entries.map(e => [e.from, e.to]));
    const seen = new Set();

    if (!parsed.hasSections) {
      diagnostics.push({
        file: relFile,
        line: 1,
        rule: 'delta-structure',
        severity: 'warning',
        message: 'Delta spec has no ADDED/MODIFIED/REMOVED/RENAMED section.',
        text: '',
        suggestion: 'Group requirements under "## ADDED Requirements" style sections so archive can merge them.',
      });
    }

    // Shared per-requirement checks (also used by checkMainFile so the two
    // rule sets cannot drift apart).
    const checkRequirement = (req, section) => {
      this.checkRequirementShape(req, relFile, content, section).forEach(d => diagnostics.push(d));
      this.checkRequirementDuplicate(req.name, relFile, content, seen).forEach(d => diagnostics.push(d));
    };

    for (const req of parsed.sections.added.requirements) {
      checkRequirement(req, 'ADDED');
      if (main && mainNames.has(req.name)) {
        if (foldBody(mainBodies.get(req.name)) === foldBody(req.body)) {
          diagnostics.push({
            file: relFile,
            line: this.findRequirementLine(content, req.name),
            rule: 'already-synced',
            severity: 'warning',
            message: `ADDED "${req.name}" already exists in the main spec with identical content.`,
            text: req.header,
            suggestion: 'Remove the duplicate ADDED entry, or modify it instead.',
          });
        } else {
          diagnostics.push({
            file: relFile,
            line: this.findRequirementLine(content, req.name),
            rule: 'added-conflict',
            severity: 'blocking',
            message: `ADDED "${req.name}" already exists in the main spec with different content.`,
            text: req.header,
            suggestion: 'Use "## MODIFIED Requirements" instead of ADDED for existing requirements.',
          });
        }
      }
    }

    // Mirror applyDelta: MODIFIED/REMOVED may reference either side of a
    // rename declared in this same delta (the main spec still carries the
    // old name until the merge applies it).
    const renamedFrom = new Set(parsed.sections.renamed.entries.map(e => e.from));
    const renamedTo = new Map(parsed.sections.renamed.entries.map(e => [e.to, e.from]));
    const existsForMerge = name => mainNames.has(name)
      || renamedFrom.has(name)
      || (renamedTo.has(name) && mainNames.has(renamedTo.get(name)));

    for (const req of parsed.sections.modified.requirements) {
      checkRequirement(req, 'MODIFIED');
      if (main && !existsForMerge(req.name)) {
        diagnostics.push({
          file: relFile,
          line: this.findRequirementLine(content, req.name),
          rule: 'modified-target-missing',
          severity: 'blocking',
          message: `MODIFIED "${req.name}" not found in the main spec.`,
          text: req.header,
          suggestion: 'Match the exact "### Requirement:" header used in stdd/specs.',
        });
      }
    }

    for (const req of parsed.sections.removed.requirements) {
      this.checkRequirementDuplicate(req.name, relFile, content, seen).forEach(d => diagnostics.push(d));
      if (main && !existsForMerge(req.name)) {
        diagnostics.push({
          file: relFile,
          line: this.findRequirementLine(content, req.name),
          rule: 'removed-target-missing',
          severity: 'blocking',
          message: `REMOVED "${req.name}" not found in the main spec.`,
          text: req.header,
          suggestion: 'Match the exact "### Requirement:" header used in stdd/specs.',
        });
      }
    }

    for (const { from, to } of parsed.sections.renamed.entries) {
      if (main && !mainNames.has(from)) {
        if (mainNames.has(to)) {
          diagnostics.push({
            file: relFile,
            line: 1,
            rule: 'already-synced',
            severity: 'warning',
            message: `Rename "${from}" -> "${to}" appears already applied in the main spec.`,
            text: `- FROM: ${from}`,
            suggestion: 'Remove the stale RENAMED entry.',
          });
        } else {
          diagnostics.push({
            file: relFile,
            line: 1,
            rule: 'renamed-source-missing',
            severity: 'blocking',
            message: `RENAMED source "${from}" not found in the main spec.`,
            text: `- FROM: ${from}`,
            suggestion: 'Match the exact "### Requirement:" header used in stdd/specs.',
          });
        }
      } else if (main && mainNames.has(to) && from !== to) {
        diagnostics.push({
          file: relFile,
          line: 1,
          rule: 'renamed-target-exists',
          severity: 'blocking',
          message: `RENAMED target "${to}" already exists in the main spec.`,
          text: `- TO: ${to}`,
          suggestion: 'Pick a target name that is not already in use.',
        });
      }
    }

    return diagnostics;
  }

  checkMainFile(relFile, content) {
    const parsed = parseSpecRequirements(content);
    const diagnostics = [];
    const seen = new Set();
    for (const req of parsed.requirements) {
      this.checkRequirementShape(req, relFile, content).forEach(d => diagnostics.push(d));
      this.checkRequirementDuplicate(req.name, relFile, content, seen).forEach(d => diagnostics.push(d));
    }
    return diagnostics;
  }

  /** Scenario/SHALL shape checks shared by delta and main specs. */
  checkRequirementShape(req, relFile, content, section) {
    const line = this.findRequirementLine(content, req.name);
    const diagnostics = [];
    if (!SCENARIO_STEP_RE.test(req.body)) {
      diagnostics.push({
        file: relFile,
        line,
        rule: 'requirement-scenario',
        severity: 'blocking',
        message: `Requirement "${req.name}"${section ? ` (${section})` : ''} has no "#### Scenario:" section.`,
        text: req.header,
        suggestion: 'Add at least one scenario so the requirement stays verifiable.',
      });
    }
    if (!SHALL_RE.test(req.body)) {
      diagnostics.push({
        file: relFile,
        line,
        rule: 'shall-statement',
        severity: 'warning',
        message: `Requirement "${req.name}"${section ? ` (${section})` : ''} has no SHALL/MUST statement.`,
        text: req.header,
        suggestion: 'Describe core behavior with a SHALL/MUST statement.',
      });
    }
    return diagnostics;
  }

  /** Duplicate-header check shared by delta and main specs (mutates `seen`). */
  checkRequirementDuplicate(name, relFile, content, seen) {
    if (seen.has(name)) {
      return [{
        file: relFile,
        line: this.findRequirementLine(content, name),
        rule: 'duplicate-header',
        severity: 'blocking',
        message: `Duplicate "### Requirement: ${name}" in this spec.`,
        text: `### Requirement: ${name}`,
        suggestion: 'Requirement headers must be unique within a spec file.',
      }];
    }
    seen.add(name);
    return [];
  }

  execute(changeName, options = {}) {
    const stddDir = path.join(this.cwd, 'stdd');
    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const changeDir = changeName ? findActiveChange(stddDir, changeName) : null;
    if (changeName && !changeDir) {
      throw new Error(`Change '${changeName}' not found.`);
    }
    const specsDir = changeDir ? path.join(changeDir, 'specs') : path.join(stddDir, 'specs');
    if (!fs.existsSync(specsDir)) {
      throw new Error(changeName ? `No specs directory found for change '${changeName}'.` : 'No stdd/specs directory found.');
    }

    const specFiles = walkFiles(specsDir, { predicate: file => /\.(feature|md)$/.test(file) });
    const diagnostics = specFiles.flatMap(file => lineDiagnostics(file, this.cwd));
    if (options.strict) {
      diagnostics.push(...this.strictDiagnostics(changeDir, specFiles));
    }
    const taskReport = changeDir ? this.compareTasksToSpecs(changeDir, specFiles) : null;
    const blocking = diagnostics.filter(d => d.severity === 'blocking');
    const warning = diagnostics.filter(d => d.severity !== 'blocking');

    let mode = 'validate';
    if (options.specGuardian) {
      mode = options.strict ? 'strict+spec-guardian' : 'spec-guardian';
    } else if (options.strict) {
      mode = 'strict';
    }
    const report = {
      status: blocking.length > 0 ? 'fail' : 'pass',
      mode,
      change: changeDir ? path.basename(changeDir) : null,
      specFiles: specFiles.map(file => path.relative(this.cwd, file).replace(/\\/g, '/')),
      diagnostics,
      blocking: blocking.length,
      warning: warning.length,
      tasks: taskReport,
    };

    if (options.fix && diagnostics.length > 0) {
      report.fixOutput = this.writeRewriteSuggestions(changeDir || stddDir, diagnostics);
    }

    const capture = new EvidenceCapture();
    const evidence = capture.captureVerify('validate', report, {
      cwd: this.cwd,
      changeName: report.change,
      specGuardian: Boolean(options.specGuardian),
    });
    const evidencePath = capture.saveToFile(evidence, changeDir || stddDir, 'validate');
    report.evidence = path.relative(this.cwd, evidencePath).replace(/\\/g, '/');

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return report;
    }

    this.print(report);
    if (report.status === 'fail') process.exitCode = 1;
    return report;
  }

  compareTasksToSpecs(changeDir, specFiles) {
    const tasksPath = path.join(changeDir, 'tasks.md');
    const tasks = parseTasks(tasksPath) || [];
    const specText = specFiles.map(file => {
      try { return fs.readFileSync(file, 'utf8'); } catch (err) { logger.warn(err.message); return ''; }
    }).join('\n').toLowerCase();
    const uncovered = tasks
      .filter(task => !this.taskAppearsInSpecs(task.description, specText))
      .map(task => task.description);

    return {
      total: tasks.length,
      covered: Math.max(0, tasks.length - uncovered.length),
      uncovered,
    };
  }

  taskAppearsInSpecs(description, specText) {
    const words = String(description || '')
      .toLowerCase()
      .replace(/task-\d+[:：]?/g, '')
      .split(/[^a-z0-9\u4e00-\u9fa5]+/)
      .filter(word => word.length >= 3)
      .slice(0, 8);
    if (words.length === 0) return true;
    return words.some(word => specText.includes(word));
  }

  writeRewriteSuggestions(baseDir, diagnostics) {
    const outputPath = path.join(baseDir, 'spec-guardian-suggestions.md');
    const lines = ['# Spec Guardian Rewrite Suggestions', ''];
    for (const item of diagnostics) {
      lines.push(`## ${item.file}:${item.line}`);
      lines.push(`- Rule: ${item.rule}`);
      lines.push(`- Severity: ${item.severity}`);
      lines.push(`- Issue: ${item.message}`);
      if (item.text) lines.push(`- Current: ${item.text}`);
      lines.push(`- Suggestion: ${item.suggestion}`);
      lines.push('');
    }
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
    return path.relative(this.cwd, outputPath).replace(/\\/g, '/');
  }

  print(report) {
    console.log(chalk.bold(`\nSpec Validation${report.change ? `: ${report.change}` : ''}\n`));
    console.log(`  Specs:      ${report.specFiles.length}`);
    console.log(`  Blocking:   ${report.blocking > 0 ? chalk.red(report.blocking) : chalk.green(report.blocking)}`);
    console.log(`  Warnings:   ${report.warning > 0 ? chalk.yellow(report.warning) : chalk.green(report.warning)}`);
    if (report.tasks) {
      console.log(`  Task cover: ${report.tasks.covered}/${report.tasks.total}`);
    }
    for (const item of report.diagnostics) {
      const color = item.severity === 'blocking' ? chalk.red : chalk.yellow;
      console.log(`  ${color(item.severity.toUpperCase())} ${item.file}:${item.line} ${item.rule}`);
      console.log(`    ${item.message}`);
    }
    if (report.fixOutput) console.log(`\n  Suggestions: ${chalk.cyan(report.fixOutput)}`);
    console.log(`\n  Evidence: ${chalk.cyan(report.evidence)}`);
    console.log(report.status === 'pass' ? chalk.green('\nValidation passed\n') : chalk.red('\nValidation failed\n'));
  }
}

module.exports = { ValidateCommand, LEAKAGE_RULES };
