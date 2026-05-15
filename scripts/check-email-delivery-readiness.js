const path = require('path');
const { effectiveDeliveryPolicy, reportDeliveryStatus } = require('../src/reporting/deliveryPolicy');
const { emailDeliveryReadiness } = require('../src/reporting/emailDelivery');

function main() {
  const [portfolioDirArg] = process.argv.slice(2);
  if (!portfolioDirArg) {
    console.error('Usage: node scripts/check-email-delivery-readiness.js <portfolio-dir>');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const deliveryStatus = reportDeliveryStatus({ portfolioDir });
  const email = emailDeliveryReadiness(policy, deliveryStatus);

  console.log(JSON.stringify({
    portfolio: path.basename(portfolioDir),
    policy: {
      deliveryMode: policy.deliveryMode,
      externalDeliveryEnabled: policy.externalDeliveryEnabled,
      emailProvider: policy.emailProvider,
      emailRecipients: policy.emailRecipients,
      policyPath: policy.policyPath,
      overrideLoaded: policy.overrideLoaded,
    },
    deliveryStatus: {
      ready: deliveryStatus.ready,
      pendingActions: deliveryStatus.pendingActions,
    },
    email,
  }, null, 2));
}

main();
