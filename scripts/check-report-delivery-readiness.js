const path = require('path');
const { reportDeliveryStatus } = require('../src/reporting/deliveryPolicy');

function main() {
  const [portfolioDirArg] = process.argv.slice(2);
  if (!portfolioDirArg) {
    console.error('Usage: node scripts/check-report-delivery-readiness.js <portfolio-dir>');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  const status = reportDeliveryStatus({ portfolioDir });
  console.log(JSON.stringify(status, null, 2));
}

main();
