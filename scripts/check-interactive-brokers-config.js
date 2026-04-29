const { loadInteractiveBrokersConfig, validateInteractiveBrokersConfig } = require('../src/brokers/interactive-brokers/config');
const cfg = loadInteractiveBrokersConfig();
const status = validateInteractiveBrokersConfig(cfg);
console.log(JSON.stringify({
  ok: status.ok,
  missing: status.missing,
  hasUsername: status.hasUsername,
  hasPassword: status.hasPassword,
  hasAccountId: status.hasAccountId,
  secretPath: status.secretPath,
  mode: cfg.mode,
  runtime: cfg.runtime,
  host: cfg.host,
  port: cfg.port,
  clientId: cfg.clientId,
  readonly: cfg.readonly,
  baseUrl: cfg.baseUrl,
}, null, 2));
