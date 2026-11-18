/**
 * Known-failure baseline (过程审计 A-3 / B-4).
 *
 * A brownfield repo often carries pre-existing failing tests. Without a
 * baseline, `apply` reads those failures as "RED as expected" and then as
 * "GREEN not reached" — the same evidence gets two contradictory readings
 * and the RED ledger records polluted evidence.
 *
 * `stdd baseline capture` records the CURRENT failing-test signatures into
 * stdd/baseline.json. Afterwards:
 *   - RED requires at least one NEW failing test (baseline-only failures
 *     are rejected as "not your red light"),
 *   - GREEN/REFACTOR pass when every remaining failure is in the baseline
 *     (exemptions are counted and recorded in the evidence).
 *
 * No baseline.json → behavior is exactly the pre-baseline semantics.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createLogger } = require('./logger');

const logger = createLogger('baseline');

const BASELINE_FILENAME = 'baseline.json';

function baselinePath(cwd) {
  return path.join(cwd, 'stdd', BASELINE_FILENAME);
}

/**
 * Extract failing-test signatures from a test run's combined output.
 * Covers the common reporter families; unknown formats fall back to a
 * digest of the first output lines so ANY output change reads as a change
 * in failures (coarse but never silently empty).
 *
 * @param {string} output - combined stdout+stderr
 * @returns {string[]} signatures, [] when output looks like a clean run
 */
function extractFailureSignatures(output) {
  const text = String(output || '');
  if (!text.trim()) return [];
  const signatures = new Set();

  // jest / node:test spec-style failing test names
  for (const m of text.matchAll(/^[ \t]*(?:✕|×|✗)[ \t]+(.+)$/gm)) {
    signatures.add(m[1].trim());
  }
  // TAP (node --test, tape): "not ok 12 - name" — including INDENTED
  // subtests (node --test reports suite-level "not ok 1 - test" plus the
  // real test names on indented child lines; skipping the indent collapsed
  // every failure into one suite-level signature).
  for (const m of text.matchAll(/^\s*not ok \d+(?: -)? (.+)$/gm)) {
    const name = m[1].trim();
    // Suite-level placeholders ("test") carry no identity — keep them out
    // so per-test names do the discriminating.
    if (name && name !== 'test' && name !== 'suite') signatures.add(name);
  }
  // jest file-level FAIL markers
  for (const m of text.matchAll(/^FAIL[ \t]+(\S+)/gm)) {
    signatures.add(`file:${m[1].trim()}`);
  }
  // mocha numbered failure list: "  3) test name"
  for (const m of text.matchAll(/^\s+\d+\)\s+(.+)$/gm)) {
    signatures.add(m[1].trim());
  }

  // TAP/mocha summary counts: directory-mode runners (node --test <dir>)
  // collapse every failure into one suite-level "test" entry without
  // per-test names — the FAIL COUNT is then the only discriminator, and a
  // changed count shows up as a new signature (new failure) while an
  // unchanged count matches the baseline.
  for (const m of text.matchAll(/^# fail (\d+)$/gm)) {
    signatures.add(`tap:fail=${m[1]}`);
  }
  for (const m of text.matchAll(/^(\d+) failing$/gm)) {
    signatures.add(`mocha:fail=${m[1]}`);
  }

  if (signatures.size > 0) return Array.from(signatures);

  // Unrecognized failing output: digest the head of the output so the
  // baseline still distinguishes "same failure as before" from "new".
  const head = text.split('\n').filter(l => l.trim()).slice(0, 5).join('\n');
  const digest = crypto.createHash('sha256').update(head).digest('hex').slice(0, 12);
  return [`unparsed:${digest}`];
}

/**
 * @returns {{capturedAt: string, commands: string[], failures: string[]}|null}
 */
function readBaseline(cwd) {
  try {
    const p = baselinePath(cwd);
    if (!fs.existsSync(p)) return null;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!data || !Array.isArray(data.failures)) return null;
    return data;
  } catch (err) {
    logger.warn(err.message);
    return null;
  }
}

function writeBaseline(cwd, data) {
  const p = baselinePath(cwd);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  return p;
}

function clearBaseline(cwd) {
  const p = baselinePath(cwd);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  return p;
}

/**
 * Split a run's failure signatures against the baseline.
 * @returns {{baselineActive: boolean, newFailures: string[], exempted: string[]}}
 */
function classifyFailures(signatures, cwd) {
  const baseline = readBaseline(cwd);
  if (!baseline) {
    return { baselineActive: false, newFailures: signatures, exempted: [] };
  }
  const known = new Set(baseline.failures);
  const newFailures = signatures.filter(s => !known.has(s));
  const exempted = signatures.filter(s => known.has(s));
  return { baselineActive: true, newFailures, exempted };
}

module.exports = {
  BASELINE_FILENAME,
  extractFailureSignatures,
  classifyFailures,
  readBaseline,
  writeBaseline,
  clearBaseline,
};
