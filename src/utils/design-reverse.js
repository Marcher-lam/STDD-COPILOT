/**
 * DESIGN.md Reverse Engineering (frontend item 3)
 *
 * Derives a design system from the project's REAL sources - Tailwind config
 * theme tokens, CSS custom properties, and component-library dependencies -
 * with per-token source annotations, instead of generating from a preset.
 *
 * Parsing is strictly text-based: user config files are NEVER required or
 * executed (they may contain env lookups or side effects).
 */

const fs = require('fs');
const path = require('path');

const TAILWIND_CONFIGS = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts'];

const LIBRARY_MAP = {
  'antd': 'Ant Design',
  '@mui/material': 'Material UI',
  '@chakra-ui/react': 'Chakra UI',
  'vuetify': 'Vuetify',
  'element-plus': 'Element Plus',
  'naive-ui': 'Naive UI',
  '@heroui/react': 'HeroUI',
  'primereact': 'PrimeReact',
};

/** Extract the brace-balanced block following `key:` inside config text. */
function findBlock(text, key) {
  // Merge EVERY `key: { ... }` block — Tailwind configs routinely define
  // tokens in both theme.colors and theme.extend.colors.
  const blocks = [...String(text).matchAll(new RegExp('[,{\\s]' + key + '\\s*:\\s*\\{', 'g'))]
    .map(m => readBalancedBlock(text, m.index + m[0].length - 1))
    .filter(Boolean);
  return blocks.length ? blocks.join(',') : null;
}

function readBalancedBlock(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start + 1, i);
    }
  }
  return null;
}

/**
 * Text-parse a Tailwind config for colors / fonts / spacing tokens.
 * Supports one nesting level ({ primary: { DEFAULT, dark } }).
 */
