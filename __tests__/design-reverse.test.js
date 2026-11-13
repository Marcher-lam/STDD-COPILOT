/**
 * Tests for DESIGN.md reverse-engineering (frontend item 3).
 *
 * `stdd design reverse` scans the project's REAL design sources — Tailwind
 * config, CSS custom properties, component-library dependencies — and
 * derives DESIGN.md from extracted tokens (with source annotations),
 * instead of generating from a generic preset.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const {
  extractTailwindTokens,
  extractCssVariables,
  detectComponentLibraries,
  reverseDesignMarkdown,
} = require('../src/utils/design-reverse');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

function createProject(name, files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-rev-'));
  roots.push(root);
  const projectPath = path.join(root, name);
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(projectPath, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
  }
  return projectPath;
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('token extractors (pure functions)', () => {
  it('extracts colors, fonts, and spacing from a tailwind config by text parsing', () => {
    const config = [
      'module.exports = {',
      '  theme: {',
      '    extend: {',
      '      colors: {',
      "        primary: { DEFAULT: '#0ea5e9', dark: '#0369a1' },",
      "        brand: '#7c3aed',",
      '      },',
      '      fontFamily: {',
      "        sans: ['Inter', 'system-ui', 'sans-serif'],",
      "        mono: ['JetBrains Mono', 'monospace'],",
      '      },',
      '      spacing: { section: "4rem", gutter: "1.5rem" },',
      '    },',
      '  },',
      '};',
    ].join('\n');

    const tokens = extractTailwindTokens(config);
    expect(tokens.colors).toEqual(
      expect.arrayContaining([
        { token: 'primary', value: '#0ea5e9' },
        { token: 'primary-dark', value: '#0369a1' },
        { token: 'brand', value: '#7c3aed' },
      ])
    );
    expect(tokens.fonts).toEqual(
      expect.arrayContaining([
        { token: 'sans', value: 'Inter' },
        { token: 'mono', value: 'JetBrains Mono' },
      ])
    );
    expect(tokens.spacing).toEqual(
      expect.arrayContaining([
        { token: 'section', value: '4rem' },
        { token: 'gutter', value: '1.5rem' },
      ])
    );
  });

  it('parses TypeScript config syntax (export default + typed theme)', () => {
    const ts = [
      'import type { Config } from "tailwindcss";',
      'const config: Config = {',
      '  theme: {',
      '    extend: {',
      '      colors: {',
      "        accent: '#7c3aed',",
      '      },',
      '    },',
      '  },',
      '};',
      'export default config;',
    ].join('\n');
    const tokens = extractTailwindTokens(ts);
    expect(tokens.colors).toEqual([{ token: 'accent', value: '#7c3aed' }]);
  });

  it('extracts CSS custom properties from :root blocks', () => {
    const css = [
      ':root {',
      '  --color-bg: #0b1020;',
      '  --color-accent: rgb(124 58 237);',
      '  --font-heading: "Space Grotesk", sans-serif;',
      '  --radius-card: 14px;',
      '  --unrelated: ignore-me;',
      '}',
    ].join('\n');

    const vars = extractCssVariables(css);
    expect(vars.colors).toEqual(
      expect.arrayContaining([
        { token: 'bg', value: '#0b1020' },
        { token: 'accent', value: 'rgb(124 58 237)' },
      ])
    );
    expect(vars.fonts).toEqual([{ token: 'heading', value: '"Space Grotesk", sans-serif' }]);
    expect(vars.radius).toEqual([{ token: 'card', value: '14px' }]);
  });

  it('extracts unprefixed custom properties and classifies by name', () => {
    const vars = extractCssVariables([
      ':root {',
      '  --bg: #f5f6fa;',
      '  --card: #ffffff;',
      '  --text: #1c2333;',
      '  --border: #d9dde8;',
      '  --radius-card: 10px;',
      '  --gap-lg: 16px;',
      '  --font-heading: system-ui;',
      '}',
    ].join('\n'));

    expect(vars.colors).toEqual(
      expect.arrayContaining([
        { token: 'bg', value: '#f5f6fa' },
        { token: 'card', value: '#ffffff' },
        { token: 'text', value: '#1c2333' },
        { token: 'border', value: '#d9dde8' },
      ])
    );
    expect(vars.radius).toEqual([{ token: 'card', value: '10px' }]);
    expect(vars.spacing).toEqual([{ token: 'gap-lg', value: '16px' }]);
    expect(vars.fonts).toEqual([{ token: 'heading', value: 'system-ui' }]);
  });

  it('maps semantic unprefixed names to suggested roles in the full markdown', () => {
    const projectPath = createProject('rev-roles', {
      'tailwind.config.js': "module.exports = { theme: { fontFamily: { sans: ['Inter', 'sans-serif'] }, spacing: { lg: '16px' } } };",
      'src/theme/base.css': [
        ':root {',
        '  --error: #b3261e;',
        '  --success: #1b873f;',
        '  --warn: #f9ab00;',
        '  --text-muted: #5f6368;',
        '  --muted: #e8eaed;',
        '  --border-weak: #dadce0;',
        '  --shadow-sm: 0 1px 2px rgba(0,0,0,.3);',
        '  --surface: #ffffff;',
        '  --radius-card: 10px;',
        '  --gap-lg: 16px;',
        '}',
      ].join('\n'),
    });

    const md = reverseDesignMarkdown(projectPath);

    // Nested src subdirectory is scanned and annotated.
    expect(md).toContain('- src/theme/base.css');
    // Role suggestions for semantic unprefixed names.
    expect(md).toContain('Errors and destructive actions');
    expect(md).toContain('Success states');
    expect(md).toContain('Warnings');
    expect(md).toContain('Body text');
    expect(md).toContain('Secondary text');
    expect(md).toContain('Borders and outlines');
    expect(md).toContain('Elevation and shadows');
    // Spacing & Radius section from both tailwind and CSS sources.
    expect(md).toContain('## Spacing & Radius');
    expect(md).toContain('`radius-card`');
    expect(md).toContain('`gap-lg`');
    expect(md).toContain('`lg` | `16px` | tailwind.config.js');
  });

  it('maps component-library dependencies to friendly names', () => {
    const pkg = JSON.stringify({ dependencies: { antd: '^5.0.0', '@chakra-ui/react': '^2.0.0' } });
    expect(detectComponentLibraries(pkg)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Ant Design', dependency: 'antd' }),
        expect.objectContaining({ name: 'Chakra UI', dependency: '@chakra-ui/react' }),
      ])
    );
  });
});

describe('reverseDesignMarkdown', () => {
  it('assembles a DESIGN.md from discovered sources with annotations', () => {
    const projectPath = createProject('rev-unit', {
      'tailwind.config.js': "module.exports = { theme: { extend: { colors: { brand: '#0ea5e9' } } } };",
      'src/styles.css': ':root { --color-accent: #7c3aed; --font-body: Inter; }',
      'package.json': JSON.stringify({ dependencies: { '@mui/material': '^5.0.0' } }),
    });

    const md = reverseDesignMarkdown(projectPath);
    expect(md).toContain('#0ea5e9');
    expect(md).toContain('#7c3aed');
    expect(md).toContain('Inter');
    expect(md).toContain('Material UI');
    expect(md).toContain('tailwind.config.js');   // source annotation
    expect(md).toContain('src/styles.css');       // source annotation
  });

  it('returns null when the project has no design sources', () => {
    const projectPath = createProject('rev-empty', { 'README.md': '# hi\n' });
    expect(reverseDesignMarkdown(projectPath)).toBeNull();
  });
});

describe('stdd design reverse (CLI)', () => {
  it('writes DESIGN.md from real project tokens', () => {
    const projectPath = createProject('rev-cli', {
      'tailwind.config.js': "module.exports = { theme: { extend: { colors: { primary: '#123456' } } } };",
    });

    const result = runCli(['design', 'reverse'], projectPath);

    expect(result.status).toBe(0);
    const design = fs.readFileSync(path.join(projectPath, 'DESIGN.md'), 'utf8');
    expect(design).toContain('#123456');
    expect(design).toMatch(/Source/i);
  });

  it('discovers tailwind.config.ts on disk', () => {
    const projectPath = createProject('rev-ts', {
      'tailwind.config.ts': 'export default { theme: { extend: { colors: { ink: "#101828" } } } };',
    });

    const result = runCli(['design', 'reverse'], projectPath);

    expect(result.status).toBe(0);
    expect(fs.readFileSync(path.join(projectPath, 'DESIGN.md'), 'utf8')).toContain('#101828');
  });

  it('refuses to report success when no sources exist (guides to presets)', () => {
    const projectPath = createProject('rev-none', { 'a.txt': 'x' });

    const result = runCli(['design', 'reverse'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toMatch(/design create/i);
    expect(fs.existsSync(path.join(projectPath, 'DESIGN.md'))).toBe(false);
  });

  // 终测 N-design: a plain hand-written public/style.css with unprefixed
  // custom properties must be recognized as a design source.
  it('reverse-engineers public/style.css with unprefixed CSS variables', () => {
    const projectPath = createProject('rev-public', {
      'package.json': JSON.stringify({ name: 'task-harbor', private: true }),
      'public/style.css': [
        ':root {',
        '  --bg: #f5f6fa;',
        '  --card: #ffffff;',
        '  --text: #1c2333;',
        '  --accent: #4f6df5;',
        '  --border: #d9dde8;',
        '  --radius-card: 10px;',
        '  --font-heading: system-ui, sans-serif;',
        '}',
      ].join('\n'),
    });

    const result = runCli(['design', 'reverse'], projectPath);

    expect(result.status).toBe(0);
    const design = fs.readFileSync(path.join(projectPath, 'DESIGN.md'), 'utf8');
    expect(design).toContain('- public/style.css');
    expect(design).toContain('`bg`');
    expect(design).toContain('#f5f6fa');
    expect(design).toContain('`card`');
    expect(design).toContain('Borders and outlines');
    expect(design).toContain('`radius-card`');
    expect(design).toContain('`heading`');
  });

  it('requires --force to overwrite an existing DESIGN.md', () => {
    const projectPath = createProject('rev-force', {
      'tailwind.config.js': "module.exports = { theme: { extend: { colors: { x: '#abcdef' } } } };",
      'DESIGN.md': '# existing\n',
    });

    const refused = runCli(['design', 'reverse'], projectPath);
    expect(refused.status).not.toBe(0);
    expect(fs.readFileSync(path.join(projectPath, 'DESIGN.md'), 'utf8')).toContain('existing');

    const forced = runCli(['design', 'reverse', '--force'], projectPath);
    expect(forced.status).toBe(0);
    expect(fs.readFileSync(path.join(projectPath, 'DESIGN.md'), 'utf8')).toContain('#abcdef');
  });
});
