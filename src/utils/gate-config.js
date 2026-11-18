/**
 * Process-truth gates config (过程审计 B-2/B-5).
 *
 * stdd/config.yaml:
 *   gates:
 *     confirmation: advisory   # advisory (default) | enforced
 *     refinement: warn         # off | warn (default) | block
 *
 * advisory/warn keep the historical behavior (visible signal, no
 * enforcement) so existing flows and scripts never break on upgrade;
 * teams tighten per-project. Fail-open on malformed config values EXCEPT
 * an explicitly invalid confirmation value, which fails CLOSED (a typo must
 * not silently disable an enforced gate).
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createLogger } = require('./logger');

const logger = createLogger('gate-config');

const CONFIRMATION_MODES = new Set(['advisory', 'enforced']);
const REFINEMENT_MODES = new Set(['off', 'warn', 'block']);

const DEFAULTS = { confirmation: 'advisory', refinement: 'warn' };

function readGateConfig(cwd) {
  const config = { ...DEFAULTS };
  let raw = null;
  try {
    const configPath = path.join(cwd, 'stdd', 'config.yaml');
    if (fs.existsSync(configPath)) {
      raw = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
    }
  } catch (err) {
    logger.warn(err.message);
    raw = null;
  }

  const gates = (raw && raw.gates) || {};
  if (gates.confirmation !== undefined) {
    const value = String(gates.confirmation);
    if (CONFIRMATION_MODES.has(value)) {
      config.confirmation = value;
    } else {
      // Fail closed on an invalid confirmation value.
      config.confirmation = 'enforced';
      config.confirmationInvalidValue = value;
    }
  }
  if (gates.refinement !== undefined) {
    const value = String(gates.refinement);
    if (REFINEMENT_MODES.has(value)) {
      config.refinement = value;
    } else {
      logger.warn(`Invalid gates.refinement '${value}'; using default 'warn'`);
    }
  }
  return config;
}

/**
 * Read the change's recorded confirmation decision (confirm-decision.json).
 * @returns {{status: string, decision: object}|null}
 */
function readConfirmEvidence(changeDir) {
  try {
    const p = path.join(changeDir, 'confirm-decision.json');
    if (!fs.existsSync(p)) return null;
    const decision = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!decision || typeof decision.status !== 'string') return null;
    return { status: decision.status, decision };
  } catch (err) {
    logger.warn(err.message);
    return null;
  }
}

/**
 * A confirmation counts as passed only for a RECORDED decision — an
 * explicit override (--yes/--skip) or a risk-triggered auto-approval.
 * `pending-human` is the gate asking for a human, never a pass.
 */
const CONFIRMED_STATUSES = new Set(['manual-override', 'auto-approved']);

function isConfirmed(evidence) {
  return Boolean(evidence && CONFIRMED_STATUSES.has(evidence.status));
}

module.exports = { readGateConfig, readConfirmEvidence, isConfirmed, CONFIRMED_STATUSES, DEFAULTS };
