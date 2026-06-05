#!/usr/bin/env node

/**
 * PostToolUse Hook - Post-file write check
 *
 * Enforced Constitution Articles:
 * - Article 5: Documentation
 * - Article 6: Error Handling
 * - Article 7: Security
 * - Article 8: Performance
 */

const { detectSecrets, redactSensitiveInfo } = require('../../utils/security');

async function analyzeCode(data) {
  const { tool_input, tool_name } = data;

  if (!['Write', 'Edit'].includes(tool_name)) {
    return [];
  }

  const filePath = tool_input.file_path || '';
  const content = tool_input.content || tool_input.new_string || '';

  const suggestions = [];

  // Article 5: Documentation
  if (isSourceFile(filePath) && !hasDocumentation(content)) {
    suggestions.push({
      article: 5,
      level: 'suggestion',
      message: 'Public API without documentation',
      suggestion: 'Consider adding JSDoc/TSDoc comments'
    });
  }

  // Article 6: Error Handling
  if (hasEmptyCatch(content)) {
    suggestions.push({
      article: 6,
      level: 'warning',
      message: 'Empty catch block detected',
      suggestion: 'Handle the error or add a comment explaining why it is ignored'
    });
  }

  // Article 7: Security
  const secrets = detectSecrets(content);
  for (const secret of secrets) {
    suggestions.push({
      article: 7,
      level: 'warning',
      message: `Potential hardcoded ${secret.name} detected on line ${secret.line}`,
      suggestion: 'Move secrets to environment variables or a secure secrets manager'
    });
  }

  // Article 8: Performance
  if (hasNPlusOnePattern(content)) {
    suggestions.push({
      article: 8,
      level: 'warning',
      message: 'Possible N+1 query issue',
      suggestion: 'Consider using batch queries or JOINs'
    });
  }

  return suggestions;
}

function isSourceFile(filePath) {
  return /\.(ts|js|py|go|java)$/.test(filePath);
}

function hasDocumentation(content) {
  // JSDoc/TSDoc block comments: /** ... */
  if (/\/\*\*[\s\S]*?\*\//.test(content)) return true;

  // Single-line // comments with at least 10 chars after //
  if (/\/\/.{10,}/.test(content)) return true;

  // Block comments: /* ... */
  if (/\/\*[\s\S]*?\*\//.test(content)) return true;

  return false;
}

function hasEmptyCatch(content) {
  return /catch\s*\([^)]*\)\s*\{\s*\}/.test(content);
}

function hasNPlusOnePattern(content) {
  const dbMethods = /(findMany|findById|query|select|findOne|findAll)\(/;
  const loopPattern = /(?:for\s*\(|while\s*\()[^{]*\{/g;
  let match;
  while ((match = loopPattern.exec(content)) !== null) {
    const bodyStart = match.index + match[0].length;
    const body = extractBraceBody(content, bodyStart);
    if (body && dbMethods.test(body)) return true;
  }
  return false;
}

function extractBraceBody(content, openBracePos) {
  let depth = 1;
  let i = openBracePos;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  return content.substring(openBracePos, i - 1);
}

function formatSuggestions(suggestions) {
  let message = 'STDD Guard - Improvement Suggestions\n\n';

  suggestions.forEach(s => {
    const icon = s.level === 'warning' ? 'Warning' : 'Suggestion';
    message += `${icon} Article ${s.article}: ${s.message}\n`;
    message += `   ${s.suggestion}\n\n`;
  });

  return message;
}

module.exports = {
  analyzeCode,
  isSourceFile,
  hasDocumentation,
  hasEmptyCatch,
  hasNPlusOnePattern,
  extractBraceBody,
  formatSuggestions,
};

// ─── stdin entry point (only runs when executed directly) ───
if (require.main === module) {
  let inputData = '';
  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', async () => {
    try {
      if (process.env.STDD_HOOKS_DISABLED) {
        process.exit(0);
        return;
      }

      const data = JSON.parse(inputData);
      const suggestions = await analyzeCode(data);

      if (suggestions.length > 0) {
        console.log(JSON.stringify({
          message: formatSuggestions(suggestions),
          suggestions
        }));
      }

      process.exit(0);
    } catch (error) {
      console.error('STDD Hook error:', redactSensitiveInfo(error.message));
      process.exit(0);
    }
  });
}
