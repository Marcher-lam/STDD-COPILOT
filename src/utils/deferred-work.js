/**
 * Deferred Work Ledger (BMAD deferred-work / loop-sweep practice)
 *
 * Verification and review findings that are consciously postponed are
 * recorded in stdd/changes/<name>/deferred-work.md instead of being dropped.
 * Deferring is not discarding: open items surface in every verify run and
 * are carried into the archive, where they can be swept against the code.
 *
 * Ledger format:
 *   # Deferred Work
 *
 *   > 暂缓事项台账：defer 不是丢弃。归档前逐条对码验证（sweep）或显式解决。
 *
 *   - [ ] #1 [2026-11-05] Finding text (source: verify)
 *   - [x] #2 [2026-11-05] Resolved finding (source: verify)
 */

const fs = require('fs');
const path = require('path');

const DEFERRED_FILENAME = 'deferred-work.md';

const ENTRY_RE = /^-\s+\[([ xX✓])\]\s+#(\d+)\s+\[([^\]]*)\]\s+(.*)$/;

const LEDGER_HEADER = [
  '# Deferred Work',
  '',
  '> 暂缓事项台账：defer 不是丢弃。归档前逐条对码验证（sweep）或显式解决。',
  '',
].join('\n');

function ledgerPath(changeDir) {
  return path.join(changeDir, DEFERRED_FILENAME);
}

/**
 * Read the ledger for a change.
 * @returns {{entries: Array<{n: number, checked: boolean, date: string, text: string, raw: string}>, open: number, total: number}}
 */
function readDeferred(changeDir) {
  const file = ledgerPath(changeDir);
  if (!fs.existsSync(file)) {
    return { entries: [], open: 0, total: 0 };
  }
  const entries = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(ENTRY_RE);
    if (!match) continue;
    entries.push({
      n: Number(match[2]),
      checked: match[1] !== ' ',
      date: match[3],
      text: match[4].replace(/\s*\(source: [^)]*\)\s*$/, ''),
      raw: line,
    });
  }
  return {
    entries,
    total: entries.length,
    open: entries.filter(e => !e.checked).length,
  };
}

/**
 * Append a deferred finding. Numbering is sequential per change.
 * @returns {{n: number}}
 */
function appendDeferred(changeDir, text, source = 'verify') {
  const file = ledgerPath(changeDir);
  const state = readDeferred(changeDir);
  const next = state.total > 0 ? Math.max(...state.entries.map(e => e.n)) + 1 : 1;
  const date = new Date().toISOString().slice(0, 10);
  const entry = `- [ ] #${next} [${date}] ${String(text).trim()} (source: ${source})`;
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.endsWith('\n')) content += '\n';
    fs.writeFileSync(file, `${content}${entry}\n`, 'utf8');
  } else {
    fs.writeFileSync(file, `${LEDGER_HEADER}${entry}\n`, 'utf8');
  }
  return { n: next };
}

/**
 * Mark entry #n as resolved (checked).
 * @returns {{resolved: true, n: number} | {resolved: false, reason: string}}
 */
function resolveDeferred(changeDir, n) {
  const file = ledgerPath(changeDir);
  if (!fs.existsSync(file)) {
    return { resolved: false, reason: `No ${DEFERRED_FILENAME} ledger found.` };
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(ENTRY_RE);
    if (match && Number(match[2]) === Number(n)) {
      if (match[1] !== ' ') {
        return { resolved: true, n: Number(n) };
      }
      lines[i] = lines[i].replace(/^-\s+\[ \]/, '- [x]');
      found = true;
      break;
    }
  }
  if (!found) {
    return { resolved: false, reason: `Deferred entry #${n} not found.` };
  }
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  return { resolved: true, n: Number(n) };
}

module.exports = {
  DEFERRED_FILENAME,
  readDeferred,
  appendDeferred,
  resolveDeferred,
};
