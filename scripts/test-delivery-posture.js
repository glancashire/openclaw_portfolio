const assert = require('assert');
const path = require('path');
const { evaluateDeliveryPosture } = require('../src/reporting/deliveryDiagnostic');

(function main() {
  const portfolioDir = path.join(process.cwd(), 'portfolio', 'etf');
  const result = evaluateDeliveryPosture({ portfolioDir });

  assert(result && typeof result === 'object', 'Expected delivery posture result');
  assert(result.schemaVersion, 'Expected schemaVersion');
  assert(result.generatedAt, 'Expected generatedAt');
  assert(result.portfolio === 'etf', `Expected etf portfolio, got ${result.portfolio}`);
  assert(result.policy && typeof result.policy === 'object', 'Expected policy block');
  assert(result.status && typeof result.status === 'object', 'Expected status block');
  assert(result.deliveryPosture && typeof result.deliveryPosture === 'object', 'Expected deliveryPosture block');
  assert(typeof result.deliveryPosture.ready === 'boolean', 'Expected ready boolean');
  assert(typeof result.deliveryPosture.pendingActionCount === 'number', 'Expected pendingActionCount number');
  assert(Array.isArray(result.status.pendingActions), 'Expected pendingActions array');
  assert(result.deliveryPosture.pendingActionCount === result.status.pendingActions.length, 'Expected pending action count to match');
  assert(result.policy.deliveryMode === result.status.deliveryMode, 'Expected policy/status delivery mode alignment');
  assert(result.policy.failureAlertMode === result.status.failureAlertMode, 'Expected failure alert mode alignment');
  assert(typeof result.deliveryPosture.recommendedNextAction === 'string' && result.deliveryPosture.recommendedNextAction.length > 0, 'Expected recommended next action');

  console.log(JSON.stringify({
    ok: true,
    ready: result.deliveryPosture.ready,
    pendingActionCount: result.deliveryPosture.pendingActionCount,
    deliveryMode: result.policy.deliveryMode,
  }, null, 2));
})();
