const assert = require('assert');
const path = require('path');
const { evaluateEffectiveConfig } = require('../src/execution/effectiveConfig');

(async () => {
  const portfolioDir = path.join(process.cwd(), 'portfolio', 'etf');
  const result = await evaluateEffectiveConfig({ portfolioDir });

  assert(result && typeof result === 'object', 'Expected effective config result');
  assert(result.schemaVersion, 'Expected schemaVersion');
  assert(result.generatedAt, 'Expected generatedAt');
  assert(result.portfolio === 'etf', `Expected etf portfolio, got ${result.portfolio}`);
  assert(result.brokerConfigStatus && typeof result.brokerConfigStatus.ok === 'boolean', 'Expected brokerConfigStatus.ok');
  assert(result.brokerConfig && typeof result.brokerConfig === 'object', 'Expected redacted brokerConfig');
  assert(!Object.prototype.hasOwnProperty.call(result.brokerConfig, 'username'), 'Expected username to be redacted from brokerConfig');
  assert(!Object.prototype.hasOwnProperty.call(result.brokerConfig, 'password'), 'Expected password to be redacted from brokerConfig');
  assert(result.executionAuthority && result.executionAuthority.effectiveAuthority, 'Expected executionAuthority block');
  assert(result.effectiveConfig && typeof result.effectiveConfig === 'object', 'Expected effectiveConfig block');
  assert(typeof result.effectiveConfig.liveExecutionPossibleNow === 'boolean', 'Expected liveExecutionPossibleNow boolean');
  assert(typeof result.effectiveConfig.requiresExplicitOperatorAction === 'boolean', 'Expected requiresExplicitOperatorAction boolean');
  assert(result.effectiveConfig.executionMode === result.executionAuthority.executionMode, 'Expected execution mode to match authority');

  console.log(JSON.stringify({ ok: true, brokerMode: result.effectiveConfig.brokerMode, executionMode: result.effectiveConfig.executionMode }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
