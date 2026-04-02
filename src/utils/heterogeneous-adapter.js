const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { getPackageRoot } = require('./path-resolver');

/**
 * HeterogeneousAdapter - 异构引擎适配层
 *
 * 底层逻辑：将 22 个 AI 引擎（4 Tier 分层）统一抽象为
 * 可调度的算力单元，支持：
 * 1. Tier 分层能力映射（full/partial/basic）
 * 2. 跨引擎 Skill 兼容性检查
 * 3. 结果标准化输出
 * 4. 引擎健康检测与 Tier 降级链
 */
class HeterogeneousAdapter {
  /**
   * @param {string} configPath engines.yaml 路径（可选）
   */
  constructor(configPath) {
    this.engines = this._loadEngines(configPath);
    this.tierMap = this._buildTierMap();
    this.degradationChain = [
      'full',   // Tier 1: 全量 Skill
      'partial', // Tier 2: 核心 Skill
      'basic',   // Tier 3: Constitution + Guard
    ];
  }

  /**
   * 查找能执行指定 Skill 的所有引擎
   * @param {string} skillName Skill ID（如 stdd-spec）
   * @returns {Array<{ engine: string, tier: string, meta: object }>}
   */
  findCapableEngines(skillName) {
    const results = [];
    for (const [engineId, engine] of Object.entries(this.engines)) {
      if (!this._isEnabled(engine)) continue;
      const compat = engine.skills_compatibility;
      if (compat === 'full') {
        results.push({ engine: engineId, tier: 'full', meta: engine });
      } else if (compat === 'partial') {
        const supported = engine.adaptation?.supported_skills || [];
        if (supported.includes(skillName)) {
          results.push({ engine: engineId, tier: 'partial', meta: engine });
        }
      } else if (compat === 'basic') {
        // basic 只支持 constitution 和 guard
        const injectOnly = engine.adaptation?.inject_only || [];
        if (injectOnly.some(s => skillName.includes(s))) {
          results.push({ engine: engineId, tier: 'basic', meta: engine });
        }
      }
    }
    return results;
  }

  /**
   * 为一组 Skill 分配最佳引擎
   * @param {string[]} skillNames 需要并行执行的 Skill 列表
   * @returns {Map<string, string>} skillName → engineId 映射
   */
  assignEngines(skillNames) {
    const assignment = new Map();
    const usedEngines = new Set();

    for (const skill of skillNames) {
      const capable = this.findCapableEngines(skill);

      // 优先选最高 Tier、且未分配的引擎
      let chosen = null;
      for (const tier of this.degradationChain) {
        const candidates = capable.filter(c => c.tier === tier && !usedEngines.has(c.engine));
        if (candidates.length > 0) {
          chosen = candidates[0];
          break;
        }
      }

      // 所有引擎都用完了？复用已分配的（同 Tier 优先）
      if (!chosen && capable.length > 0) {
        chosen = capable[0];
      }

      if (chosen) {
        assignment.set(skill, chosen.engine);
        usedEngines.add(chosen.engine);
      }
    }

    return assignment;
  }

  /**
   * 标准化引擎输出为统一格式
   * @param {string} engineId
   * @param {object} rawOutput 引擎原始输出
   * @returns {object} 标准化输出
   */
  normalizeOutput(engineId, rawOutput) {
    const engine = this.engines[engineId];
    return {
      engineId,
      engineName: engine?.name || engineId,
      engineType: engine?.type || 'unknown',
      success: rawOutput.success !== false,
      data: rawOutput.data || rawOutput,
      timestamp: Date.now(),
      // 标记来源 Tier，用于后续质量评估
      qualityTier: this._getCompatTier(engine),
    };
  }

  /**
   * Tier 降级：当指定引擎失败时，寻找同级或低级替代
   * @param {string} failedEngine 失败的引擎 ID
   * @param {string} skillName    需要执行的 Skill
   * @returns {string|null}  降级后的引擎 ID，null 表示无可用引擎
   */
  degrade(failedEngine, skillName) {
    const failedEngineDef = this.engines[failedEngine];
    const failedTier = this._getCompatTier(failedEngineDef);
    const failedTierIdx = this.degradationChain.indexOf(failedTier);

    const capable = this.findCapableEngines(skillName);

    // 从同级（其他引擎）开始，逐级向下寻找
    for (let t = failedTierIdx; t < this.degradationChain.length; t++) {
      const candidates = capable.filter(c =>
        c.tier === this.degradationChain[t] && c.engine !== failedEngine
      );
      if (candidates.length > 0) return candidates[0].engine;
    }

    return null; // 无降级方案
  }

  /**
   * 获取所有已启用引擎的统计信息
   */
  getStats() {
    const stats = { total: 0, enabled: 0, byTier: { full: 0, partial: 0, basic: 0 }, engines: [] };
    for (const [id, engine] of Object.entries(this.engines)) {
      stats.total++;
      const enabled = this._isEnabled(engine);
      if (enabled) {
        stats.enabled++;
        const tier = this._getCompatTier(engine);
        stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;
        stats.engines.push({ id, name: engine.name, tier, type: engine.type });
      }
    }
    return stats;
  }

  // ─── 内部方法 ───

  _loadEngines(configPath) {
    try {
      const fullPath = configPath
        || path.join(getPackageRoot(), 'stdd', 'config', 'engines.yaml');
      const content = fs.readFileSync(fullPath, 'utf8');
      const parsed = yaml.load(content);
      // 过滤掉 custom 空占位和注释字段
      const engines = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (val && typeof val === 'object' && val.name) {
          engines[key] = val;
        }
      }
      return engines;
    } catch {
      return {};
    }
  }

  _buildTierMap() {
    const map = { full: [], partial: [], basic: [] };
    for (const [id, engine] of Object.entries(this.engines)) {
      const tier = this._getCompatTier(engine);
      if (map[tier]) map[tier].push(id);
    }
    return map;
  }

  _isEnabled(engine) {
    const val = engine.enabled;
    if (typeof val === 'string') {
      // 环境变量格式 "${VAR:-default}"
      const match = val.match(/\$\{(\w+):-(\w+)\}/);
      if (match) {
        return process.env[match[1]] !== 'false' && match[2] !== 'false';
      }
      return val === 'true';
    }
    return val !== false;
  }

  _getCompatTier(engine) {
    if (!engine) return 'basic';
    return engine.skills_compatibility || 'basic';
  }
}

module.exports = HeterogeneousAdapter;
