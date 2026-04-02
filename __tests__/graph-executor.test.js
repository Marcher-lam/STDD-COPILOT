const GraphExecutor = require('../src/utils/graph-executor');

describe('GraphExecutor (反向图级自愈引擎)', () => {
  it('应该在线性执行中对下游节点的异常实施多跳反向传播，退回到决策点回炉，并最终自愈完成全链路', async () => {
    const executor = new GraphExecutor('feature', 'test-executor-1');

    // 注入：让 stdd-apply 节点故意发生业务级崩溃
    const initialInputs = {
      scope: 'payment-gateway',
      shouldFailOn: 'stdd-apply'
    };

    const finalState = await executor.runUntil('stdd-verify', initialInputs);

    // 成功自愈通过
    expect(finalState.success).toBe(true);
    expect(finalState.generator).toBe('stdd-apply');

    // 验证自愈元数据：记录了原始失败节点和传播跳数
    expect(finalState._healingMeta).toBeDefined();
    expect(finalState._healingMeta.originalFailure).toBe('stdd-apply');
    // stdd-apply → stdd-plan (planning 决策点)，应至少 1 跳
    expect(finalState._healingMeta.hops).toBeGreaterThanOrEqual(1);
    // 受影响节点应包含失败节点和回炉目标
    expect(finalState._healingMeta.affectedNodes).toContain('stdd-apply');
  });

  it('超过容错阈值的无法自愈错误应彻底熔断系统', async () => {
    const executor = new GraphExecutor('feature', 'test-executor-2');
    executor.maxRollbacks = 2;

    // 注入一个顽固级故障，即使回退也无法通过
    const initialInputs = { _persistentFailure: true };
    executor._executeNode = async (nodeName) => {
      if (nodeName === 'stdd-apply') throw new Error('Persistent compile error');
      return { success: true, nodeName };
    };

    await expect(executor.runUntil('stdd-verify', initialInputs)).rejects.toThrow(/System exhausted max rollbacks/);
  });

  it('根节点失败时应触发熔断并输出完整证据链', async () => {
    const executor = new GraphExecutor('feature', 'test-executor-3');

    // 让第一个节点失败（无前置依赖，无法向上传播）
    executor._executeNode = async (nodeName) => {
      if (nodeName === 'stdd-propose') throw new Error('Root node catastrophic failure');
      return { success: true, nodeName };
    };

    await expect(executor.runUntil('stdd-verify', {})).rejects.toThrow(/Fatal.*Auto-healing exhausted|System exhausted max rollbacks/);
  });
});

describe('GraphExecutor (异构并行执行)', () => {
  it('应该初始化异构适配器和并行执行器', () => {
    const executor = new GraphExecutor('feature', 'test-heterogeneous');

    expect(executor.adapter).toBeDefined();
    expect(executor.parallel).toBeDefined();
    expect(executor.adapter instanceof require('../src/utils/heterogeneous-adapter')).toBe(true);
    expect(executor.parallel instanceof require('../src/utils/parallel-executor')).toBe(true);
  });

  it('应该通过适配器获取引擎统计信息', () => {
    const executor = new GraphExecutor('feature', 'test-heterogeneous');
    const stats = executor.adapter.getStats();

    expect(stats.total).toBeGreaterThan(0);
    expect(stats.enabled).toBeGreaterThan(0);
    expect(stats.byTier).toBeDefined();
  });
});
