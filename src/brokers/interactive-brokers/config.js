const fs = require('fs');
const path = require('path');

const SECRET_PATH = path.join(__dirname, '..', '..', '..', 'secrets', 'interactive-brokers.json');

function loadInteractiveBrokersConfig() {
  let file = {};
  if (fs.existsSync(SECRET_PATH)) {
    file = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'));
  }
  const cfg = file.interactiveBrokers || file || {};
  const mode = process.env.IBKR_MODE || cfg.mode || 'client-portal';
  const runtime = process.env.IBKR_RUNTIME || cfg.runtime || 'live';
  const defaultNativePort = runtime === 'live' ? 4001 : 4002;
  return {
    mode,
    runtime,
    baseUrl: process.env.IBKR_BASE_URL || cfg.baseUrl || 'https://localhost:5000/v1/api',
    host: process.env.IBKR_HOST || cfg.host || '127.0.0.1',
    port: Number(process.env.IBKR_PORT || cfg.port || defaultNativePort),
    clientId: Number(process.env.IBKR_CLIENT_ID || cfg.clientId || 101),
    readonly: String(process.env.IBKR_READONLY || cfg.readonly || 'true') !== 'false',
    username: process.env.IBKR_USERNAME || cfg.username || '',
    password: process.env.IBKR_PASSWORD || cfg.password || '',
    accountId: process.env.IBKR_ACCOUNT_ID || cfg.accountId || '',
    secretPath: SECRET_PATH,
  };
}

function redactInteractiveBrokersConfig(config = loadInteractiveBrokersConfig()) {
  return {
    mode: config.mode,
    runtime: config.runtime,
    baseUrl: config.baseUrl,
    host: config.host,
    port: config.port,
    clientId: config.clientId,
    readonly: config.readonly,
    hasUsername: Boolean(config.username),
    hasPassword: Boolean(config.password),
    hasAccountId: Boolean(config.accountId),
    accountIdSuffix: config.accountId ? String(config.accountId).slice(-4) : '',
    secretPath: config.secretPath,
  };
}

function validateInteractiveBrokersConfig(config = loadInteractiveBrokersConfig()) {
  const missing = [];
  if (config.mode === 'native') {
    if (!config.host) missing.push('host');
    if (!Number.isFinite(config.port) || config.port <= 0) missing.push('port');
    if (!Number.isFinite(config.clientId)) missing.push('clientId');
  } else {
    if (!config.baseUrl) missing.push('baseUrl');
  }
  return {
    ok: missing.length === 0,
    missing,
    mode: config.mode,
    runtime: config.runtime,
    host: config.host,
    port: config.port,
    clientId: config.clientId,
    readonly: config.readonly,
    hasUsername: Boolean(config.username),
    hasPassword: Boolean(config.password),
    hasAccountId: Boolean(config.accountId),
    secretPath: config.secretPath,
  };
}

module.exports = { loadInteractiveBrokersConfig, redactInteractiveBrokersConfig, validateInteractiveBrokersConfig };
