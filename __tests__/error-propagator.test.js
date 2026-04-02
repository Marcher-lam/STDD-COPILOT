const ErrorPropagator = require('../src/utils/error-propagator');

// 构建测试用 DAG
function buildTestGraph() {
  return {
    version: '1.0',
    config: { retry_count: 3 },
    skills: {
      'stdd-propose': {
        phase: 'propose',
        metadata: { category: 'requirement' },
        depends_on: [],
      },
      'stdd-spec': {
        phase: 'spec',
        metadata: { category: 'specification' },
        depends_on: ['stdd-propose'],
      },
      'stdd-plan': {
        phase: 'plan',
        metadata: { category: 'planning' },
        depends_on: ['stdd-spec'],
      },
      'stdd-apply': {
        phase: 'execute',
        metadata: { category: 'execution' },
        depends_on: ['stdd-plan'],
      },
      'stdd-verify': {
        phase: 'verify',
        metadata: { category: 'verification' },
        depends_on: ['stdd-apply'],
      },
    },
  };
}

// Mock cache（无需真实文件系统）
class MockCache {
  constructor() { this.cleared = false; }
  clear() { this.cleared = true; }
}

describe('ErrorPropagator', () => {
  it('应从执行节点向上传播到最近的决策点（planning 类别）', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    const result = propagator.propagate('stdd-apply', new Error('Build failed'), {});

    // stdd-apply → stdd-plan (category: planning) = 决策点，1 跳
    expect(result.targetNode).toBe('stdd-plan');
    expect(result.exhausted).toBe(false);
    expect(result.hops).toBe(1);
    expect(result.affectedNodes).toContain('stdd-apply');
    expect(result.affectedNodes).toContain('stdd-plan');
  });

  it('应从深层节点多跳传播', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    // stdd-verify → stdd-apply (execution, 非决策点) → stdd-plan (planning, 决策点)
    const result = propagator.propagate('stdd-verify', new Error('Test suite failed'), {});

    expect(result.targetNode).toBe('stdd-plan');
    expect(result.hops).toBe(2);
    expect(result.affectedNodes.length).toBe(3); // verify, apply, plan
    expect(result.report.evidenceCount).toBe(2); // 首次失败 + 1 跳传导（到达决策点时直接返回，不额外捕获）
  });

  it('根节点失败时应返回 exhausted', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    const result = propagator.propagate('stdd-propose', new Error('Root crash'), {});

    expect(result.exhausted).toBe(true);
    expect(result.targetNode).toBeNull();
    expect(result.report.evidenceCount).toBe(1);
    expect(result.message).toContain('Root node reached');
  });

  it('应识别 gate 节点为决策点', () => {
    const graph = buildTestGraph();
    graph.skills['stdd-confirm'] = {
      phase: 'confirm',
      metadata: { category: 'requirement', gate: 'human_approval' },
      depends_on: ['stdd-propose'],
    };
    graph.skills['stdd-spec'].depends_on = ['stdd-confirm'];

    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    // stdd-spec → stdd-confirm (gate: human_approval) = 决策点
    const result = propagator.propagate('stdd-spec', new Error('Spec error'), {});

    expect(result.targetNode).toBe('stdd-confirm');
    expect(result.hops).toBe(1);
  });

  it('超过最大跳数时应降级返回最后到达的节点', () => {
    // 构建一个没有决策点的线性链
    const graph = {
      version: '1.0',
      config: {},
      skills: {
        'a': { phase: 'run', metadata: { category: 'execution' }, depends_on: [] },
        'b': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['a'] },
        'c': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['b'] },
        'd': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['c'] },
        'e': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['d'] },
        'f': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['e'] },
      },
    };
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache, 2);

    const result = propagator.propagate('f', new Error('Deep failure'), {});

    expect(result.exhausted).toBe(true);
    expect(result.hops).toBe(2);
    // 应该回退了但未找到决策点
    expect(result.targetNode).toBe('d');
  });

  it('证据链应包含结构化指令摘要', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    const result = propagator.propagate('stdd-verify', new Error('Mutation test failed'), {});

    expect(result.report.instruction).toContain('Reverse self-healing triggered');
    expect(result.report.instruction).toContain('stdd-verify');
    expect(result.report.instruction).toContain('revise the upstream strategy');
    expect(result.report.timeline.length).toBeGreaterThan(0);
  });
});
