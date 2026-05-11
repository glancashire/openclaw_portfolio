const assert = require('assert');
const path = require('path');
const { evaluateDeliveryPosture } = require('../src/reporting/deliveryDiagnostic');

(function main() {
  const portfolioDir = path.join(process.cwd(), 'portfolio', 'etf');
  const result = evaluateDeliveryPosture({ portfolioDir });
  assert(result.deliveryPosture.ready === false, 'expected delivery posture not ready for current portfolio');
  assert(/backfill state/i.test(result.deliveryPosture.recommendedNextAction), `expected backfill-specific next action, got: ${result.deliveryPosture.recommendedNextAction}`);
  console.log(JSON.stringify({ ok: true, recommendedNextAction: result.deliveryPosture.recommendedNextAction }, null, 2));
})();
