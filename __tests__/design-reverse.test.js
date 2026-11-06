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

  it('refuses to report success when no sources exist (guides to presets)', () => {
    const projectPath = createProject('rev-none', { 'a.txt': 'x' });

    const result = runCli(['design', 'reverse'], projectPath);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toMatch(/design create/i);
    expect(fs.existsSync(path.join(projectPath, 'DESIGN.md'))).toBe(false);
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
