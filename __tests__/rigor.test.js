/**
 * Unit tests for the shared rigor utility (model-strength adaptation P1-1).
 *
 * Rigor is a property of the CHANGE, not of the command invocation: ff/issue
 * record it into .state.yaml, verify/archive honor it unless explicitly
 * overridden, and graph run compiles it per intent — all through this module.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  RIGOR_LEVELS,
  DEFAULT_RIGOR_BY_INTENT,
  validateRigor,
  assessTextRigor,
  resolveRigor,
  rigorNodeOptions,
  writeChangeRigor,
  readChangeRigor,
} = require('../src/utils/rigor');

describe('rigor util', () => {
  describe('validateRigor', () => {
    it('accepts the three levels', () => {
      for (const level of RIGOR_LEVELS) expect(() => validateRigor(level)).not.toThrow();
    });

    it('rejects anything else', () => {
      expect(() => validateRigor('extreme')).toThrow(/rigor/i);
    });
  });

  describe('assessTextRigor', () => {
    it('escalates to strict on irreversible signals', () => {
      expect(assessTextRigor('migrate the database and drop legacy tables')).toBe('strict');
      expect(assessTextRigor('add payment webhook')).toBe('strict');
      expect(assessTextRigor('refactor the auth middleware')).toBe('strict');
    });

    it('returns null for routine text', () => {
      expect(assessTextRigor('add a logout button to the header')).toBeNull();
    });
  });

  describe('resolveRigor', () => {
    it('explicit wins and is validated', () => {
      expect(resolveRigor({ explicit: 'strict', intent: 'hotfix', text: 'nothing risky' }).level).toBe('strict');
      expect(() => resolveRigor({ explicit: 'extreme' })).toThrow(/rigor/i);
    });

    it('risk text escalates over the intent default', () => {
      const result = resolveRigor({ intent: 'hotfix', text: 'fix the payment migration' });
      expect(result.level).toBe('strict');
      expect(result.basis).toMatch(/risk signal/i);
    });

    it('falls back to the intent default', () => {
      expect(resolveRigor({ intent: 'hotfix', text: 'fix a typo' }).level).toBe('light');
      expect(resolveRigor({ intent: 'feature', text: 'add a button' }).level).toBe('standard');
      expect(DEFAULT_RIGOR_BY_INTENT.research).toBe('light');
    });

    it('defaults to standard without intent or signals', () => {
      expect(resolveRigor({ text: 'add a button' }).level).toBe('standard');
    });
  });

  describe('rigorNodeOptions', () => {
    it('scales verify and archive gates', () => {
      expect(rigorNodeOptions('stdd-verify', 'light')).toEqual({ constitution: false });
      expect(rigorNodeOptions('stdd-verify', 'strict')).toEqual({ lint: true });
      expect(rigorNodeOptions('stdd-verify', 'standard')).toEqual({});
      expect(rigorNodeOptions('stdd-archive', 'light')).toEqual({ skipStrict: true });
      expect(rigorNodeOptions('stdd-archive', 'strict')).toEqual({});
    });
  });

  describe('change state persistence', () => {
    let tmp;
    beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-rigor-')); });
    afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

    it('round-trips and never overwrites an existing rigor', () => {
      expect(readChangeRigor(tmp)).toBeNull();
      writeChangeRigor(tmp, 'strict');
      expect(readChangeRigor(tmp)).toBe('strict');
      // A later write must not silently change the recorded level.
      writeChangeRigor(tmp, 'light');
      expect(readChangeRigor(tmp)).toBe('strict');
    });

    it('appends to an existing .state.yaml without clobbering it', () => {
      fs.writeFileSync(path.join(tmp, '.state.yaml'), '# STDD change state\nbaseline_commit: "abc"\n', 'utf8');
      writeChangeRigor(tmp, 'light');
      const content = fs.readFileSync(path.join(tmp, '.state.yaml'), 'utf8');
      expect(content).toContain('baseline_commit: "abc"');
      expect(content).toContain('rigor: light');
    });
  });
});
