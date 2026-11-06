/**
 * Schema-driven validation executor (P1a).
 *
 * schema.yaml's `validation:` DSL was declarative theater — copied by init,
 * consumed by nothing. This executor makes the engine-checkable subset real
 * (required / min_length / min_items on change artifact sections). Rules
 * with no executable mapping here (red line, scenario shape) are enforced
 * by their own engines and stay documented in schema.yaml.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function schemaPathFor(cwd) {
  // Project-local override first (init copies it here), then the package.
  const local = path.join(cwd, 'stdd', 'schemas', 'spec-driven', 'schema.yaml');
  if (fs.existsSync(local)) return local;
  const { getPackageRoot } = require('./path-resolver');
  return path.join(getPackageRoot(), 'schemas', 'spec-driven', 'schema.yaml');
}

function loadRules(cwd) {
  try {
    const parsed = yaml.load(fs.readFileSync(schemaPathFor(cwd), 'utf8')) || {};
    return parsed.validation || {};
  } catch {
    return {};
  }
}

/** Extract a section's text from an artifact by fuzzy heading match. */
function extractSection(text, field) {
  // "Scope.In Scope" -> try the leaf heading ("In Scope") anywhere, then the
  // dotted form, then the bare field name.
  const leaf = String(field).split('.').pop();
  for (const candidate of [leaf, field, field.replace('.', ' ')]) {
    const normalized = candidate.toLowerCase().replace(/[._]/g, '[ ._]?');
    const re = new RegExp('^#{1,4}\\s*' + normalized + '\\s*\\n([\\s\\S]*?)(?=\\n#{1,4}\\s|\\n*$)', 'im');
    const m = String(text || '').match(re);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

function countListItems(text) {
  return String(text || '').split('\n').filter(l => /^\s*-\s+\S/.test(l)).length;
}

/**
 * Run the schema validation rules against a change's artifacts.
 * @param {string} cwd      project root
 * @param {string} changeName
 * @returns {Array<{rule: string, field: string, severity: 'blocking', message: string}>}
 */
function runSchemaRules(cwd, changeName) {
  const rules = loadRules(cwd);
  const findings = [];
  const changeDir = path.join(cwd, 'stdd', 'changes', changeName);
  if (!fs.existsSync(changeDir)) return findings;

  const artifacts = {}; // artifact id -> single-file content
  for (const file of ['proposal.md', 'tasks.md', 'design.md']) {
    const p = path.join(changeDir, file);
    artifacts[file.replace('.md', '')] = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  }

  for (const [artifactId, ruleList] of Object.entries(rules)) {
    if (!Array.isArray(ruleList)) continue;
    // Artifact ids like 'specs' map to directory globs (specs/**/*.md), not
    // a single file — the executor has no per-file mapping for them yet.
    if (!(artifactId in artifacts)) continue;
    const content = artifacts[artifactId];
    for (const rule of ruleList) {
      const field = rule.field;
      const section = content === null ? null : extractSection(content, field);
      const where = `${artifactId}.md#${field}`;
      if (rule.required) {
        if (content === null || section === null) {
          findings.push({ rule: 'required', field: where, severity: 'blocking',
            message: `Required section "${field}" missing in ${artifactId}.md (schema.yaml).` });
          continue;
        }
      }
      if (section === null || section === undefined) continue;
      if (Number.isFinite(rule.min_length) && section.length < rule.min_length) {
        findings.push({ rule: 'min_length', field: where, severity: 'blocking',
          message: `Section "${field}" is ${section.length} chars; schema requires >= ${rule.min_length}.` });
      }
      if (Number.isFinite(rule.min_items) && countListItems(section) < rule.min_items) {
        findings.push({ rule: 'min_items', field: where, severity: 'blocking',
          message: `Section "${field}" has ${countListItems(section)} item(s); schema requires >= ${rule.min_items}.` });
      }
    }
  }
  return findings;
}

module.exports = { runSchemaRules, loadRules, extractSection };
