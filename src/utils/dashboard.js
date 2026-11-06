/**
 * Zero-dependency dashboard (frontend item 1).
 *
 * Aggregates the stdd/ directory into a JSON snapshot and renders a
 * SINGLE-FILE HTML dashboard (inline data + vanilla JS): no build step,
 * no CDN, no external network calls.
 */

const fs = require('fs');
const path = require('path');
const { parseTasks } = require('./change-utils');
const { readDeferred } = require('./deferred-work');
const { readRulings } = require('./ruling-ledger');
const { readChangeRigor } = require('./rigor');
const { readInterruptions } = require('./interruption');

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function lastEvidenceStatus(changeDir) {
  const dir = path.join(changeDir, 'evidence');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(f => /^verify-.*\.json$/.test(f))
    .sort();
  if (files.length === 0) return null;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8'));
    return data.status || null;
  } catch {
    return null;
  }
}

/**
 * Aggregate the dashboard snapshot for a project.
 */
function buildDashboardData(cwd) {
  const changes = [];
  const changesDir = path.join(cwd, 'stdd', 'changes');
  if (fs.existsSync(changesDir)) {
    for (const entry of fs.readdirSync(changesDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'archive') continue;
      const changeDir = path.join(changesDir, entry.name);
      // Canonical readers shared with the verify/archive gates — the
      // dashboard can never disagree with them.
      const taskList = parseTasks(path.join(changeDir, 'tasks.md')) || [];
      changes.push({
        name: entry.name,
        tasks: { done: taskList.filter(t => t.isDone).length, total: taskList.length },
        rigor: readChangeRigor(changeDir),
        interruptionsUsed: readInterruptions(changeDir).used,
        deferred: readDeferred(changeDir),
        rulings: readRulings(changeDir),
        lastVerifyStatus: lastEvidenceStatus(changeDir),
      });
    }
  }
  changes.sort((a, b) => a.name.localeCompare(b.name));
  return { generatedAt: new Date().toISOString(), changes };
}

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render the single-file HTML dashboard.
 */
function renderDashboardHtml(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const rows = data.changes.map(c => [
    '<tr>',
    '<td>' + esc(c.name) + '</td>',
    '<td>' + esc(c.rigor || '-') + '</td>',
    '<td>' + c.tasks.done + '/' + c.tasks.total + '</td>',
    '<td>' + (c.lastVerifyStatus ? esc(c.lastVerifyStatus) : '-') + '</td>',
    '<td>' + c.deferred.open + '</td>',
    '<td>' + c.rulings.total + '</td>',
    '<td>' + c.interruptionsUsed + '</td>',
    '</tr>',
  ].join('')).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>STDD Dashboard</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; background: #0b1020; color: #e2e8f0; }
  h1 { font-size: 1.4rem; }
  table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
  th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #1e293b; }
  th { color: #94a3b8; font-weight: 600; }
  .meta { color: #64748b; font-size: .85rem; margin-top: 1rem; }
</style>
</head>
<body>
<h1>STDD Dashboard</h1>
<table>
<thead><tr><th>Change</th><th>Rigor</th><th>Tasks</th><th>Last verify</th><th>Deferred (open)</th><th>Rulings</th><th>Interruptions</th></tr></thead>
<tbody>
${rows || '<tr><td colspan="7">No active changes.</td></tr>'}
</tbody>
</table>
<p class="meta">Generated ${esc(data.generatedAt)} &middot; stdd dashboard generate</p>
<script>
window.STDD_DATA = ${json};
// Progressive enhancement hook: future interactivity reads window.STDD_DATA.
</script>
</body>
</html>
`;
}

module.exports = { buildDashboardData, renderDashboardHtml };
