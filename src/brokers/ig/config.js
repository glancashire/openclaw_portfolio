const fs = require('fs');
const path = require('path');

const SECRET_PATH = path.join(__dirname, '..', '..', '..', 'secrets', 'ig.json');

function loadIgConfig() {
  let file = {};
  if (fs.existsSync(SECRET_PATH)) {
    file = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'));
  }
  const cfg = file.ig || {};
  return {
    identifier: process.env.IG_IDENTIFIER || cfg.identifier || '',
    password: process.env.IG_PASSWORD || cfg.password || '',
    apiKey: process.env.IG_API_KEY || cfg.apiKey || '',
    accountId: process.env.IG_ACCOUNT_ID || cfg.accountId || '',
    secretPath: SECRET_PATH,
  };
}

function validateIgConfig(config = loadIgConfig()) {
  const missing = [];
  if (!config.identifier) missing.push('identifier');
  if (!config.password) missing.push('password');
  if (!config.apiKey) missing.push('apiKey');
  return {
    ok: missing.length === 0,
    missing,
    hasAccountId: Boolean(config.accountId),
    secretPath: config.secretPath,
  };
}

module.exports = { loadIgConfig, validateIgConfig };
