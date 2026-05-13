const fs = require('fs');
const path = require('path');

const DEFAULT_ENV_PATH = path.join(__dirname, '..', '..', '.env');

function parseDotEnv(text) {
  const result = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadWorkspaceEnv(envPath = DEFAULT_ENV_PATH) {
  if (!fs.existsSync(envPath)) return { loaded: false, envPath, values: {} };
  const values = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
  return { loaded: true, envPath, values };
}

module.exports = { DEFAULT_ENV_PATH, parseDotEnv, loadWorkspaceEnv };
