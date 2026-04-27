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
  baseUrl: cfg.baseUrl,
}, null, 2));
