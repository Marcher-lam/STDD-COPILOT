#!/usr/bin/env node

/**
 * STDD PostToolUse Hook - 文件写入后分析
 *
 * Constitution Articles Analyzed:
 * - Article 5: Documentation
 * - Article 6: Error Handling
 * - Article 8: Performance
 *
 * Usage: Called by Claude Code after Write/Edit operations
 * Always exits 0 (does not block)
 */

const fs = require('fs');
const path = require('path');

let inputData = '';
process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const data = JSON.parse(inputData);
    const suggestions = await analyzeCodeQuality(data);

    if (suggestions.length > 0) {
      console.log(formatSuggestions(suggestions));
    }

    process.exit(0); // PostHook 通常不阻止操作
  } catch (error) {
    console.error('Hook error:', error.message);
    process.exit(0);
  }
});

/**
 * 分析代码质量
 */
async function analyzeCodeQuality(data) {
  const { tool_input, tool_name } = data;

  if (!['Write', 'Edit'].includes(tool_name)) {
    return [];
  }

  const filePath = tool_input.file_path || '';
  const content = tool_input.content || tool_input.new_string || '';

  // 检查是否禁用 hooks
  if (process.env.STDD_HOOKS_DISABLED === '1') {
    return [];
  }

  const suggestions = [];

  // === Article 5: Documentation ===
  const docSuggestions = checkDocumentation(filePath, content);
  suggestions.push(...docSuggestions);

  // === Article 6: Error Handling ===
  const errorSuggestions = checkErrorHandling(filePath, content);
  suggestions.push(...errorSuggestions);

  // === Article 8: Performance ===
  const perfSuggestions = checkPerformance(filePath, content);
  suggestions.push(...perfSuggestions);

  return suggestions;
}

/**
 * Article 5: Documentation 检查
 */
function checkDocumentation(filePath, content) {
  const suggestions = [];

  if (!isSourceFile(filePath)) {
    return suggestions;
  }

  // 检查是否是测试文件
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return suggestions;
  }

  // 检查公共函数是否有文档
  const publicFunctions = extractPublicFunctions(content);
  const documentedCount = publicFunctions.filter(fn =>
    hasJSDocBefore(content, fn.position)
  ).length;

  if (publicFunctions.length > 3 && documentedCount < publicFunctions.length / 2) {
    suggestions.push({
      article: 5,
      level: 'suggestion',
      message: `${publicFunctions.length - documentedCount} 个公共函数缺少 JSDoc 注释`,
      suggestion: '为公共 API 添加 JSDoc 可以改善代码可维护性'
    });
  }

  // 检查 README 是否存在
  if (isMainSourceFile(filePath)) {
    const readmePath = path.join(path.dirname(filePath), 'README.md');
    if (!fs.existsSync(readmePath)) {
      suggestions.push({
        article: 5,
        level: 'suggestion',
        message: '模块缺少 README.md',
        suggestion: '考虑添加 README 说明模块用途和使用方法'
      });
    }
  }

  return suggestions;
}

/**
 * Article 6: Error Handling 检查
 */
function checkErrorHandling(filePath, content) {
  const suggestions = [];

  // 检查空的 catch 块
  const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g;
  const emptyCatches = content.match(emptyCatchPattern);
  if (emptyCatches && emptyCatches.length > 0) {
    suggestions.push({
      article: 6,
      level: 'warning',
      message: `发现 ${emptyCatches.length} 个空的 catch 块`,
      suggestion: '请处理错误或添加注释说明为什么忽略 (// eslint-disable-next-line no-empty)'
    });
  }

  // 检查 async 函数没有 try-catch
  const asyncFunctions = content.match(/async\s+function|async\s+\w+\s*\(/g) || [];
  const tryCatchCount = (content.match(/try\s*\{/g) || []).length;

  if (asyncFunctions.length > 2 && tryCatchCount === 0) {
    suggestions.push({
      article: 6,
      level: 'suggestion',
      message: 'async 函数缺少错误处理',
      suggestion: '考虑添加 try-catch 或确保调用方处理错误'
    });
  }

  // 检查 Promise 没有 catch
  const thenCount = (content.match(/\.then\s*\(/g) || []).length;
  const catchCount = (content.match(/\.catch\s*\(/g) || []).length;

  if (thenCount > 0 && catchCount === 0) {
    suggestions.push({
      article: 6,
      level: 'warning',
      message: 'Promise 链缺少 .catch()',
      suggestion: '请添加 .catch() 处理潜在错误'
    });
  }

  return suggestions;
}

/**
 * Article 8: Performance 检查
 */
function checkPerformance(filePath, content) {
  const suggestions = [];

  // 检查可能的 N+1 查询
  const forOfPattern = /for\s*\(\s*(const|let|var)\s+\w+\s+of\s+/g;
  const awaitInLoop = content.match(/for[^}]*await/gs);

  if (awaitInLoop && awaitInLoop.length > 0) {
    suggestions.push({
      article: 8,
      level: 'warning',
      message: '可能存在异步循环中的 N+1 问题',
      suggestion: '考虑使用 Promise.all() 并行处理或批量查询'
    });
  }

  // 检查大量数据未分页
  if (content.includes('findMany') && !content.includes('skip') && !content.includes('take')) {
    suggestions.push({
      article: 8,
      level: 'suggestion',
      message: '数据库查询可能返回大量数据',
      suggestion: '考虑添加分页 (skip/take) 或限制返回数量'
    });
  }

  // 检查未使用 memo/cache 的昂贵计算
  const expensivePatterns = [
    /JSON\.parse\(.*JSON\.stringify/,
    /new\s+RegExp\(.*\)\s+in\s+loop/i
  ];

  for (const pattern of expensivePatterns) {
    if (pattern.test(content)) {
      suggestions.push({
        article: 8,
        level: 'suggestion',
        message: '检测到可能的性能问题',
        suggestion: '考虑使用缓存或优化算法'
      });
      break;
    }
  }

  return suggestions;
}

/**
 * 辅助函数
 */
function isSourceFile(filePath) {
  return /\.(ts|tsx|js|jsx|py|go|java)$/.test(filePath);
}

function isMainSourceFile(filePath) {
  return /(index|main|app)\.(ts|js|py|go)$/.test(filePath);
}

function extractPublicFunctions(content) {
  const functions = [];
  const pattern = /^(export\s+)?(async\s+)?function\s+(\w+)|^(export\s+)?const\s+(\w+)\s*=\s*(async\s+)?\(/gm;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    if (match[1] || match[4]) { // exported
      functions.push({
        name: match[3] || match[5],
        position: match.index
      });
    }
  }

  return functions;
}

function hasJSDocBefore(content, position) {
  const beforeContent = content.substring(Math.max(0, position - 500), position);
  return /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeContent);
}

function formatSuggestions(suggestions) {
  if (suggestions.length === 0) return '';

  let message = '\n💡 [STDD Guard] 代码质量建议\n\n';

  const grouped = {
    warning: suggestions.filter(s => s.level === 'warning'),
    suggestion: suggestions.filter(s => s.level === 'suggestion')
  };

  if (grouped.warning.length > 0) {
    message += '⚠️ 建议修复:\n';
    grouped.warning.forEach(s => {
      message += `   Article ${s.article}: ${s.message}\n`;
      message += `   💡 ${s.suggestion}\n\n`;
    });
  }

  if (grouped.suggestion.length > 0) {
    message += '💡 可选优化:\n';
    grouped.suggestion.forEach(s => {
      message += `   Article ${s.article}: ${s.message}\n`;
      message += `   💡 ${s.suggestion}\n\n`;
    });
  }

  return message;
}
