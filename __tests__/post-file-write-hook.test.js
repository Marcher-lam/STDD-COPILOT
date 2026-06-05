const { execSync } = require('child_process');
const path = require('path');
const {
  analyzeCode,
  isSourceFile,
  hasDocumentation,
  hasEmptyCatch,
  hasNPlusOnePattern,
  extractBraceBody,
  formatSuggestions,
} = require('../src/templates/hooks/post-file-write');

describe('post-file-write hook exported functions', () => {
  describe('isSourceFile', () => {
    it('recognizes .js files', () => {
      expect(isSourceFile('/src/app.js')).toBe(true);
    });

    it('recognizes .ts files', () => {
      expect(isSourceFile('/src/utils.ts')).toBe(true);
    });

    it('recognizes .py files', () => {
      expect(isSourceFile('/src/main.py')).toBe(true);
    });

    it('recognizes .go files', () => {
      expect(isSourceFile('/src/server.go')).toBe(true);
    });

    it('recognizes .java files', () => {
      expect(isSourceFile('/src/App.java')).toBe(true);
    });

    it('rejects non-source files', () => {
      expect(isSourceFile('/src/README.md')).toBe(false);
      expect(isSourceFile('/src/style.css')).toBe(false);
      expect(isSourceFile('/src/data.json')).toBe(false);
    });
  });

  describe('hasDocumentation', () => {
    it('detects JSDoc block comments', () => {
      expect(hasDocumentation('/** Adds two numbers */\nfunction add(a, b) { return a + b; }')).toBe(true);
    });

    it('detects substantive single-line comments', () => {
      expect(hasDocumentation('// This is a long enough comment line\nconst x = 1;')).toBe(true);
    });

    it('detects block comments', () => {
      expect(hasDocumentation('/* A block comment */\nconst x = 1;')).toBe(true);
    });

    it('returns false for code without comments', () => {
      expect(hasDocumentation('const x = 1;')).toBe(false);
    });

    it('ignores short single-line comments (less than 10 chars after //)', () => {
      expect(hasDocumentation('// short\nconst x = 1;')).toBe(false);
    });
  });

  describe('hasEmptyCatch', () => {
    it('detects empty catch blocks', () => {
      expect(hasEmptyCatch('try { x(); } catch(e) {}')).toBe(true);
    });

    it('detects empty catch blocks with whitespace', () => {
      expect(hasEmptyCatch('try { x(); } catch(err) {   }')).toBe(true);
    });

    it('does not flag non-empty catch blocks', () => {
      expect(hasEmptyCatch('try { x(); } catch(e) { console.error(e); }')).toBe(false);
    });
  });

  describe('hasNPlusOnePattern', () => {
    it('detects N+1 pattern inside for loops', () => {
      const code = 'for (let i = 0; i < items.length; i++) {\n  db.findById(items[i].id);\n}';
      expect(hasNPlusOnePattern(code)).toBe(true);
    });

    it('detects N+1 pattern inside while loops', () => {
      const code = 'while (hasNext()) {\n  results.push(query(row));\n}';
      expect(hasNPlusOnePattern(code)).toBe(true);
    });

    it('returns false when no loops contain DB calls', () => {
      expect(hasNPlusOnePattern('db.findMany();')).toBe(false);
    });

    it('returns false for loops without DB calls', () => {
      const code = 'for (let i = 0; i < 10; i++) {\n  console.log(i);\n}';
      expect(hasNPlusOnePattern(code)).toBe(false);
    });
  });

  describe('extractBraceBody', () => {
    it('extracts body from simple braces', () => {
      const content = '{ return 1; }';
      const body = extractBraceBody(content, 1);
      expect(body).toBe(' return 1; ');
    });

    it('handles nested braces', () => {
      const content = '{ if (true) { x(); } }';
      const body = extractBraceBody(content, 1);
      expect(body).toBe(' if (true) { x(); } ');
    });
  });

  describe('formatSuggestions', () => {
    it('formats suggestions with warning level', () => {
      const suggestions = [
        { article: 6, level: 'warning', message: 'Empty catch block detected', suggestion: 'Handle the error' },
      ];
      const result = formatSuggestions(suggestions);
      expect(result).toContain('Warning Article 6');
      expect(result).toContain('Empty catch block detected');
      expect(result).toContain('Handle the error');
    });

    it('formats suggestions with suggestion level', () => {
      const suggestions = [
        { article: 5, level: 'suggestion', message: 'Public API without documentation', suggestion: 'Add JSDoc' },
      ];
      const result = formatSuggestions(suggestions);
      expect(result).toContain('Suggestion Article 5');
      expect(result).toContain('Public API without documentation');
    });

    it('includes header line', () => {
      const result = formatSuggestions([]);
      expect(result).toContain('STDD Guard - Improvement Suggestions');
    });
  });

  describe('analyzeCode', () => {
    it('returns empty array for non-Write/Edit tools', async () => {
      const result = await analyzeCode({ tool_name: 'Read', tool_input: { file_path: '/tmp/test.js', content: 'x' } });
      expect(result).toEqual([]);
    });

    it('flags missing documentation on source files', async () => {
      const result = await analyzeCode({
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/test.js', content: 'function add(a, b) { return a + b; }' },
      });
      const doc = result.find(s => s.article === 5);
      expect(doc).toBeDefined();
      expect(doc.level).toBe('suggestion');
    });

    it('does not flag documentation when JSDoc is present', async () => {
      const result = await analyzeCode({
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/test.js', content: '/** Adds two numbers */\nfunction add(a, b) { return a + b; }' },
      });
      const doc = result.find(s => s.article === 5);
      expect(doc).toBeUndefined();
    });

    it('flags empty catch blocks', async () => {
      const result = await analyzeCode({
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/test.js', content: '/** doc */\ntry { x(); } catch(e) {}' },
      });
      const catchIssue = result.find(s => s.article === 6);
      expect(catchIssue).toBeDefined();
      expect(catchIssue.level).toBe('warning');
    });

    it('flags N+1 query pattern', async () => {
      const code = '/** doc */\nfor (let i = 0; i < ids.length; i++) {\n  db.findById(ids[i]);\n}';
      const result = await analyzeCode({
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/test.js', content: code },
      });
      const perf = result.find(s => s.article === 8);
      expect(perf).toBeDefined();
      expect(perf.level).toBe('warning');
    });

    it('uses new_string when content is absent (Edit tool)', async () => {
      const result = await analyzeCode({
        tool_name: 'Edit',
        tool_input: { file_path: '/tmp/test.js', new_string: 'try { x(); } catch(e) {}' },
      });
      const catchIssue = result.find(s => s.article === 6);
      expect(catchIssue).toBeDefined();
    });

    it('flags hardcoded secrets without echoing the secret value', async () => {
      const result = await analyzeCode({
        tool_name: 'Write',
        tool_input: {
          file_path: '/tmp/test.js',
          content: '/** doc */\nconst token = "abcdefghijklmnopqrstuvwxyz123456";',
        },
      });
      const securityIssue = result.find(s => s.article === 7);
      expect(securityIssue).toBeDefined();
      expect(securityIssue.message).toContain('Token');
      expect(securityIssue.message).toContain('line 2');
      expect(securityIssue.message).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
    });

    it('detects secrets in Edit new_string content', async () => {
      const result = await analyzeCode({
        tool_name: 'Edit',
        tool_input: { file_path: '/tmp/test.js', new_string: 'const password = "super-secret-password";' },
      });
      const securityIssue = result.find(s => s.article === 7);
      expect(securityIssue).toBeDefined();
      expect(securityIssue.message).toContain('Password');
    });

    it('returns empty for non-source files without issues', async () => {
      const result = await analyzeCode({
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/README.md', content: 'Hello world' },
      });
      // README.md is not a source file, so no doc check; no catch or N+1
      expect(result).toEqual([]);
    });
  });
});

