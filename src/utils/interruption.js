/**
 * Interruption budget (model-strength adaptation P2-2).
 *
 * Audit finding: the config's pause layers were mostly theater — certainty
 * check_points, auto_skip_when, and phases_requiring_confirm had zero
 * consumers. Instead of merging phantom layers, this is the REAL unified
 * pause accounting: every gate that needs a human records one interruption
 * on the change (.state.yaml). A budget (default 3) makes pause density
 * visible; exceeding it escalates with restructuring guidance — the budget
 * never blocks a genuinely human decision, it makes the cost observable.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEFAULT_BUDGET = 3;

function statePath(changeDir) {
  return path.join(changeDir, '.state.yaml');
}

/**
 * Read the interruption accounting for a change.
 * @returns {{used: number, lastReason: string|null}}
 */
function readInterruptions(changeDir) {
  try {
    const file = statePath(changeDir);
    if (!fs.existsSync(file)) return { used: 0, lastReason: null };
    const match = fs.readFileSync(file, 'utf8').match(/^interruptions_used:\s*(\d+)$/m);
    const reason = fs.readFileSync(file, 'utf8').match(/^interruption_last:\s*(.+)$/m);
    if (!match) return { used: 0, lastReason: null };
    return { used: Number(match[1]), lastReason: reason ? reason[1].trim() : null };
  } catch {
    return { used: 0, lastReason: null };
  }
}

/**
 * Record one human interruption on the change (in-place counter update,
 * sibling state lines like rigor/baseline_commit are preserved).
 * @returns {{used: number}}
 */
function recordInterruption(changeDir, reason) {
  const file = statePath(changeDir);
  const current = readInterruptions(changeDir);
  const next = current.used + 1;
  const lines = [
    `interruptions_used: ${next}`,
    `interruption_last: ${String(reason).replace(/\n/g, ' ')}`,
  ];
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content
      .replace(/^interruptions_used:\s*\d+.*$/m, '')
      .replace(/^interruption_last:\s*.*$/m, '');
    content = `${content.trimEnd()}\n${lines.join('\n')}\n`;
    fs.writeFileSync(file, content, 'utf8');
  } else {
    fs.writeFileSync(file, `# STDD change state\n${lines.join('\n')}\n`, 'utf8');
  }
  return { used: next };
}

/** Budget from stdd/config.yaml `interruption.budget` (default 3). */
function readBudget(cwd) {
  try {
    const configPath = path.join(cwd, 'stdd', 'config.yaml');
    if (!fs.existsSync(configPath)) return DEFAULT_BUDGET;
    const config = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
    const value = config && config.interruption ? config.interruption.budget : undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BUDGET;
  } catch {
    return DEFAULT_BUDGET;
  }
}

/**
 * Current budget state for a change.
 * @returns {{used: number, budget: number, exceeded: boolean}}
 */
function budgetState(changeDir, cwd) {
  const budget = readBudget(cwd);
  const { used } = readInterruptions(changeDir);
  return { used, budget, exceeded: used > budget };
}

module.exports = {
  DEFAULT_BUDGET,
  readInterruptions,
  recordInterruption,
  readBudget,
  budgetState,
};
