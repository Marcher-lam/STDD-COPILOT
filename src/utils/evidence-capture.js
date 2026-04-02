const crypto = require('crypto');

/**
 * EvidenceCapture - 结构化错误证据采集器
 *
 * 当 DAG 节点执行失败时，截取完整上下文快照作为"证据"，
 * 供反向自愈引擎沿依赖链向上传播、辅助策划节点回炉重造。
 */
class EvidenceCapture {
  constructor() {
    this.chain = []; // 证据链：多跳传播时逐跳累积
  }

  /**
   * 截取一次失败的结构化证据
   * @param {string} nodeName   失败节点 ID
   * @param {Error}  error      原始错误对象
   * @param {object} context    执行上下文（inputs、partial outputs 等）
   * @returns {object} 结构化证据条目
   */
  capture(nodeName, error, context = {}) {
    const evidence = {
      id: this._fingerprint(nodeName, error, context),
      timestamp: Date.now(),
      nodeName,
      error: {
        type: error.constructor?.name || 'Error',
        message: error.message,
        stack: error.stack || null,
      },
      inputSnapshot: this._safeSnapshot(context.inputs || {}),
      partialOutput: this._safeSnapshot(context.partialOutput || null),
      // 决策辅助字段：该节点在 DAG 中的阶段信息
      phase: context.phase || null,
      retriesSoFar: context.retriesSoFar || 0,
    };

    this.chain.push(evidence);
    return evidence;
  }

  /**
   * 将已有证据链注入到回炉上下文中，供策划节点参考
   * @returns {object} 聚合后的证据报告
   */
  buildReport() {
    return {
      evidenceCount: this.chain.length,
      firstFailureAt: this.chain.length > 0 ? this.chain[0].nodeName : null,
      latestFailureAt: this.chain.length > 0 ? this.chain[this.chain.length - 1].nodeName : null,
      timeline: this.chain.map(e => ({
        node: e.nodeName,
        error: e.error.message,
        ts: e.timestamp,
      })),
      fullChain: this.chain,
      // 给策划节点的自然语言摘要
      instruction: this._synthesizeInstruction(),
    };
  }

  /**
   * 重置证据链（新一轮执行开始时调用）
   */
  reset() {
    this.chain = [];
  }

  /**
   * 证据去重指纹：相同节点+相同错误信息 = 同一证据
   */
  _fingerprint(nodeName, error, context) {
    const raw = JSON.stringify({
      node: nodeName,
      msg: error.message,
      phase: context.phase || '',
    });
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }

  /**
   * 安全快照：截断过大的值，防止证据膨胀
   */
  _safeSnapshot(obj) {
    if (!obj) return null;
    try {
      const str = JSON.stringify(obj);
      if (str.length > 4096) {
        return { __truncated: true, preview: str.slice(0, 2048), originalSize: str.length };
      }
      return JSON.parse(str); // deep clone
    } catch {
      return { __unserializable: true };
    }
  }

  /**
   * 从证据链生成面向策划节点的指令摘要
   */
  _synthesizeInstruction() {
    if (this.chain.length === 0) return 'No evidence captured.';
    const first = this.chain[0];
    const parts = [
      `Reverse self-healing triggered. Evidence chain length: ${this.chain.length}.`,
      `Origin failure at "${first.nodeName}": ${first.error.message}`,
    ];
    if (this.chain.length > 1) {
      const hops = this.chain.slice(1).map(e => `"${e.nodeName}": ${e.error.message}`);
      parts.push(`Propagation trail: ${hops.join(' → ')}`);
    }
    parts.push('Please revise the upstream strategy based on these failure patterns.');
    return parts.join(' ');
  }
}

module.exports = EvidenceCapture;
