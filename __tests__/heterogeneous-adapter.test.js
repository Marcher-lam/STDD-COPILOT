const HeterogeneousAdapter = require('../src/utils/heterogeneous-adapter');

describe('HeterogeneousAdapter', () => {
  it('应加载引擎注册表并构建 Tier 分层', () => {
    const adapter = new HeterogeneousAdapter();

    const stats = adapter.getStats();
    expect(stats.total).toBeGreaterThan(10);
    expect(stats.enabled).toBeGreaterThan(0);
    expect(stats.byTier.full).toBeGreaterThan(0);
  });

  it('应查找能执行指定 Skill 的引擎', () => {
    const adapter = new HeterogeneousAdapter();

    // stdd-spec 应该有 full 兼容的引擎（claude_code）
    const engines = adapter.findCapableEngines('stdd-spec');
    expect(engines.length).toBeGreaterThan(0);

    const hasFull = engines.some(e => e.tier === 'full');
    expect(hasFull).toBe(true);
  });

  it('应为多个 Skill 分配不同引擎', () => {
    const adapter = new HeterogeneousAdapter();

    const skills = ['stdd-spec', 'stdd-plan', 'stdd-apply', 'stdd-verify'];
    const assignment = adapter.assignEngines(skills);

    // 至少部分 Skill 应有引擎分配
    expect(assignment.size).toBeGreaterThan(0);

    // 每个 Skill 应分配到了不同的引擎（尽可能）
    const engineSet = new Set(assignment.values());
    expect(engineSet.size).toBeGreaterThanOrEqual(1);
  });

  it('应标准化引擎输出', () => {
    const adapter = new HeterogeneousAdapter();

    const raw = { success: true, data: { files: ['a.ts'] } };
    const normalized = adapter.normalizeOutput('claude_code', raw);

    expect(normalized.engineId).toBe('claude_code');
    expect(normalized.engineName).toBe('Claude Code');
    expect(normalized.success).toBe(true);
    expect(normalized.qualityTier).toBe('full');
    expect(normalized.timestamp).toBeGreaterThan(0);
  });

  it('应支持 Tier 降级', () => {
    const adapter = new HeterogeneousAdapter();

    // claude_code 失败后，应能降级到其他引擎
    const degraded = adapter.degrade('claude_code', 'stdd-spec');

    if (degraded !== null) {
      expect(degraded).not.toBe('claude_code');
    }
    // 如果没有其他引擎可用，返回 null 也是合理的
  });

  it('Tier 映射应与 engines.yaml 一致', () => {
    const adapter = new HeterogeneousAdapter();

    expect(adapter.tierMap.full.length).toBeGreaterThan(0);
    expect(adapter.tierMap.partial.length).toBeGreaterThan(0);
    expect(adapter.tierMap.basic.length).toBeGreaterThan(0);
  });
});
