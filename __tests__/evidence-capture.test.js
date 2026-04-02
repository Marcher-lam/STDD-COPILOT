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
});
