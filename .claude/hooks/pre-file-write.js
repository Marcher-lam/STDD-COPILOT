#!/usr/bin/env node

/**
 * STDD PreToolUse Hook - 文件写入前检查
 *
 * Constitution Articles Enforced:
 * - Article 2: TDD (Test-Driven Development)
 * - Article 4: Code Style
 * - Article 7: Security
 *
 * Usage: Called by Claude Code before Write/Edit operations
 * Exit 0: Allow operation
 * Exit 1: Block operation
 */

const fs = require('fs');
const path = require('path');

// 从 stdin 读取 hook 数据
let inputData = '';
process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const data = JSON.parse(inputData);
    const result = await runConstitutionChecks(data);

    // 输出结果 (用于 Claude Code 显示)
    if (result.message) {
      console.log(result.message);
    }

    // 非 0 退出码会阻止操作
    process.exit(result.block ? 1 : 0);
  } catch (error) {
    console.error('Hook error:', error.message);
    process.exit(0); // 错误不阻止操作
  }
});

/**
 * 执行 Constitution 检查
 */
async function runConstitutionChecks(data) {
  const { tool_input, tool_name } = data;

  // 只检查写入文件的操作
  if (!['Write', 'Edit'].includes(tool_name)) {
    return { block: false };
  }

  const filePath = tool_input.file_path || '';
  const content = tool_input.content || tool_input.new_string || '';

  // 检查是否禁用 hooks
  if (process.env.STDD_HOOKS_DISABLED === '1') {
    return { block: false, message: '⚠️ STDD Hooks 已禁用' };
  }

  const violations = [];

  // === Article 2: TDD 检查 ===
  const tddViolations = checkTDD(filePath, content);
  violations.push(...tddViolations);

  // === Article 4: Code Style 检查 ===
  const styleViolations = checkCodeStyle(content, filePath);
  violations.push(...styleViolations);

  // === Article 7: Security 检查 ===
  const securityViolations = checkSecurity(content, filePath);
  violations.push(...securityViolations);

  // 决定是否阻止
  const errors = violations.filter(v => v.level === 'error');
  const warnings = violations.filter(v => v.level === 'warning');

  return {
    block: errors.length > 0,
    violations,
    message: formatResultMessage(errors, warnings)
  };
}

/**
 * Article 2: TDD 检查
 */
function checkTDD(filePath, content) {
  const violations = [];

  // 跳过非实现文件
  if (!isImplementationFile(filePath)) {
    return violations;
  }

  // 检查是否有对应的测试文件
  const testFile = getCorrespondingTestFile(filePath);
  if (!fs.existsSync(testFile)) {
    // 检查是否是新建文件
    if (!fs.existsSync(filePath)) {
      violations.push({
        article: 2,
        level: 'warning', // 改为警告，允许创建文件
        message: `新文件建议先创建测试: ${path.basename(testFile)}`,
        suggestion: `考虑先运行: /stdd:red 创建失败的测试`
      });
    }
  }

  return violations;
}

/**
 * Article 4: Code Style 检查
 */
function checkCodeStyle(content, filePath) {
  const violations = [];

  // 检查文件长度
  const lines = content.split('\n');
  if (lines.length > 500) {
    violations.push({
      article: 4,
      level: 'warning',
      message: `文件过长: ${lines.length} 行`,
      suggestion: '考虑拆分为更小的模块 (建议 < 500 行)'
    });
  }

  // 检查 TODO/FIXME
  const todoMatches = content.match(/\/\/\s*(TODO|FIXME):/gi) || [];
  if (todoMatches.length > 5) {
    violations.push({
      article: 4,
      level: 'warning',
      message: `过多 TODO/FIXME: ${todoMatches.length} 个`,
      suggestion: '建议创建 issue 跟踪，而非在代码中堆积'
    });
  }

  // 检查 console.log
  const consoleMatches = content.match(/console\.(log|debug|info)\(/g) || [];
  if (consoleMatches.length > 3 && !filePath.includes('.test.')) {
    violations.push({
      article: 4,
      level: 'warning',
      message: `生产代码中存在 console.log: ${consoleMatches.length} 处`,
      suggestion: '建议使用统一的日志库'
    });
  }

  return violations;
}

/**
 * Article 7: Security 检查
 */
function checkSecurity(content, filePath) {
  const violations = [];

  // 检查硬编码的敏感信息
  const sensitivePatterns = [
    { pattern: /password\s*[:=]\s*['"][^'"]{4,}['"]/i, name: 'password', level: 'error' },
    { pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{10,}['"]/i, name: 'API key', level: 'error' },
    { pattern: /secret[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{10,}['"]/i, name: 'secret key', level: 'error' },
    { pattern: /private[_-]?key\s*[:=]\s*['"]-----BEGIN/i, name: 'private key', level: 'error' },
    { pattern: /token\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i, name: 'token', level: 'error' },
    { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/, name: 'JWT', level: 'warning' }
  ];

  // 跳过测试文件
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return violations;
  }

  for (const { pattern, name, level } of sensitivePatterns) {
    if (pattern.test(content)) {
      violations.push({
        article: 7,
        level,
        message: `检测到硬编码的${name}`,
        suggestion: '请使用环境变量: process.env.XXX'
      });
    }
  }

  // 检查 SQL 注入风险
  if (/`[^`]*\$\{[^}]+\}[^`]*`/.test(content) && /SELECT|INSERT|UPDATE|DELETE/i.test(content)) {
    violations.push({
      article: 7,
      level: 'warning',
      message: '可能存在 SQL 注入风险',
      suggestion: '请使用参数化查询，避免字符串拼接'
    });
  }

  // 检查 eval 使用
  if (/eval\s*\(/.test(content) && !content.includes('eval(') === false) {
    violations.push({
      article: 7,
      level: 'error',
      message: '检测到 eval() 使用',
      suggestion: 'eval() 存在安全风险，请使用替代方案'
    });
  }

  return violations;
}

/**
 * 辅助函数
 */
function isImplementationFile(filePath) {
  const srcPattern = /\/src\//;
  const testPattern = /\.(test|spec)\./;
  const configPattern = /\.(config|setup)\./;

  return srcPattern.test(filePath) &&
         !testPattern.test(filePath) &&
         !configPattern.test(filePath);
}

function getCorrespondingTestFile(filePath) {
  // src/services/UserService.ts -> src/__tests__/services/UserService.test.ts
  return filePath
    .replace('/src/', '/src/__tests__/')
    .replace(/\.ts$/, '.test.ts')
    .replace(/\.js$/, '.test.js');
}

function formatResultMessage(errors, warnings) {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  let message = '\n🛡️ [STDD Guard] Constitution 检查结果\n\n';

  if (errors.length > 0) {
    message += '🚫 阻断性问题:\n';
    errors.forEach(e => {
      message += `   Article ${e.article}: ${e.message}\n`;
      message += `   💡 ${e.suggestion}\n`;
    });
    message += '\n';
  }

  if (warnings.length > 0) {
    message += '⚠️ 警告:\n';
    warnings.forEach(w => {
      message += `   Article ${w.article}: ${w.message}\n`;
      if (w.suggestion) {
        message += `   💡 ${w.suggestion}\n`;
      }
    });
  }

  if (errors.length > 0) {
    message += '\n❌ 操作已阻止。修复问题后重试。\n';
    message += '提示: 设置 STDD_HOOKS_DISABLED=1 可临时禁用\n';
  }

  return message;
}
