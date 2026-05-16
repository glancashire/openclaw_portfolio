const assert = require('assert');
const path = require('path');
const { evaluateDeliveryPosture } = require('../src/reporting/deliveryDiagnostic');

(function main() {
  const portfolioDir = path.join(process.cwd(), 'portfolio', 'etf');
  const result = evaluateDeliveryPosture({ portfolioDir });
  if ((result.status.fillNotificationState?.reconciledUnnotifiedFills || []).length > 0) {
    assert(result.deliveryPosture.ready === false, 'expected delivery posture not ready while backfill review remains');
    assert(/backfill state/i.test(result.deliveryPosture.recommendedNextAction), `expected backfill-specific next action, got: ${result.deliveryPosture.recommendedNextAction}`);
  } else {
    assert(result.deliveryPosture.ready === true, 'expected delivery posture ready after backfill review was cleared');
    assert(/no delivery-side operator action/i.test(result.deliveryPosture.recommendedNextAction), `expected ready-state next action, got: ${result.deliveryPosture.recommendedNextAction}`);
  }
  console.log(JSON.stringify({ ok: true, recommendedNextAction: result.deliveryPosture.recommendedNextAction }, null, 2));
})();
