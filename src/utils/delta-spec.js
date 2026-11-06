/**
 * Delta Spec Engine
 *
 * OpenSpec-aligned delta parsing and header-based merge semantics.
 *
 * Deltas live in stdd/changes/<change>/specs/** and use sections:
 *   ## ADDED Requirements / ## MODIFIED Requirements /
 *   ## REMOVED Requirements / ## RENAMED Requirements
 * (legacy short forms `## ADDED` etc. are accepted too)
 *
 * Merge order follows the OpenSpec archive process:
 *   1. RENAMED  2. REMOVED  3. MODIFIED  4. ADDED
 * Requirement headers (`### Requirement: [Name]`) are the unique
 * identifiers; matching is case-sensitive after trimming.
 */

const SECTION_KEYWORDS = ['ADDED', 'MODIFIED', 'REMOVED', 'RENAMED', 'PURPOSE'];
const SECTION_RE = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED|PURPOSE)(\s+Requirements)?\s*$/i;
const REQ_HEADER_RE = /^###\s+Requirement:\s*(.*?)\s*$/;
const RENAMED_FROM_RE = /^-\s*FROM:\s*`?###\s*Requirement:\s*(.+?)\s*`?$/i;
const RENAMED_TO_RE = /^-\s*TO:\s*`?###\s*Requirement:\s*(.+?)\s*`?$/i;

/** OpenSpec normalization: trim only (case-sensitive compare). */
function normalizeHeader(name) {
  return String(name).trim();
}

/** Case/whitespace-insensitive fold used for near-miss detection. */
function foldHeader(name) {
  return normalizeHeader(name).replace(/\s+/g, ' ').toLowerCase();
}

/** Whitespace-insensitive body comparison for idempotency checks. */
function foldBody(body) {
  return String(body || '').replace(/\s+/g, ' ').trim();
}

function emptySection() {
  return { requirements: [], rawBody: '' };
}

/**
 * Parse delta content into structured sections.
 *
 * @param {string} content
 * @returns {{
 *   hasSections: boolean,
 *   purpose: string,
 *   sections: {
 *     added: {requirements: Array<{header: string, name: string, body: string}>, rawBody: string},
 *     modified: {requirements: Array, rawBody: string},
 *     removed: {requirements: Array, rawBody: string},
 *     renamed: {entries: Array<{from: string, to: string}>, rawBody: string},
 *   },
 * }}
 */