describe('post-file-write stdin entry point (integration)', () => {
  const hookPath = path.resolve(__dirname, '..', 'src', 'templates', 'hooks', 'post-file-write.js');

  it('returns suggestions for code with issues via stdin', () => {
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/test.js', content: 'try { x(); } catch(e) {}' },
    });
    const result = execSync(`node "${hookPath}"`, { input, encoding: 'utf8' });
    const parsed = JSON.parse(result.trim());
    expect(parsed).toHaveProperty('suggestions');
    expect(parsed.suggestions.length).toBeGreaterThan(0);
    expect(parsed).toHaveProperty('message');
  });

  it('outputs nothing when there are no suggestions', () => {
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/README.md', content: 'Hello' },
    });
    const result = execSync(`echo '${input}' | node "${hookPath}"`, { encoding: 'utf8' });
    expect(result.trim()).toBe('');
  });

  it('exits 0 and outputs nothing when STDD_HOOKS_DISABLED is set', () => {
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/test.js', content: 'try { x(); } catch(e) {}' },
    });
    // STDD_HOOKS_DISABLED causes early process.exit(0) before any output
    const result = execSync(`echo '${input}' | STDD_HOOKS_DISABLED=1 node "${hookPath}" 2>&1; echo "exit:$?"`, { encoding: 'utf8' });
    expect(result.trim()).toBe('exit:0');
  });

  it('handles invalid JSON gracefully with error message and exit 0', () => {
    const result = execSync(`echo 'not-json' | node "${hookPath}" 2>&1; echo "exit:$?"`, { encoding: 'utf8' });
    expect(result).toContain('STDD Hook error');
    expect(result).toContain('exit:0');
  });

  it('returns suggestions for Edit tool via stdin', () => {
    const input = JSON.stringify({
      tool_name: 'Edit',
      tool_input: { file_path: '/tmp/test.js', new_string: 'try { x(); } catch(e) {}' },
    });
    const result = execSync(`node "${hookPath}"`, { input, encoding: 'utf8' });
    const parsed = JSON.parse(result.trim());
    expect(parsed.suggestions.length).toBeGreaterThan(0);
    const catchIssue = parsed.suggestions.find(s => s.article === 6);
    expect(catchIssue).toBeDefined();
  });

  it('reports hardcoded secrets via stdin without leaking values', () => {
    const secret = 'abcdefghijklmnopqrstuvwxyz123456';
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/test.js', content: `/** doc */\nconst token = "${secret}";` },
    });
    const result = execSync(`node "${hookPath}"`, { input, encoding: 'utf8' });
    const parsed = JSON.parse(result.trim());
    const securityIssue = parsed.suggestions.find(s => s.article === 7);
    expect(securityIssue).toBeDefined();
    expect(result).not.toContain(secret);
  });

  it('returns empty for non-Write/Edit tools via stdin', () => {
    const input = JSON.stringify({
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.js', content: 'anything' },
    });
    const result = execSync(`echo '${input}' | node "${hookPath}"`, { encoding: 'utf8' });
    // No suggestions for Read tool, so no output
    expect(result.trim()).toBe('');
  });
});
