/**
 * ${VAR:-default} interpolation for declarative config values
 * (engines.yaml style). Previously these placeholders were read literally,
 * making enabled/model fields dead configuration.
 */

const ENV_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g;

/**
 * Interpolate one string value. Unknown vars without a default resolve to
 * the empty string (shell semantics).
 */
function interpolateString(value) {
  return String(value).replace(ENV_PATTERN, (match, name, fallback) => {
    const env = process.env[name];
    if (env !== undefined && env !== '') return env;
    return fallback !== undefined ? fallback : '';
  });
}

/**
 * Deep-interpolate every string value in an object (arrays included).
 */
function interpolateObject(obj) {
  if (typeof obj === 'string') return interpolateString(obj);
  if (Array.isArray(obj)) return obj.map(interpolateObject);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = interpolateObject(v);
    return out;
  }
  return obj;
}

module.exports = { interpolateString, interpolateObject, ENV_PATTERN };
