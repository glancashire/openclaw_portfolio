'use strict';

/*
 * loadEnvFile — tiny, dependency-free .env loader.
 *
 * Why this exists: unattended entry points (Sentry cron, etc.) read
 * process.env.* directly, but cron `agentTurn` payloads run `node scripts/...`
 * without `.env` exported into the environment. That made the weekly Sentry
 * autofix silently no-op (missing SENTRY_AUTH_TOKEN). This loader closes that
 * gap without adding a dependency (the repo has no dotenv).
 *
 * Behaviour:
 *   - Parses KEY=VALUE lines from <repoRoot>/.env by default.
 *   - Strips a single layer of matched single/double quotes around the value.
 *   - Ignores blank lines, `# comments`, and lines without `=`.
 *   - Supports an optional leading `export ` prefix.
 *   - NON-DESTRUCTIVE: never overwrites a key already present in process.env
 *     (real environment always wins over the file).
 *   - Silent no-op if the file is absent. Never throws.
 *
 * Returns the number of keys actually applied to process.env.
 */

const fs = require('fs');
const path = require('path');

function parseEnv(contents) {
  const out = {};
  if (typeof contents !== 'string') return out;
  for (const rawLine of contents.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice('export '.length).trim();
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.path] explicit .env path; defaults to <repoRoot>/.env
 * @param {object} [opts.env] target env object (defaults to process.env) — test seam
 * @param {boolean} [opts.override] if true, overwrite existing keys (default false)
 * @returns {number} count of keys applied
 */
function loadEnvFile(opts = {}) {
  // Documented opt-out so tests and special cases can run without the repo .env
  // bleeding into process.env (e.g. the bootstrap no-DSN path test).
  if (process.env.OPENCLAW_DISABLE_ENV_FILE === '1') return 0;
  const envPath = opts.path || path.join(__dirname, '..', '.env');
  const target = opts.env || process.env;
  const override = opts.override === true;
  let contents;
  try {
    contents = fs.readFileSync(envPath, 'utf8');
  } catch (_) {
    return 0; // missing/unreadable .env is a silent no-op
  }
  const parsed = parseEnv(contents);
  let applied = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (!override && Object.prototype.hasOwnProperty.call(target, key) && target[key] !== undefined) {
      continue;
    }
    target[key] = value;
    applied += 1;
  }
  return applied;
}

module.exports = loadEnvFile;
module.exports.loadEnvFile = loadEnvFile;
module.exports.parseEnv = parseEnv;