function parseDeltaSections(content) {
  const sections = {
    added: emptySection(),
    modified: emptySection(),
    removed: emptySection(),
    renamed: { entries: [], rawBody: '' },
  };
  const purposeLines = [];
  let hasSections = false;
  let current = null; // 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED' | 'PURPOSE' | null
  const buffers = { ADDED: [], MODIFIED: [], REMOVED: [], RENAMED: [], PURPOSE: [] };

  for (const line of String(content || '').split('\n')) {
    const match = line.match(SECTION_RE);
    if (match) {
      hasSections = true;
      current = match[1].toUpperCase();
      continue;
    }
    if (/^##\s+/.test(line)) {
      // Any other level-2 heading ends the current section.
      current = null;
      continue;
    }
    if (current) buffers[current].push(line);
  }

  for (const keyword of SECTION_KEYWORDS) {
    const body = buffers[keyword].join('\n').trim();
    if (keyword === 'PURPOSE') {
      purposeLines.push(body);
      continue;
    }
    if (keyword === 'RENAMED') {
      sections.renamed.rawBody = body;
      continue;
    }
    sections[keyword.toLowerCase()].rawBody = body;
  }

  for (const keyword of ['ADDED', 'MODIFIED', 'REMOVED']) {
    const target = sections[keyword.toLowerCase()];
    const lines = buffers[keyword];
    let currentReq = null;
    for (const line of lines) {
      const headerMatch = line.match(REQ_HEADER_RE);
      if (headerMatch) {
        if (currentReq) target.requirements.push(currentReq);
        currentReq = { header: line.trim(), name: normalizeHeader(headerMatch[1]), body: '' };
      } else if (currentReq) {
        currentReq.body += (currentReq.body ? '\n' : '') + line;
      }
    }
    if (currentReq) target.requirements.push(currentReq);
    for (const req of target.requirements) req.body = req.body.trim();
  }

  // RENAMED entries: pair FROM/TO bullets.
  const rawFrom = [];
  const rawTo = [];
  for (const line of buffers.RENAMED) {
    const from = line.match(RENAMED_FROM_RE);
    const to = line.match(RENAMED_TO_RE);
    if (from) rawFrom.push(normalizeHeader(from[1]));
    else if (to) rawTo.push(normalizeHeader(to[1]));
  }
  // Pair sequentially (FROM opens, TO closes); unmatched bullets are kept
  // as degenerate self-renames so they surface instead of silently dropping.
  let pendingFrom = null;
  const flush = () => {
    if (pendingFrom !== null) {
      sections.renamed.entries.push({ from: pendingFrom, to: pendingFrom });
      pendingFrom = null;
    }
  };
  for (const line of buffers.RENAMED) {
    const from = line.match(RENAMED_FROM_RE);
    const to = line.match(RENAMED_TO_RE);
    if (from) { flush(); pendingFrom = normalizeHeader(from[1]); }
    else if (to) {
      if (pendingFrom === null) pendingFrom = normalizeHeader(to[1]);
      sections.renamed.entries.push({ from: pendingFrom, to: normalizeHeader(to[1]) });
      pendingFrom = null;
    }
  }
  flush();

  return {
    hasSections,
    purpose: purposeLines.filter(Boolean).join('\n\n'),
    sections,
  };
}

/**
 * Parse a main spec into a preamble plus named requirement blocks.
 *
 * @param {string} content
 * @returns {{preamble: string, requirements: Array<{header: string, name: string, body: string}>}}
 */
function parseSpecRequirements(content) {
  const lines = String(content || '').split('\n');
  const preambleLines = [];
  const requirements = [];
  let current = null;

  for (const line of lines) {
    const headerMatch = line.match(REQ_HEADER_RE);
    if (headerMatch) {
      if (current) requirements.push(current);
      current = { header: line.trim(), name: normalizeHeader(headerMatch[1]), body: '' };
      continue;
    }
    if (current) {
      current.body += (current.body ? '\n' : '') + line;
    } else {
      preambleLines.push(line);
    }
  }
  if (current) requirements.push(current);

  const preamble = preambleLines.join('\n').trimEnd();
  for (const req of requirements) req.body = req.body.trim();
  return { preamble, requirements };
}

function composeSpec(parsed) {
  const parts = [];
  if (parsed.preamble.trim()) parts.push(parsed.preamble.trimEnd());
  for (const req of parsed.requirements) {
    // Keep a blank line between the requirement header and its body so that
    // re-composing an untouched spec reproduces the original formatting.
    parts.push(req.body ? `${req.header}\n\n${req.body}` : req.header);
  }
  const content = parts.join('\n\n');
  return content ? `${content}\n` : '';
}

/**
 * Apply a delta to a main spec using header-based matching.
 *
 * @param {string} mainContent - current spec content (non-empty)
 * @param {string} deltaContent - delta spec content
 * @returns {{
 *   content: string,
 *   conflicts: Array<{type: string, message: string}>,
 *   warnings: Array<{type: string, message: string}>,
 *   operations: string[],
 * }}
 */
