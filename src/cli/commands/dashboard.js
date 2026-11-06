/**
 * Dashboard Command (frontend item 1): zero-dependency single-file HTML
 * dashboard over the stdd/ directory; optional tiny local --serve.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const chalk = require('chalk');
const { buildDashboardData, renderDashboardHtml } = require('../../utils/dashboard');

class DashboardCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.outPath = path.join(cwd, 'stdd', 'dashboard.html');
  }

  execute(action = 'generate', args = [], options = {}) {
    if (action === 'serve') return this.serve(options);
    if (action === 'generate' || action === 'gen' || !action || action === 'show') {
      return this.generate(options);
    }
    throw new Error(`Unknown dashboard action '${action}'. Use generate or serve.`);
  }

  generate(options = {}) {
    const data = buildDashboardData(this.cwd);
    const html = renderDashboardHtml(data);
    fs.mkdirSync(path.dirname(this.outPath), { recursive: true });
    fs.writeFileSync(this.outPath, html, 'utf8');

    if (options.json) {
      console.log(JSON.stringify({ path: this.outPath, changes: data.changes.length }, null, 2));
    } else {
      console.log(chalk.green('\n✓ Dashboard generated\n'));
      console.log(`  ${chalk.cyan(path.relative(this.cwd, this.outPath))}`);
      console.log(chalk.dim(`  ${data.changes.length} active change(s). Open the file in a browser, or:`));
      console.log(chalk.cyan('    stdd dashboard serve'));
    }
    return { path: this.outPath, changes: data.changes.length };
  }

  serve(options = {}) {
    if (!fs.existsSync(this.outPath)) this.generate({ ...options, json: true });
    const port = Number(options.port) || 4173;
    const html = fs.readFileSync(this.outPath, 'utf8');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    return new Promise(resolve => {
      server.listen(port, () => {
        console.log(chalk.green(`\n✓ Dashboard served at http://localhost:${port} (Ctrl+C to stop)`));
        resolve({ server, port });
      });
    });
  }
}

module.exports = { DashboardCommand };
