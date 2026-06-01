const fs = require('fs');
const path = require('path');

const SECRET_PATH = path.join(__dirname, '..', '..', '..', 'secrets', 'interactive-brokers.json');
const { loadWorkspaceEnv, readWorkspaceEnv } = require('../../shared/env');

const IBKR_PORTAL_ORIGIN = 'https://localhost:5000';
const IBKR_API_BASE_PATH = '/v1/api';
const IBKR_PORTAL_API_BASE_PATH = '/portal.proxy/v1/api';
const LOOPBACK_HOSTS = Object.freeze(new Set(['localhost', '127.0.0.1', '::1']));

const IBKR_DEFAULTS = Object.freeze({
  mode: 'native',
  runtime: 'live',
  baseUrl: `${IBKR_PORTAL_ORIGIN}${IBKR_API_BASE_PATH}`,
  host: '127.0.0.1',
  clientId: 101,
  readonlyClientId: 150,
  readonly: true,
  nativePortByRuntime: Object.freeze({
    live: 4001,
    paper: 4002,
  }),
});

function loadInteractiveBrokersConfig() {
  loadWorkspaceEnv();
  const workspaceEnv = readWorkspaceEnv().values;
  let file = {};
  if (fs.existsSync(SECRET_PATH)) {
    file = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'));
  }
  const cfg = file.interactiveBrokers || file || {};
  const mode = firstNonEmpty(process.env.IBKR_MODE, workspaceEnv.IBKR_MODE, cfg.mode, IBKR_DEFAULTS.mode);
  const runtime = firstNonEmpty(process.env.IBKR_RUNTIME, workspaceEnv.IBKR_RUNTIME, cfg.runtime, IBKR_DEFAULTS.runtime);
  const defaultNativePort = getDefaultNativePort(runtime);
  return {
    mode,
    runtime,
    baseUrl: firstNonEmpty(process.env.IBKR_BASE_URL, workspaceEnv.IBKR_BASE_URL, cfg.baseUrl, getDefaultBaseUrl()),
    host: firstNonEmpty(process.env.IBKR_HOST, workspaceEnv.IBKR_HOST, cfg.host, IBKR_DEFAULTS.host),
    port: Number(firstNonEmpty(process.env.IBKR_PORT, workspaceEnv.IBKR_PORT, cfg.port, defaultNativePort)),
    clientId: Number(firstNonEmpty(process.env.IBKR_CLIENT_ID, workspaceEnv.IBKR_CLIENT_ID, cfg.clientId, IBKR_DEFAULTS.clientId)),
    readonlyClientId: Number(firstNonEmpty(process.env.IBKR_READONLY_CLIENT_ID, workspaceEnv.IBKR_READONLY_CLIENT_ID, cfg.readonlyClientId, IBKR_DEFAULTS.readonlyClientId)),
    readonly: parseReadonly(firstNonEmpty(process.env.IBKR_READONLY, workspaceEnv.IBKR_READONLY, cfg.readonly, IBKR_DEFAULTS.readonly)),
    username: firstNonEmpty(process.env.IBKR_USERNAME, workspaceEnv.IBKR_USERNAME, cfg.username, ''),
    password: firstNonEmpty(process.env.IBKR_PASSWORD, workspaceEnv.IBKR_PASSWORD, cfg.password, ''),
    accountId: firstNonEmpty(process.env.IBKR_ACCOUNT_ID, workspaceEnv.IBKR_ACCOUNT_ID, cfg.accountId, ''),
    secretPath: SECRET_PATH,
  };
}

function getDefaultNativePort(runtime = IBKR_DEFAULTS.runtime) {
  return IBKR_DEFAULTS.nativePortByRuntime[runtime] || IBKR_DEFAULTS.nativePortByRuntime.live;
}

function getDefaultBaseUrl(kind = 'api') {
  if (kind === 'portal') return `${IBKR_PORTAL_ORIGIN}${IBKR_PORTAL_API_BASE_PATH}`;
  return `${IBKR_PORTAL_ORIGIN}${IBKR_API_BASE_PATH}`;
}

function isLoopbackHostname(hostname) {
  if (!hostname) return false;
  const normalized = String(hostname).toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  return LOOPBACK_HOSTS.has(normalized);
}

function shouldUseInsecureLoopbackTls(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function parseReadonly(value) {
  return String(value) !== 'false';
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    return value;
  }
  return '';
}

function redactInteractiveBrokersConfig(config = loadInteractiveBrokersConfig()) {
  return {
    mode: config.mode,
    runtime: config.runtime,
    baseUrl: config.baseUrl,
    host: config.host,
    port: config.port,
    clientId: config.clientId,
    readonlyClientId: config.readonlyClientId,
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
    if (!Number.isFinite(config.readonlyClientId)) missing.push('readonlyClientId');
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

module.exports = {
  IBKR_API_BASE_PATH,
  IBKR_DEFAULTS,
  IBKR_PORTAL_API_BASE_PATH,
  IBKR_PORTAL_ORIGIN,
  getDefaultBaseUrl,
  getDefaultNativePort,
  isLoopbackHostname,
  loadInteractiveBrokersConfig,
  redactInteractiveBrokersConfig,
  shouldUseInsecureLoopbackTls,
  validateInteractiveBrokersConfig,
};
