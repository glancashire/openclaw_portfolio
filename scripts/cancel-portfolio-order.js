const path = require('path');
const { cancelPortfolioOrder } = require('../src/execution/portfolioExecution');

function parseArgs(argv) {
  const positional = [];
  const flags = { brokerOnly: false };
  for (const arg of argv) {
    if (arg === '--broker-only' || arg === '--brokerOnly') {
      flags.brokerOnly = true;
    } else if (arg.startsWith('--')) {
      // Unknown flag: ignore (forward-compat).
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [portfolioDirArg, orderIdArg, selectorJsonArg = '{}'] = positional;
  if (!portfolioDirArg || !orderIdArg) {
    console.error('Usage: node scripts/cancel-portfolio-order.js [--broker-only] <portfolio-dir> <order-id> [selector-json]');
    console.error('');
    console.error('  --broker-only   Cancel an order that exists at IBKR but is NOT in local trades.md');
    console.error('                  (e.g. placed via a different clientId). Skips the local trades');
    console.error('                  reconcile and records a synthetic audit entry in');
    console.error('                  runtime/execution-state.json instead.');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  const selector = JSON.parse(selectorJsonArg);
  if (flags.brokerOnly) {
    selector.brokerOnly = true;
  }
  const result = await cancelPortfolioOrder({ portfolioDir, orderId: orderIdArg, selector, userApproved: true });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