function extractTailwindTokens(configText) {
  const out = { colors: [], fonts: [], spacing: [] };
  const text = String(configText || '');

  const colorBlock = findBlock(text, 'colors');
  if (colorBlock) {
    const nested = /(\w[\w-]*)\s*:\s*\{([^{}]*)\}/g;
    let m;
    while ((m = nested.exec(colorBlock))) {
      const parent = m[1];
      const body = m[2];
      for (const entry of body.matchAll(/(?:DEFAULT|(\w[\w-]*))\s*:\s*['"]?([^,'"\n}]+)['"]?/g)) {
        const value = firstColorValue(entry[2]);
        if (value) {
          out.colors.push({ token: entry[1] ? parent + '-' + entry[1] : parent, value });
        }
      }
    }
    // Strip the nested { ... } sub-blocks first so flat entries don't
    // double-capture keys that already belong to a nested color.
    const flatText = colorBlock.replace(/(\w[\w-]*)\s*:\s*\{[^{}]*\}/g, '');
    const flat = /(?:^|[,\s])(\w[\w-]*)\s*:\s*['"]?(#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\([^)]*\))['"]?/g;

    let f;
    while ((f = flat.exec(flatText))) {
      out.colors.push({ token: f[1], value: f[2] });
    }
  }

  const fontBlock = findBlock(text, 'fontFamily');
  if (fontBlock) {
    for (const m of fontBlock.matchAll(/(\w[\w-]*)\s*:\s*\[\s*['"]([^'"]+)['"]/g)) {
      out.fonts.push({ token: m[1], value: m[2] });
    }
  }

  const spacingBlock = findBlock(text, 'spacing');
  if (spacingBlock) {
    for (const m of spacingBlock.matchAll(/(\w[\w-]*)\s*:\s*['"]?([\d.]+(?:rem|em|px|vh|vw))['"]?/g)) {
      out.spacing.push({ token: m[1], value: m[2] });
    }
  }

  return out;
}

function firstColorValue(raw) {
  const m = String(raw).match(/^(?:['"])?(#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\([^)]*\))(?:['"])?/);
  return m ? m[1] : null;
}

/**
 * Extract design-relevant CSS custom properties from stylesheet text.
 *
 * Prefixed (`--color-bg`) and unprefixed (`--bg`) custom properties are both
 * captured (终测 N-design: hand-written stylesheets routinely use plain
 * names); classification keys off the full variable name and the display
 * token strips a leading semantic prefix so both forms show as `bg`.
 */
function extractCssVariables(cssText) {
  const out = { colors: [], fonts: [], spacing: [], radius: [] };
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  const seenVars = new Set();
  let m;
  while ((m = re.exec(String(cssText || '')))) {
    const rawName = m[1];
    if (seenVars.has(rawName)) continue; // dark-theme override; keep base
    seenVars.add(rawName);
    const value = m[2].trim();
    out[classifyVariable(rawName)].push({
      token: rawName.replace(/^(?:color|colour|font|spacing|radius)-/, ''),
      value,
    });
  }
  return out;
}

/** Bucket a custom-property name by what it names, not by any prefix. */
function classifyVariable(name) {
  if (/font|family|weight|leading|line-height/.test(name)) return 'fonts';
  if (/radius|round/.test(name)) return 'radius';
  if (/space|gap|padding|margin/.test(name)) return 'spacing';
  // Everything else (bg, card, text, accent, border, shadow, ...) lands in
  // the token table; values are shown verbatim and roles are suggested.
  return 'colors';
}

/** Map component-library dependencies to friendly names. */
function detectComponentLibraries(packageJsonText) {
  try {
    const pkg = JSON.parse(packageJsonText);
    const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    return Object.keys(deps)
      .filter(dep => LIBRARY_MAP[dep])
      .map(dep => ({ name: LIBRARY_MAP[dep], dependency: dep, version: deps[dep] }));
  } catch {
    return [];
  }
}

function suggestRole(token) {
  const t = String(token).toLowerCase();
  if (/primary|brand/.test(t)) return 'Primary brand actions';
  if (/background|bg|surface/.test(t)) return 'App background / surfaces';
  if (/accent|secondary/.test(t)) return 'Accent highlights';
  if (/error|danger|destructive/.test(t)) return 'Errors and destructive actions';
  if (/success/.test(t)) return 'Success states';
  if (/warn/.test(t)) return 'Warnings';
  if (/text|fg|foreground/.test(t)) return 'Body text';
  if (/muted|subtle/.test(t)) return 'Secondary text';
  if (/border/.test(t)) return 'Borders and outlines';
  if (/shadow/.test(t)) return 'Elevation and shadows';
  return 'Surface / as needed';
}

function collectCssFiles(cwd) {
  const out = [];
  // `public`/`static` are conventional locations for hand-written styles in
  // server-rendered apps (终测 N-design: public/style.css was never scanned).
  for (const dir of ['src', 'styles', 'app', 'public', 'static', '.']) {
    const base = path.join(cwd, dir);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (out.length >= 10) return out;
      if (entry.isFile() && /\.(css|scss)$/.test(entry.name)) {
        out.push(path.join(base, entry.name));
      } else if (entry.isDirectory() && dir !== '.' && entry.name !== 'node_modules') {
        const sub = path.join(base, entry.name);
        for (const e2 of fs.readdirSync(sub, { withFileTypes: true })) {
          if (e2.isFile() && /\.(css|scss)$/.test(e2.name)) out.push(path.join(sub, e2.name));
        }
      }
    }
  }
  return out;
}

/**
 * Assemble a reverse-engineered DESIGN.md for the project.
 * @returns {string|null} markdown, or null when no design sources exist.
 */
function reverseDesignMarkdown(cwd) {
  const sources = [];

  const tailwindPath = TAILWIND_CONFIGS
    .map(name => path.join(cwd, name))
    .find(p => fs.existsSync(p));
  const tailwindTokens = tailwindPath
    ? extractTailwindTokens(fs.readFileSync(tailwindPath, 'utf8'))
    : { colors: [], fonts: [], spacing: [] };
  if (tailwindPath) sources.push(path.relative(cwd, tailwindPath));

  const cssTokens = { colors: [], fonts: [], spacing: [], radius: [] };
  for (const file of collectCssFiles(cwd)) {
    const partial = extractCssVariables(fs.readFileSync(file, 'utf8'));
    for (const key of Object.keys(cssTokens)) cssTokens[key].push(...partial[key]);
    sources.push(path.relative(cwd, file));
  }

  const pkgPath = path.join(cwd, 'package.json');
  const libraries = fs.existsSync(pkgPath)
    ? detectComponentLibraries(fs.readFileSync(pkgPath, 'utf8'))
    : [];

  const hasAnything = tailwindTokens.colors.length || tailwindTokens.fonts.length || tailwindTokens.spacing.length
    || cssTokens.colors.length || cssTokens.fonts.length || cssTokens.spacing.length || cssTokens.radius.length
    || libraries.length;
  if (!hasAnything) return null;

  const tailwindName = tailwindPath ? path.basename(tailwindPath) : null;
  const colorRows = [
    ...tailwindTokens.colors.map(c => ({ ...c, source: tailwindName })),
    ...cssTokens.colors.map(c => ({ ...c, source: 'CSS variables' })),
  ];
  const fontRows = [
    ...tailwindTokens.fonts.map(f => ({ ...f, source: tailwindName })),
    ...cssTokens.fonts.map(f => ({ ...f, source: 'CSS variables' })),
  ];
  const spacingRows = [
    ...tailwindTokens.spacing.map(s => ({ ...s, source: tailwindName })),
    ...cssTokens.spacing.map(s => ({ ...s, source: 'CSS variables' })),
  ];

  const lines = [
    '# DESIGN.md (Reverse-Engineered)',
    '',
    '> Generated by `stdd design reverse` - tokens below were extracted from this',
    "> project's real sources. Prefer these over any generic preset.",
    '',
    '## Sources',
    '',
    ...sources.map(s => '- ' + s),
    ...libraries.map(l => '- Component library: ' + l.name + ' (' + l.dependency + '@' + l.version + ')'),
    '',
    '## Color Palette & Roles',
    '',
    '| Token | Value | Source | Suggested Role |',
    '|-------|-------|--------|----------------|',
  ];
  if (colorRows.length === 0) lines.push('| _none extracted_ | | | No theme tokens found |');
  for (const c of colorRows) {
    lines.push('| `' + c.token + '` | `' + c.value + '` | ' + c.source + ' | ' + suggestRole(c.token) + ' |');
  }

  lines.push('', '## Typography Rules', '', '| Slot | Font | Source | Notes |', '|------|------|--------|-------|');
  if (fontRows.length === 0) lines.push('| _none extracted_ | | | |');
  for (const f of fontRows) lines.push('| `' + f.token + '` | `' + f.value + '` | ' + f.source + ' | |');
  if (libraries.some(l => /Ant Design|Material UI|Chakra|Vuetify/.test(l.name))) {
    lines.push('', '> Note: a component library is present - inherit its type scale unless overridden above.');
  }

  if (spacingRows.length || cssTokens.radius.length) {
    lines.push('', '## Spacing & Radius', '', '| Token | Value | Source | Notes |', '|-------|-------|--------|-------|');
    for (const s of spacingRows) lines.push('| `' + s.token + '` | `' + s.value + '` | ' + s.source + ' | |');
    for (const r of cssTokens.radius) lines.push('| `radius-' + r.token + '` | `' + r.value + '` | CSS variables | |');
  }

  lines.push(
    '',
    '## Agent Prompt Guide',
    '',
    '- Use ONLY the tokens above for colors/fonts/spacing in generated UI.',
    '- When a token is missing, extend the SAME source (Tailwind theme block or CSS variable naming), never hardcode.',
    "- Respect the component library's components before writing custom ones.",
    ''
  );
  return lines.join('\n');
}

module.exports = {
  extractTailwindTokens,
  extractCssVariables,
  detectComponentLibraries,
  reverseDesignMarkdown,
};
