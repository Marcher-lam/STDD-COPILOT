/**
 * Runnable test-code scaffolds (frontend item 5).
 *
 * Renderers produce REAL skeletons - React Testing Library (with an a11y
 * hook), Playwright E2E specs, and Storybook stories - driven by the
 * change's BDD scenarios when available.
 */

function pascalCase(input) {
  return String(input || '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('') || 'Component';
}

function kebabCase(input) {
  return String(input || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'feature';
}

/** Escape a scenario line for single-quoted JS strings. */
function q(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * React Testing Library test skeleton.
 * @param {string} componentName  PascalCase component name
 * @param {string} featureSlug    kebab-case feature key
 * @param {Array<{name: string, given?: string, when?: string, then?: string}>} scenarios
 */
function renderRtlTest(componentName, featureSlug, scenarios = []) {
  const cases = scenarios.length > 0 ? scenarios : [{ name: 'renders the ' + componentName }];
  const its = cases.map(s =>
    "  it('" + q(s.name) + "', () => {\n" +
    (s.given ? '    // Given: ' + q(s.given) + '\n' : '') +
    (s.when ? '    // When: ' + q(s.when) + '\n' : '') +
    (s.then ? '    // Then: ' + q(s.then) + '\n' : '') +
    "    render(<" + componentName + " />);\n" +
    "    // TODO: assert the observable behavior from the scenario\n" +
    "    expect(screen.getByRole('region', { name: '" + q(featureSlug) + "' })).toBeInTheDocument();\n" +
    "  });"
  ).join('\n\n');

  return [
    "import { render, screen } from '@testing-library/react';",
    "import '" + componentName + "'; // TODO: fix the import path",
    "",
    "// Accessibility: run axe on the rendered output in CI",
    "//   e.g. import { axe } from 'jest-axe'; expect(await axe(container)).toHaveNoViolations();",
    "",
    "describe('" + componentName + "', () => {",
    its,
    "});",
    ""
  ].join('\n');
}

/**
 * Playwright E2E spec skeleton.
 */
function renderPlaywrightSpec(featureName, featureSlug, scenarios = []) {
  const cases = scenarios.length > 0 ? scenarios : [{ name: 'completes the ' + featureName + ' journey' }];
  const tests = cases.map(s =>
    "test('" + q(s.name) + "', async ({ page }) => {\n" +
    (s.given ? '  // Given: ' + q(s.given) + '\n' : '') +
    "  await page.goto('/'); // TODO: route for feature '" + q(featureSlug) + "'\n" +
    (s.when ? '  // When: ' + q(s.when) + '\n' : '') +
    "  // TODO: perform the action\n" +
    (s.then ? '  // Then: ' + q(s.then) + '\n' : '') +
    "  await expect(page).toHaveTitle(/./); // TODO: assert the observable outcome\n" +
    "});"
  ).join('\n\n');

  return [
    "import { test, expect } from '@playwright/test';",
    "",
    "test.describe('" + q(featureName) + "', () => {",
    tests,
    "});",
    ""
  ].join('\n');
}

/**
 * Storybook story skeleton.
 */
function renderStorybookStory(componentName) {
  return [
    "import type { Meta, StoryObj } from '@storybook/react';",
    "import " + componentName + " from './" + componentName + "'; // TODO: fix the import path",
    "",
    "const meta: Meta<typeof " + componentName + "> = {",
    "  title: '" + componentName + "',",
    "  component: " + componentName + ",",
    "};",
    "",
    "export default meta;",
    "",
    "export const Default: StoryObj<typeof " + componentName + "> = {};",
    "",
    "// Interactive playground: wire the props your component accepts.",
    "export const Interactive: StoryObj<typeof " + componentName + "> = {",
    "  args: {},",
    "};",
    ""
  ].join('\n');
}

module.exports = {
  renderRtlTest,
  renderPlaywrightSpec,
  renderStorybookStory,
  pascalCase,
  kebabCase,
};
