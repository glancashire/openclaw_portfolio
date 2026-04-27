const { loadIgConfig, validateIgConfig } = require('../src/brokers/ig/config');
const cfg = loadIgConfig();
const status = validateIgConfig(cfg);
console.log(JSON.stringify({
  ok: status.ok,
  missing: status.missing,
  hasAccountId: status.hasAccountId,
  secretPath: status.secretPath,
}, null, 2));
