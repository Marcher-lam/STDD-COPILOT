/**
 * Ruling Ledger (superpowers executing-plans: "Rulings, not stalls")
 *
 * Execution-time decisions are recorded as durable artifacts instead of
 * dying with the session (anti-context-compaction). A ruling captures
 * 决定 — 理由 — 出错了的代价 so a later change can revisit the decision
 * with its original trade-off intact.
 *
 * Ledger format:
 *   # Rulings
 *
 *   > 执行裁决记录：Ruling = 决定 — 理由 — 出错了的代价。裁决随工件持久化。
 *
 *   - #1 [2026-11-05] Skip cache invalidation — rarely hit path — stale reads for up to 60s
 */

const fs = require('fs');
const path = require('path');

const RULINGS_FILENAME = 'rulings.md';

const ENTRY_RE = /^-\s+#(\d+)\s+\[([^\]]*)\]\s+(.*)$/;

const LEDGER_HEADER = [
  '# Rulings',
  '',
  '> 执行裁决记录：Ruling = 决定 — 理由 — 出错了的代价。裁决随工件持久化，抗上下文压缩。',
  '',
].join('\n');

function ledgerPath(changeDir) {
  return path.join(changeDir, RULINGS_FILENAME);
}

/**
 * Read the ruling ledger for a change.
 * @returns {{entries: Array<{n: number, date: string, text: string}>, total: number}}
 */
function readRulings(changeDir) {
  const file = ledgerPath(changeDir);
  if (!fs.existsSync(file)) {
    return { entries: [], total: 0 };
  }
  const entries = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(ENTRY_RE);
    if (!match) continue;
    entries.push({ n: Number(match[1]), date: match[2], text: match[3].trim() });
  }
  return { entries, total: entries.length };
}

/**
 * Append an execution ruling. Numbering is sequential per change.
 * @returns {{n: number}}
 */
function appendRuling(changeDir, text) {
  const file = ledgerPath(changeDir);
  const state = readRulings(changeDir);
  const next = state.total > 0 ? Math.max(...state.entries.map(e => e.n)) + 1 : 1;
  const date = new Date().toISOString().slice(0, 10);
  const entry = `- #${next} [${date}] ${String(text).replace(/[\r\n]+/g, ' ').trim()}`;
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.endsWith('\n')) content += '\n';
    fs.writeFileSync(file, `${content}${entry}\n`, 'utf8');
  } else {
    fs.writeFileSync(file, `${LEDGER_HEADER}${entry}\n`, 'utf8');
  }
  return { n: next };
}

module.exports = {
  RULINGS_FILENAME,
  readRulings,
  appendRuling,
};