function applyDelta(mainContent, deltaContent) {
  const conflicts = [];
  const warnings = [];
  const operations = [];
  const parsedDelta = parseDeltaSections(deltaContent);

  if (!parsedDelta.hasSections) {
    // Legacy plain content: append verbatim — but keep re-runs idempotent
    // (a conflict-aborted earlier archive may have written it already).
    const trimmed = String(deltaContent).trim();
    if (String(mainContent).includes(trimmed)) {
      warnings.push({
        type: 'already-synced',
        message: 'Legacy delta content already present in spec; skipping.',
      });
      return { content: String(mainContent), conflicts, warnings, operations: [] };
    }
    const content = `${String(mainContent).trimEnd()}\n\n${trimmed}\n`;
    return {
      content,
      conflicts,
      warnings,
      operations: ['appended legacy delta content'],
    };
  }

  // Upfront check: duplicate headers within one delta section.
  for (const keyword of ['added', 'modified', 'removed']) {
    const seen = new Set();
    for (const req of parsedDelta.sections[keyword].requirements) {
      if (seen.has(req.name)) {
        conflicts.push({
          type: 'duplicate-header',
          message: `Duplicate "### Requirement: ${req.name}" in ${keyword.toUpperCase()} section.`,
        });
      }
      seen.add(req.name);
    }
  }

  const spec = parseSpecRequirements(mainContent);
  const indexByName = new Map();
  const indexByFold = new Map();
  spec.requirements.forEach((req, index) => {
    if (!indexByName.has(req.name)) indexByName.set(req.name, index);
    if (!indexByFold.has(foldHeader(req.name))) indexByFold.set(foldHeader(req.name), index);
  });

  const renameMap = new Map(); // old name -> new name

  // 1. RENAMED
  for (const { from, to } of parsedDelta.sections.renamed.entries) {
    if (indexByName.has(from)) {
      if (indexByName.has(to) && to !== from) {
        conflicts.push({
          type: 'renamed-target-exists',
          message: `Cannot rename "${from}" to "${to}": a requirement named "${to}" already exists.`,
        });
        continue;
      }
      const index = indexByName.get(from);
      spec.requirements[index].name = to;
      spec.requirements[index].header = `### Requirement: ${to}`;
      indexByName.delete(from);
      indexByFold.delete(foldHeader(from));
      indexByName.set(to, index);
      indexByFold.set(foldHeader(to), index);
      renameMap.set(from, to);
      operations.push(`renamed "${from}" -> "${to}"`);
    } else if (indexByName.has(to)) {
      warnings.push({
        type: 'already-synced',
        message: `Rename "${from}" -> "${to}" already applied; target exists, source gone.`,
      });
    } else {
      conflicts.push({
        type: 'renamed-source-missing',
        message: `Cannot rename "${from}": no such requirement in current spec.`,
      });
    }
  }

  // Legacy headerless sections: without `### Requirement:` headers nothing
  // can be matched — never silently drop their raw content.
  for (const keyword of ['modified', 'removed']) {
    const sec = parsedDelta.sections[keyword];
    if (sec.requirements.length === 0 && sec.rawBody) {
      warnings.push({
        type: 'legacy-section-ignored',
        message: `${keyword.toUpperCase()} section has no "### Requirement:" headers; its raw content was not merged.`,
      });
    }
  }

  // 2. REMOVED
  for (const req of parsedDelta.sections.removed.requirements) {
    if (renameMap.has(req.name)) {
      conflicts.push({
        type: 'removed-renamed-conflict',
        message: `"${req.name}" is renamed in this same delta; remove the renamed target instead.`,
      });
      continue;
    }
    if (indexByName.has(req.name)) {
      const index = indexByName.get(req.name);
      spec.requirements.splice(index, 1);
      rebuildIndex(spec.requirements, indexByName, indexByFold);
      operations.push(`removed "${req.name}"`);
    } else if (indexByFold.has(foldHeader(req.name))) {
      conflicts.push({
        type: 'removed-case-mismatch',
        message: `REMOVED "${req.name}" differs only in case/whitespace from an existing requirement.`,
      });
    } else {
      warnings.push({
        type: 'already-removed',
        message: `REMOVED "${req.name}" not found in current spec; treating as already removed.`,
      });
    }
  }

  // 3. MODIFIED (resolve through renames applied in this delta)
  for (const req of parsedDelta.sections.modified.requirements) {
    const effectiveName = renameMap.get(req.name) || req.name;
    if (indexByName.has(effectiveName)) {
      const index = indexByName.get(effectiveName);
      spec.requirements[index].body = req.body;
      operations.push(`modified "${effectiveName}"`);
    } else if (indexByFold.has(foldHeader(effectiveName))) {
      conflicts.push({
        type: 'modified-case-mismatch',
        message: `MODIFIED "${effectiveName}" differs only in case/whitespace from an existing requirement.`,
      });
    } else {
      conflicts.push({
        type: 'modified-target-missing',
        message: `MODIFIED "${effectiveName}" not found in current spec.`,
      });
    }
  }

  // 4. ADDED
  for (const req of parsedDelta.sections.added.requirements) {
    if (indexByFold.has(foldHeader(req.name)) && !indexByName.has(req.name)) {
      conflicts.push({
        type: 'added-case-mismatch',
        message: `ADDED "${req.name}" differs only in case/whitespace from an existing requirement.`,
      });
      continue;
    }
    if (indexByName.has(req.name)) {
      const existing = spec.requirements[indexByName.get(req.name)];
      if (foldBody(existing.body) === foldBody(req.body)) {
        warnings.push({
          type: 'already-synced',
          message: `ADDED "${req.name}" already present with identical content; skipping.`,
        });
      } else {
        conflicts.push({
          type: 'added-conflict',
          message: `ADDED "${req.name}" already exists in current spec with different content.`,
        });
      }
      continue;
    }
    spec.requirements.push({ header: `### Requirement: ${req.name}`, name: req.name, body: req.body });
    indexByName.set(req.name, spec.requirements.length - 1);
    indexByFold.set(foldHeader(req.name), spec.requirements.length - 1);
    operations.push(`added "${req.name}"`);
  }

  // Legacy raw ADDED body (no requirement headers): keep STDD marker block.
  const legacyAdded = parsedDelta.sections.added;
  if (legacyAdded.requirements.length === 0 && legacyAdded.rawBody) {
    const markerBlock = `<!-- STDD:ADDED:start -->\n${legacyAdded.rawBody}\n<!-- STDD:ADDED:end -->`;
    // Idempotency: a conflict-aborted earlier run may have appended this
    // exact block already — re-appending would duplicate it in stdd/specs.
    if (String(mainContent).includes(markerBlock)) {
      warnings.push({
        type: 'already-synced',
        message: 'Legacy ADDED marker block already present in spec; skipping.',
      });
      if (conflicts.length > 0) {
        return { content: String(mainContent), conflicts, warnings, operations };
      }
      return { content: composeSpec(spec), conflicts, warnings, operations };
    }
    spec.preamble = spec.preamble
      ? spec.preamble
      : '';
    // Attach as a trailing block by appending to the last requirement body,
    // or to the preamble when no requirements exist.
    if (spec.requirements.length > 0) {
      const last = spec.requirements[spec.requirements.length - 1];
      last.body = `${last.body}\n\n${markerBlock}`;
    } else {
      spec.preamble = `${spec.preamble}\n\n${markerBlock}`.trim();
    }
    operations.push('appended legacy ADDED block');
  }

  if (conflicts.length > 0) {
    return { content: String(mainContent), conflicts, warnings, operations };
  }
  return { content: composeSpec(spec), conflicts, warnings, operations };
}

function rebuildIndex(requirements, indexByName, indexByFold) {
  indexByName.clear();
  indexByFold.clear();
  requirements.forEach((req, index) => {
    if (!indexByName.has(req.name)) indexByName.set(req.name, index);
    if (!indexByFold.has(foldHeader(req.name))) indexByFold.set(foldHeader(req.name), index);
  });
}

module.exports = {
  parseDeltaSections,
  parseSpecRequirements,
  applyDelta,
  normalizeHeader,
  foldHeader,
  foldBody,
};
