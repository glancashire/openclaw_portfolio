const fs = require('fs');
const path = require('path');

const SECRET_PATH = path.join(__dirname, '..', '..', '..', 'secrets', 'interactive-brokers.json');

function loadInteractiveBrokersConfig() {
  let file = {};
  if (fs.existsSync(SECRET_PATH)) {
    file = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'));
  }
  const cfg = file.interactiveBrokers || file || {};
  return {
    baseUrl: process.env.IBKR_BASE_URL || cfg.baseUrl || 'https://localhost:5000/v1/api',
    username: process.env.IBKR_USERNAME || cfg.username || '',
    password: process.env.IBKR_PASSWORD || cfg.password || '',
    accountId: process.env.IBKR_ACCOUNT_ID || cfg.accountId || '',
    secretPath: SECRET_PATH,
  };
}

function validateInteractiveBrokersConfig(config = loadInteractiveBrokersConfig()) {
  const missing = [];
  if (!config.baseUrl) missing.push('baseUrl');
  return {
    ok: missing.length === 0,
    missing,
    hasUsername: Boolean(config.username),
    hasPassword: Boolean(config.password),
    hasAccountId: Boolean(config.accountId),
    secretPath: config.secretPath,
  };
}

module.exports = { loadInteractiveBrokersConfig, validateInteractiveBrokersConfig };
