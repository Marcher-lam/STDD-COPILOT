const EvidenceCapture = require('../src/utils/evidence-capture');

describe('EvidenceCapture', () => {
  it('应该截取结构化错误证据', () => {
    const ec = new EvidenceCapture();
    const err = new Error('Test failure at node X');
    err.stack = 'Error: Test failure\n    at test.js:10:5';

    const evidence = ec.capture('stdd-apply', err, {
      inputs: { scope: 'payment' },
      phase: 'execute',
    });

    expect(evidence.id).toBeDefined();
    expect(evidence.nodeName).toBe('stdd-apply');
    expect(evidence.error.type).toBe('Error');
    expect(evidence.error.message).toBe('Test failure at node X');
    expect(evidence.error.stack).toContain('test.js:10:5');
    expect(evidence.phase).toBe('execute');
    expect(evidence.inputSnapshot).toEqual({ scope: 'payment' });
    expect(evidence.timestamp).toBeGreaterThan(0);
  });

  it('应该累积多跳证据链', () => {
    const ec = new EvidenceCapture();

    ec.capture('stdd-apply', new Error('Apply failed'), { phase: 'execute' });
    ec.capture('stdd-plan', new Error('Propagation through plan'), { phase: 'plan' });
    ec.capture('stdd-spec', new Error('Propagation through spec'), { phase: 'spec' });

    expect(ec.chain.length).toBe(3);

    const report = ec.buildReport();
    expect(report.evidenceCount).toBe(3);
    expect(report.firstFailureAt).toBe('stdd-apply');
    expect(report.latestFailureAt).toBe('stdd-spec');
    expect(report.timeline.length).toBe(3);
    expect(report.instruction).toContain('Evidence chain length: 3');
    expect(report.instruction).toContain('stdd-apply');
  });

  it('应该生成去重指纹', () => {
    const ec = new EvidenceCapture();
    const err = new Error('Same error');

    const e1 = ec.capture('node-A', err, { phase: 'exec' });
    ec.reset();
    const e2 = ec.capture('node-A', err, { phase: 'exec' });

    // 相同输入应产生相同指纹
    expect(e1.id).toBe(e2.id);

    ec.reset();
    const e3 = ec.capture('node-B', err, { phase: 'exec' });

    // 不同节点应产生不同指纹
    expect(e1.id).not.toBe(e3.id);
  });

  it('应该安全截断过大的输入快照', () => {
    const ec = new EvidenceCapture();
    const hugeInput = { data: 'x'.repeat(10000) };

    const evidence = ec.capture('node-X', new Error('big input'), {
      inputs: hugeInput,
    });

    expect(evidence.inputSnapshot.__truncated).toBe(true);
    expect(evidence.inputSnapshot.preview.length).toBeLessThanOrEqual(2048);
  });

  it('reset 应清空证据链', () => {
    const ec = new EvidenceCapture();
    ec.capture('node-A', new Error('test'), {});
    ec.capture('node-B', new Error('test'), {});

    ec.reset();
    expect(ec.chain.length).toBe(0);

    const report = ec.buildReport();
    expect(report.evidenceCount).toBe(0);
    expect(report.instruction).toBe('No evidence captured.');
  });

  describe('_safeSnapshot', () => {
    it('should return null for null input', () => {
      const ec = new EvidenceCapture();
      expect(ec._safeSnapshot(null)).toBeNull();
    });

    it('should handle circular references gracefully', () => {
      const ec = new EvidenceCapture();
      const circular = {};
      circular.self = circular;

      const result = ec._safeSnapshot(circular);
      expect(result.__unserializable).toBe(true);
    });
  });

  describe('captureVerify', () => {
    it('should return unknown status when results is null', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('verify', null);
      expect(report.status).toBe('unknown');
      expect(report.type).toBe('verify');
    });

    it('should return unknown status for unknown type', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('other', { some: 'data' });
      expect(report.status).toBe('unknown');
    });

    it('should return pass for verify with all checks passing', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('verify', {
        tasks: { allDone: true },
        tests: { passed: true },
        constitution: { status: 'pass' },
        lint: null,
      });
      expect(report.status).toBe('pass');
    });

    it('should return fail for verify with failing tasks', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('verify', {
        tasks: { allDone: false },
        tests: { passed: true },
        constitution: { status: 'pass' },
        lint: null,
      });
      expect(report.status).toBe('fail');
    });

    it('should return pass for guard when all checks pass', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('guard', {
        check1: { status: 'pass' },
        check2: { status: 'skip' },
        check3: { status: 'warn' },
      });
      expect(report.status).toBe('pass');
    });

    it('should return fail for guard when a check fails', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('guard', {
        check1: { status: 'pass' },
        check2: { status: 'fail' },
      });
      expect(report.status).toBe('fail');
    });

    // 终测 N-graph: graph-run evidence used to persist status 'unknown' for
    // every run because _determineStatus had no branch for the type.
    it('should return pass for graph-run with all steps successful', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('graph-run', {
        steps: [
          { node: 'stdd-plan', status: 'success' },
          { node: 'stdd-apply', status: 'success' },
          { node: 'stdd-verify', status: 'cached' },
        ],
        failedAt: null,
      });
      expect(report.status).toBe('pass');
    });

    it('should return skipped for graph-run with skipped steps (--skip-apply)', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('graph-run', {
        steps: [
          { node: 'stdd-plan', status: 'success' },
          { node: 'stdd-apply', status: 'skipped' },
          { node: 'stdd-verify', status: 'skipped' },
        ],
        failedAt: null,
      });
      expect(report.status).toBe('skipped');
    });

    it('should return fail for graph-run with a failed step or failedAt', () => {
      const ec = new EvidenceCapture();
      const failedStep = ec.captureVerify('graph-run', {
        steps: [
          { node: 'stdd-plan', status: 'success' },
          { node: 'stdd-apply', status: 'failed' },
        ],
        failedAt: 'stdd-apply',
      });
      expect(failedStep.status).toBe('fail');

      const failedOnly = ec.captureVerify('graph-run', {
        steps: [{ node: 'stdd-apply', status: 'failed' }],
        failedAt: null,
      });
      expect(failedOnly.status).toBe('fail');
    });

    it('should return unknown for graph-run with no steps', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('graph-run', { steps: [], failedAt: null });
      expect(report.status).toBe('unknown');
    });
  });

  describe('saveToFile', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    it('should save evidence report to disk', () => {
      const ec = new EvidenceCapture();
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-cap-'));
      try {
        const report = ec.captureVerify('verify', { tasks: { allDone: true } });
        const filePath = ec.saveToFile(report, tmpDir, 'test');

        expect(fs.existsSync(filePath)).toBe(true);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(content.type).toBe('verify');
        expect(content.status).toBeDefined();
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
