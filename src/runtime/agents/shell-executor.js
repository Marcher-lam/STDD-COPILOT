const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { AgentExecutor } = require('./executor-interface');
const { parseCommand: sharedParseCommand } = require('../../utils/parse-command');
const { hashSensitiveData, redactSensitiveInfo } = require('../../utils/security');

const DEFAULT_ALLOWED_BINS = new Set(['node', process.execPath]);

function splitList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function basename(value) {
  return String(value || '').replace(/\\/g, '/').split('/').pop();
}

function parseCommand(command) {
  return sharedParseCommand(command, 'Shell agent command');
}

function hashArgs(args) {
  return hashSensitiveData((args || []).join('\0'));
}

function redact(value, maxLength = null) {
  const normalized = String(value || '').replace(/\\(["'])/g, '$1');
  const redacted = redactSensitiveInfo(normalized);
  return maxLength ? redacted.slice(0, maxLength) : redacted;
}

class ShellAgentExecutor extends AgentExecutor {
  constructor(options = {}) {
    super();
    this.command = options.command || process.env.STDD_AGENT_COMMAND;
    this.cwd = options.cwd || process.cwd();
    this.allowUnsafe = Boolean(options.allowUnsafe || process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR === '1');
    this.allowedBins = new Set([
      ...DEFAULT_ALLOWED_BINS,
      ...splitList(options.allowedBins),
      ...splitList(process.env.STDD_AGENT_ALLOWED_BINS),
    ]);
  }

  isAllowedBin(bin) {
    if (this.allowUnsafe) return true;
    return this.allowedBins.has(bin) || this.allowedBins.has(basename(bin));
  }

  _ensureAuditDir() {
    const dir = path.join(this.cwd, 'stdd', 'logs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  _writeAudit(event) {
    try {
      const dir = this._ensureAuditDir();
      const file = path.join(dir, 'shell-executor-audit.jsonl');
      fs.appendFileSync(file, JSON.stringify(event) + '\n', 'utf8');
    } catch (_) {
      // audit failure must not break execution
    }
  }

  async run(request = {}) {
    if (!this.command) {
      throw new Error('Shell agent executor requires --command or STDD_AGENT_COMMAND.');
    }

    const payload = JSON.stringify(request);
    const parsed = parseCommand(this.command);
    const allowed = this.isAllowedBin(parsed.bin);
    if (!allowed) {
      const err = new Error(`Shell agent executor rejected '${parsed.bin}'. Set STDD_AGENT_ALLOWED_BINS or pass --allow-unsafe-shell-executor to permit it.`);
      this._writeAudit({
        ts: new Date().toISOString(),
        bin: parsed.bin,
        argsHash: hashArgs(parsed.args),
        cwd: this.cwd,
        allowUnsafe: this.allowUnsafe,
        allowlisted: false,
        status: 'blocked',
        role: request.role,
        goal: redact(request.goal, 256),
      });
      throw err;
    }

    const startedAt = Date.now();
    let result;
    try {
      result = spawnSync(parsed.bin, parsed.args, {
        cwd: this.cwd,
        input: payload,
        encoding: 'utf8',
        shell: false,
        timeout: Number(request.timeout || 120000),
      });
    } catch (spawnErr) {
      this._writeAudit({
        ts: new Date().toISOString(),
        bin: parsed.bin,
        argsHash: hashArgs(parsed.args),
        cwd: this.cwd,
        allowUnsafe: this.allowUnsafe,
        allowlisted: true,
        status: 'spawn-error',
        error: redact(spawnErr.message, 256),
        elapsedMs: Date.now() - startedAt,
        role: request.role,
        goal: redact(request.goal, 256),
      });
      throw spawnErr;
    }

    const status = result.status === 0 ? 'success' : 'fail';
    this._writeAudit({
      ts: new Date().toISOString(),
      bin: parsed.bin,
      argsHash: hashArgs(parsed.args),
      cwd: this.cwd,
      allowUnsafe: this.allowUnsafe,
      allowlisted: true,
      status,
      exitCode: result.status,
      elapsedMs: Date.now() - startedAt,
      stderrTail: redact(String(result.stderr || '').slice(-200)),
      role: request.role,
      goal: redact(request.goal, 256),
    });

    return {
      status: status,
      adapter: 'shell',
      command: redact(this.command),
      exitCode: result.status,
      stdout: redact(result.stdout || ''),
      stderr: redact(result.stderr || ''),
      output: redact((result.stdout || result.stderr || '').trim()),
    };
  }
}

module.exports = { ShellAgentExecutor, parseCommand };
