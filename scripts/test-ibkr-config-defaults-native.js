'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const target = path.resolve(process.cwd(), 'src/brokers/interactive-brokers/config.js');
const secretsPath = path.resolve(process.cwd(), 'secrets/interactive-brokers.json');
const backupPath = `${secretsPath}.bak-test`;

const originalEnvMode = process.env.IBKR_MODE;
const originalEnvRuntime = process.env.IBKR_RUNTIME;

try {
  if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
  if (fs.existsSync(secretsPath)) fs.renameSync(secretsPath, backupPath);
  delete process.env.IBKR_MODE;
  delete process.env.IBKR_RUNTIME;
  delete require.cache[target];
  const { loadInteractiveBrokersConfig } = require(target);
  const config = loadInteractiveBrokersConfig();
  assert.strictEqual(config.mode, 'native');
  assert.strictEqual(config.runtime, 'live');
  assert.strictEqual(config.port, 4001);
  console.log(JSON.stringify({ ok: true, mode: config.mode, runtime: config.runtime, port: config.port }, null, 2));
} finally {
  delete require.cache[target];
  if (fs.existsSync(backupPath)) fs.renameSync(backupPath, secretsPath);
  if (originalEnvMode == null) delete process.env.IBKR_MODE; else process.env.IBKR_MODE = originalEnvMode;
  if (originalEnvRuntime == null) delete process.env.IBKR_RUNTIME; else process.env.IBKR_RUNTIME = originalEnvRuntime;
}
