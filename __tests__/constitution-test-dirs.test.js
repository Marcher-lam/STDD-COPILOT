/**
 * P1-2 regression (also finding F3 of the previous field report):
 * a project using the conventional top-level `test/` (or `tests/`,
 * `__tests__/`) directory layout must not be reported as
 * "Article 2 (TDD): Missing test file for src/<file>.js".
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

const tempDirs = [];

function makeProject(testDir) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-tdd-layout-'));
  tempDirs.push(root);
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'order-total.js'), 'module.exports = {};\n');
  fs.mkdirSync(path.join(root, testDir), { recursive: true });
  fs.writeFileSync(
    path.join(root, testDir, 'order-total.test.js'),
    'const { test } = require("node:test");\ntest("subtotal", () => {});\n'
  );
  return root;
}

afterAll(() => {
  for (const d of tempDirs) {
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
});

describe.each(['test', 'tests', '__tests__'])('top-level %s/ layout', (testDir) => {
  test('src file with a same-named test in top-level dir is covered', () => {
    const root = makeProject(testDir);
    const checker = new ConstitutionChecker(root);
    const testFile = checker.findTestFileForSource(
      path.join(root, 'src', 'order-total.js'),
      path.join(root, 'src')
    );
    expect(testFile).toBe(path.join(root, testDir, 'order-total.test.js'));
  });

  test('full Article 2 check reports no missing-test blocking issue', () => {
    const root = makeProject(testDir);
    const checker = new ConstitutionChecker(root);
    const issues = checker.run();
    const missing = issues.blocking.filter(
      b => b.article === 2 && /Missing test file/.test(b.message)
    );
    expect(missing).toEqual([]);
  });
});

test('source without any test anywhere still reports missing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-tdd-layout-'));
  tempDirs.push(root);
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'lonely.js'), 'module.exports = {};\n');

  const checker = new ConstitutionChecker(root);
  const testFile = checker.findTestFileForSource(
    path.join(root, 'src', 'lonely.js'),
    path.join(root, 'src')
  );
  expect(testFile).toBeNull();
});
