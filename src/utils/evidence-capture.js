const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const logger = createLogger('evidence-capture');

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
      phase: context.phase || null,
      retriesSoFar: context.retriesSoFar || 0,
    };

    this.chain.push(evidence);
    return evidence;
  }

  /**
   * 截取一次 verify/guard 验证结果的结构化证据
   * @param {string} type       'verify' | 'guard'
   * @param {object} results    { tasks, tests, lint, constitution, ... }
   * @param {object} metadata   { changeName, os, nodeVersion, etc. }
   * @returns {object} 结构化证据报告
   */
  captureVerify(type, results, metadata = {}) {
    return {
      type,
      id: crypto.createHash('sha256').update(JSON.stringify({ type, ts: Date.now(), results })).digest('hex').slice(0, 16),
      timestamp: new Date().toISOString(),
      unixTimestamp: Date.now(),
      results,
      metadata,
      status: this._determineStatus(results, type),
    };
  }

  /**
   * 将证据报告保存到文件系统
   * @param {object} report      证据报告对象
   * @param {string} targetDir   目标目录
   * @param {string} prefix      文件名前缀 (e.g. 'verify', 'guard')
   * @returns {string} 保存的文件路径
   */
  saveToFile(report, targetDir, prefix) {
    const evidenceDir = path.join(targetDir, 'evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    const timestamp = report.unixTimestamp || Date.now();
    const fileName = `${prefix}-${timestamp}.json`;
    const filePath = path.join(evidenceDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    return filePath;
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
      return JSON.parse(str);
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'EACCES') logger.warn(err.message);
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

  /**
   * 根据验证结果判断整体状态
   */
  _determineStatus(results, type) {
    if (!results) return 'unknown';
    if (type === 'validate') {
      // The validate report already carries a derived status; mirror it so
      // evidence, terminal output, and exit code tell the same story
      // (report finding P0-2: top-level used to fall through to 'unknown').
      return results.status === 'pass' ? 'pass' : 'fail';
    }
    if (type === 'verify') {
      const tasksOk = results.tasks && results.tasks.allDone;
      const testsOk = results.tests && (results.tests.passed === true || results.tests.passed === null);
      // An explicitly skipped constitution check (--no-constitution) is a
      // recorded skip, not a failure of the verification itself.
      const constOk = results.constitution
        && (results.constitution.status === 'pass' || results.constitution.status === 'skipped');
      const lintOk = results.lint === null || (results.lint && results.lint.passed !== false);
      // The TDD RED-evidence gate sets healthy=false in verify when tasks
      // reached GREEN without RED — evidence must agree with that exit
      // code (OCR finding: this gate was missing from the conjunction).
      const tddOk = !results.tdd
        || results.tdd.available !== true
        || (results.tdd.missingRed || []).length === 0;
      if (tasksOk && testsOk && constOk && lintOk && tddOk) return 'pass';
      return 'fail';
    }
    if (type === 'guard') {
      const values = typeof results === 'object' ? Object.values(results) : [];
      const overall = values.every(r => r && (r.status === 'pass' || r.status === 'skip' || r.status === 'warn'));
      return overall ? 'pass' : 'fail';
    }
    return 'unknown';
  }
}

module.exports = EvidenceCapture;
