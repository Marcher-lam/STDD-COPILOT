/**
 * Tests for `stdd ui generate` (frontend item 4).
 *
 * Generates component/page skeletons driven by DESIGN.md tokens: React by
 * default (tech-stack aware: vue / html), with a matching RTL test scaffold
 * and an aria landmark, plus a guidance header pointing at the design tokens.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { renderComponent } = require('../src/utils/ui-scaffolds');

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ui-'));
  roots.push(root);
  const projectPath = path.join(root, name);
  fs.mkdirSync(projectPath, { recursive: true });
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

describe('renderComponent (pure)', () => {
  it('renders a React component with an aria landmark and token guidance', () => {
    const code = renderComponent('ProfileCard', 'react', ['primary: #0ea5e9 (Primary brand actions)']);
    expect(code).toContain('export function ProfileCard');
    expect(code).toContain("role='region'");
    expect(code).toContain("aria-label='profile-card'");
    expect(code).toContain('#0ea5e9');
    expect(code).toMatch(/DESIGN\.md|token/i);
  });

  it('renders vue and html variants', () => {
    expect(renderComponent('ProfileCard', 'vue')).toMatch(/<template>|defineProps/);
    expect(renderComponent('ProfileCard', 'html')).toMatch(/<section/);
  });
});

describe('stdd ui generate (CLI)', () => {
  it('generates component + test into --out with DESIGN.md tokens', () => {
    const projectPath = createProject('ui-cli', {
      'DESIGN.md': '# DESIGN\n\n| `primary` | `#0ea5e9` | tailwind | Primary brand actions |\n',
    });

    const result = runCli(['ui', 'generate', 'ProfileCard', '--out', 'src/components'], projectPath);

    expect(result.status).toBe(0);
    const component = fs.readFileSync(path.join(projectPath, 'src', 'components', 'ProfileCard.tsx'), 'utf8');
    expect(component).toContain('export function ProfileCard');
    expect(component).toContain('#0ea5e9');
    const test = fs.readFileSync(path.join(projectPath, 'src', 'components', 'ProfileCard.test.tsx'), 'utf8');
    expect(test).toContain("@testing-library/react");
  });

  it('generates vue and html variants via CLI', () => {
    const vueProject = createProject('ui-vue');
    const vue = runCli(['ui', 'generate', 'NavBar', '--framework', 'vue'], vueProject);
    expect(vue.status).toBe(0);
    expect(fs.readFileSync(path.join(vueProject, 'src', 'components', 'NavBar.vue'), 'utf8')).toMatch(/<template>/);

    const htmlProject = createProject('ui-html');
    const html = runCli(['ui', 'generate', 'NavBar', '--framework', 'html'], htmlProject);
    expect(html.status).toBe(0);
    expect(fs.readFileSync(path.join(htmlProject, 'src', 'components', 'NavBar.html'), 'utf8')).toMatch(/<section/);
  });

  it('page action targets src/pages', () => {
    const projectPath = createProject('ui-page');
    const result = runCli(['ui', 'page', 'Settings'], projectPath);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'src', 'pages', 'Settings.tsx'))).toBe(true);
  });

  it('refuses to overwrite an existing component without --force', () => {
    const projectPath = createProject('ui-force', {
      'src/components/ProfileCard.tsx': 'export const existing = true;\n',
    });

    const refused = runCli(['ui', 'generate', 'ProfileCard'], projectPath);
    expect(refused.status).not.toBe(0);
    expect(fs.readFileSync(path.join(projectPath, 'src', 'components', 'ProfileCard.tsx'), 'utf8'))
      .toContain('existing');

    const forced = runCli(['ui', 'generate', 'ProfileCard', '--force'], projectPath);
    expect(forced.status).toBe(0);
    expect(fs.readFileSync(path.join(projectPath, 'src', 'components', 'ProfileCard.tsx'), 'utf8'))
      .toContain('export function ProfileCard');
  });

  it('works without DESIGN.md (semantic placeholder tokens + hint)', () => {
    const projectPath = createProject('ui-nodesign');

    const result = runCli(['ui', 'generate', 'SettingsPanel'], projectPath);

    expect(result.status).toBe(0);
    const component = fs.readFileSync(path.join(projectPath, 'src', 'components', 'SettingsPanel.tsx'), 'utf8');
    expect(component).toMatch(/var\(--|token/);
  });

  it('lists generate usage with no args', () => {
    const result = runCli(['ui'], createProject('ui-help'));
    const out = (result.stdout || '') + (result.stderr || '');
    expect(out).toMatch(/usage|generate/i);
  });
});
