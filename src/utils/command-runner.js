const { spawnSync } = require('child_process');
const { parseCommand } = require('./parse-command');

// P0-3 Fix: Dangerous commands that should never be allowed
const DANGEROUS_COMMANDS = [
  /\brm\s+(-rf?|--recursive)\b/i,
  /\bdel\s+\/[fqs]\b/i,
  /\bformat\s+[a-z]:\b/i,
  /\bshred\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bsudo\b.*\b(rm|del|format|mkfs)\b/i,
  /\bbash\s+-c\b.*(\||&&|;)/i,
  /\beval\b/i,
  /\bexec\b.*\$\(/i,
  /\$\(/,
  /\bpowershell\b.*-Command\b/i,
];

function isDangerous(command) {
  for (const pattern of DANGEROUS_COMMANDS) {
    if (pattern.test(command)) {
      return true;
    }
  }
  return false;
}

function parseCommandLocal(command) {
  return parseCommand(command, 'Command');
}

function validateCommand(command, _options = {}) {
  const input = String(command || '').trim();
  if (!input) throw new Error('Command is required.');

  // P0-3 Fix: Block dangerous commands
  if (isDangerous(input)) {
    throw new Error(`Command rejected: Dangerous command detected. For security reasons, commands containing destructive operations (rm -rf, eval, exec$(), etc.) are not allowed.`);
  }

  // P0-3 Fix: Shell injection detection
  const injectionPatterns = [/\|/, /&&/, /;/, /\$\(/, /`/, />>\s*/, />\s*[^&]/];
  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      throw new Error('Command rejected: Potential shell injection detected. Characters like pipe, &&, semicolon, dollar, backtick, or redirect are not allowed in test commands.');
    }
  }

  return true;
}

// Test-infrastructure failure signatures: the test runner itself never got
// to execute assertions (missing binary, missing package.json, missing test
// script, missing executor). A non-zero exit from these is NOT a failing
// test suite and must never be recorded as RED evidence — "watch the test
// fail" requires the suite to actually run (终测复验 D03).
const INFRA_OUTPUT_PATTERNS = [
  /npm (?:ERR!|error)[^\n]*(?:ENOENT|Missing script|Could not read package\.json)/i,
  /Missing script:\s*["']?test/i,
  /Could not read package\.json/i,
  /command not found/i,
  /(?:^|\n)(?:sh|bash|zsh|dash):[^:\n]+:\s*(?:command )?not found/i,
  /ERR_MODULE_NOT_FOUND/,
  /Cannot find module\s+['"][^'"]*package\.json/,
  /Could not find ['"][^'"]*\.(?:test|spec)\.[cm]?[jt]s/i,
];

/**
 * Whether a spawn result failed for infrastructure reasons (the command
 * never ran as a test suite) rather than because tests asserted a failure.
 * @param {{status?: number|null, error?: Error, stdout?: string, stderr?: string}} result
 */
function isInfraFailure(result) {
  if (!result) return false;
  if (result.error) return true; // spawn-level failure (ENOENT/EACCES/timeout kill)
  const output = `${result.stderr || ''}\n${result.stdout || ''}`;
  if (!output) return false;
  return INFRA_OUTPUT_PATTERNS.some(pattern => pattern.test(output));
}

function runCommand(command, options = {}) {
  const input = String(command || '').trim();

  // P0-3 Fix: Validate command before execution
  validateCommand(input, options);

  const { bin, args } = parseCommandLocal(command);
  return spawnSync(bin, args, {
    cwd: options.cwd,
    stdio: options.stdio || 'pipe',
    encoding: 'utf-8',
    env: options.env,
    timeout: options.timeout,
  });
}

module.exports = { parseCommand, runCommand, validateCommand, isDangerous, isInfraFailure, INFRA_OUTPUT_PATTERNS };
