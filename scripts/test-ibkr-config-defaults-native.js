'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const workspace = process.cwd();
const envPath = path.join(workspace, '.env');
const envBackup = `${envPath}.bak-defaults-test`;
const ibkrSecrets = path.join(workspace, 'secrets', 'interactive-brokers.json');
const ibkrBackup = `${ibkrSecrets}.bak-defaults-test`;
const originalEnv = { ...process.env };
const modulePath = require.resolve('../src/brokers/interactive-brokers/config');

function moveIfExists(from, to) {
  if (fs.existsSync(to)) fs.unlinkSync(to);
  if (fs.existsSync(from)) fs.renameSync(from, to);
}

function reloadConfig() {
  delete require.cache[modulePath];
  return require('../src/brokers/interactive-brokers/config');
}

try {
  const initial = reloadConfig();
  assert.strictEqual(initial.IBKR_DEFAULTS.baseUrl, 'https://localhost:5000/v1/api');
  assert.strictEqual(initial.IBKR_DEFAULTS.host, '127.0.0.1');
  assert.strictEqual(initial.getDefaultNativePort('live'), 4001);
  assert.strictEqual(initial.getDefaultNativePort('paper'), 4002);
  assert.strictEqual(initial.getDefaultNativePort('weird'), 4001);

  for (const key of Object.keys(process.env)) {
    if (key.startsWith('IBKR_')) delete process.env[key];
  }
  moveIfExists(envPath, envBackup);
  moveIfExists(ibkrSecrets, ibkrBackup);

  const noSecret = reloadConfig().loadInteractiveBrokersConfig();
  assert.strictEqual(noSecret.mode, 'native');
  assert.strictEqual(noSecret.runtime, 'live');
  assert.strictEqual(noSecret.host, '127.0.0.1');
  assert.strictEqual(noSecret.port, 4001);
  assert.strictEqual(noSecret.clientId, 101);
  assert.strictEqual(noSecret.baseUrl, 'https://localhost:5000/v1/api');
  assert.strictEqual(noSecret.readonly, true);

  process.env.IBKR_MODE = 'native';
  process.env.IBKR_RUNTIME = 'paper';
  process.env.IBKR_BASE_URL = 'https://example.invalid/v1/api';
  process.env.IBKR_HOST = '127.0.0.1';
  process.env.IBKR_PORT = '4011';
  process.env.IBKR_CLIENT_ID = '777';
  process.env.IBKR_READONLY = 'true';
  const envConfig = reloadConfig().loadInteractiveBrokersConfig();
  assert.strictEqual(envConfig.runtime, 'paper');
  assert.strictEqual(envConfig.baseUrl, 'https://example.invalid/v1/api');
  assert.strictEqual(envConfig.host, '127.0.0.1');
  assert.strictEqual(envConfig.port, 4011);
  assert.strictEqual(envConfig.clientId, 777);
  assert.strictEqual(envConfig.readonly, true);

  console.log(JSON.stringify({ ok: true }, null, 2));
} finally {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  moveIfExists(envBackup, envPath);
  moveIfExists(ibkrBackup, ibkrSecrets);
}
