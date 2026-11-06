/**
 * Tests for runnable test-code scaffolds from outside-in (frontend item 5).
 *
 * `stdd outside-in scaffold <change> --code rtl|playwright|storybook|all`
 * additionally generates REAL test skeletons — React Testing Library tests
 * (with a11y/axe hooks), Playwright E2E specs, and Storybook stories —
 * driven by the change's BDD scenarios.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { OutsideInCommand } = require('../src/cli/commands/outside-in');
const { renderRtlTest, renderPlaywrightSpec, renderStorybookStory } = require('../src/utils/test-scaffolds');

const cliPath = path.join(__dirname, '..', 'cli.js');
const roots = [];

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('test-scaffolds renderers (pure)', () => {
  const scenarios = [
    { name: 'User toggles dark mode', given: 'a session', when: 'the toggle is clicked', then: 'dark mode persists' },
  ];

  it('renders a RTL test with scenario-derived cases and an a11y hook', () => {
    const code = renderRtlTest('DarkModeToggle', 'dark-mode-toggle', scenarios);
    expect(code).toContain("import { render, screen } from '@testing-library/react'");
    expect(code).toContain("describe('DarkModeToggle'");
    expect(code).toContain("it('User toggles dark mode'");
    expect(code).toContain('axe'); // accessibility hook
    expect(code).not.toContain('undefined');
  });

  it('renders a Playwright spec with the feature journey', () => {
    const code = renderPlaywrightSpec('dark mode', 'dark-mode-toggle', scenarios);
    expect(code).toContain("import { test, expect } from '@playwright/test'");
    expect(code).toContain("test('User toggles dark mode'");
  });

  it('renders a Storybook story with default/interactive states', () => {
    const code = renderStorybookStory('DarkModeToggle');
    expect(code).toContain("import type { Meta, StoryObj }");
    expect(code).toContain('export default');
    expect(code).toContain('Default');
  });
});

describe('outside-in scaffold --code (CLI)', () => {
  function createProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-oic-'));
    roots.push(root);
    const projectPath = path.join(root, name);
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001 Do\n', 'utf8');
    fs.writeFileSync(path.join(changeDir, 'specs', 'theme.feature'),
      'Feature: Dark mode\n  Scenario: User toggles dark mode\n    Given a session\n    When the toggle is clicked\n    Then dark mode persists\n', 'utf8');
    return { projectPath, changeDir };
  }

  it('generates runnable skeletons next to the markdown layers', () => {
    const { projectPath } = createProject('oic-cli');
    spawnSync(process.execPath, [cliPath, 'outside-in', 'init'], {
      cwd: projectPath, encoding: 'utf8', env: { ...process.env, CI: '1' },
    });

    const result = spawnSync(process.execPath, [cliPath, 'outside-in', 'scaffold', 'demo', '--code', 'all'], {
      cwd: projectPath,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    // Feature key defaults to the change name; scenario CONTENT comes from the .feature file.
    const rtlPath = path.join(projectPath, 'stdd', 'changes', 'demo', 'outside-in', 'rtl-demo.test.tsx');
    expect(fs.existsSync(rtlPath)).toBe(true);
    expect(fs.readFileSync(rtlPath, 'utf8')).toContain("User toggles dark mode");
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'demo', 'outside-in', 'e2e-demo.spec.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'demo', 'outside-in', 'Demo.stories.tsx'))).toBe(true);
  });

  it('works without BDD specs (falls back to the feature name)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-oic2-'));
    roots.push(root);
    const projectPath = path.join(root, 'p');
    const changeDir = path.join(projectPath, 'stdd', 'changes', 'demo');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001 Do\n', 'utf8');

    const cmd = new OutsideInCommand(projectPath);
    cmd.execute('init', undefined, { json: true });
    const files = cmd.scaffold('demo', { feature: 'billing-widget', code: 'rtl' });

    const rtlPath = path.join(changeDir, 'outside-in', 'rtl-billing-widget.test.tsx');
    expect(fs.existsSync(rtlPath)).toBe(true);
    expect(fs.readFileSync(rtlPath, 'utf8')).toContain('BillingWidget');
    void files;
  });
});
