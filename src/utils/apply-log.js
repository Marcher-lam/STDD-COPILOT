/**
 * Shared apply.log reader (format contract between apply and verify).
 *
 * Lines look like: `[ISO] {json}` — malformed lines are skipped.
 */

const fs = require('fs');
const path = require('path');

function readApplyLog(changeDir) {
  const logPath = path.join(changeDir, 'apply.log');
  if (!fs.existsSync(logPath)) return [];
  const entries = [];
  for (const line of fs.readFileSync(logPath, 'utf8').split('\n')) {
    const jsonPart = line.replace(/^\[[^\]]+\]\s*/, '');
    if (!jsonPart) continue;
    try {
      entries.push(JSON.parse(jsonPart));
    } catch {
      // Skip malformed log lines.
    }
  }
  return entries;
}

module.exports = { readApplyLog };
