/**
 * Shared rigor utility (model-strength adaptation).
 *
 * Rigor is a property of the CHANGE, not of the command invocation:
 * ff/issue/turbo record a level into stdd/changes/<n>/.state.yaml,
 * verify/archive honor it unless explicitly overridden, and graph run
 * compiles it per intent — all through this module. Levels scale the
 * per-node gates (OpenSpec "Progressive Rigor"): light loosens ceremony for
 * routine changes, strict tightens it for irreversible/high-risk work.
 */

const fs = require('fs');
const path = require('path');

const RIGOR_LEVELS = ['light', 'standard', 'strict'];

const DEFAULT_RIGOR_BY_INTENT = {
  feature: 'standard',
  hotfix: 'light',
  issue: 'light',
  repair: 'standard',
  research: 'light',
  brownfield: 'standard',
};

// Irreversible / high-risk signals: one hit is enough to escalate — a strong
// model being confident about a destructive change is exactly when the
// tighter gates must apply.
const IRREVERSIBLE_RE = /migrat\w*|drop\s+table|data\s*loss|删除数据|破坏性|不可逆|breaking\s*change|\bauth\b|\bsecurity\b|\bpayment\w*|公开\s*api/i;

function validateRigor(level) {
  if (!RIGOR_LEVELS.includes(level)) {
    throw new Error(`Invalid rigor '${level}'. Valid levels: ${RIGOR_LEVELS.join(', ')}.`);
  }
  return level;
}

/**
 * Assess free text for irreversible signals.
 * @returns {'strict'|null}
 */
function assessTextRigor(text) {
  return IRREVERSIBLE_RE.test(String(text || '')) ? 'strict' : null;
}

/**
 * Resolve the rigor level. Priority: explicit flag > risk signals in text >
 * intent default > standard.
 * @returns {{level: string, basis: string}}
 */
function resolveRigor({ explicit, intent, text } = {}) {
  if (explicit) {
    validateRigor(explicit);
    return { level: explicit, basis: 'explicit --rigor' };
  }
  if (text && assessTextRigor(text) === 'strict') {
    const hit = String(text).match(new RegExp(IRREVERSIBLE_RE.source, 'i'));
    return { level: 'strict', basis: `risk signal: ${hit ? hit[0] : 'detected'}` };
  }
  if (intent && DEFAULT_RIGOR_BY_INTENT[intent]) {
    return { level: DEFAULT_RIGOR_BY_INTENT[intent], basis: `intent default (${intent})` };
  }
  return { level: 'standard', basis: 'default' };
}

/**
 * Per-node gate scaling shared by graph run and the main workflow.
 * Explicit user options always win — rigor only provides defaults.
 */
function rigorNodeOptions(nodeName, rigor) {
  if (nodeName === 'stdd-verify') {
    if (rigor === 'light') return { constitution: false };
    if (rigor === 'strict') return { lint: true };
  }
  if (nodeName === 'stdd-archive' && rigor === 'light') {
    return { skipStrict: true };
  }
  return {};
}

/**
 * Record `rigor: <level>` in the change's .state.yaml. Idempotent: an
 * existing rigor is never overwritten (the level is decided when the change
 * is created; escalate explicitly with --rigor on the creating command).
 */
function writeChangeRigor(changeDir, level) {
  validateRigor(level);
  const statePath = path.join(changeDir, '.state.yaml');
  if (fs.existsSync(statePath)) {
    const existing = fs.readFileSync(statePath, 'utf8');
    if (/^rigor:\s*\w+$/m.test(existing)) return level;
    fs.appendFileSync(statePath, `rigor: ${level}\n`, 'utf8');
    return level;
  }
  fs.writeFileSync(statePath, `# STDD change state\nrigor: ${level}\n`, 'utf8');
  return level;
}

/** Read the change's recorded rigor, or null. */
function readChangeRigor(changeDir) {
  try {
    const statePath = path.join(changeDir, '.state.yaml');
    if (!fs.existsSync(statePath)) return null;
    const match = fs.readFileSync(statePath, 'utf8').match(/^rigor:\s*(\w+)$/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

module.exports = {
  RIGOR_LEVELS,
  DEFAULT_RIGOR_BY_INTENT,
  IRREVERSIBLE_RE,
  validateRigor,
  assessTextRigor,
  resolveRigor,
  rigorNodeOptions,
  writeChangeRigor,
  readChangeRigor,
};
