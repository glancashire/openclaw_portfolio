const fs = require('fs');
const path = require('path');
const { evaluateExecutionPolicy } = require('../src/execution/portfolioExecution');

async function main() {
  const [portfolioDirArg, orderJsonArg] = process.argv.slice(2);
  if (!portfolioDirArg || !orderJsonArg) {
    console.error('Usage: node scripts/check-transmitted-live-readiness.js <portfolio-dir> <order-json>');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  let order;
  try {
    order = JSON.parse(orderJsonArg);
  } catch (error) {
    console.error(`Invalid order JSON: ${error.message}`);
    process.exit(1);
  }

  const policy = await evaluateExecutionPolicy({
    portfolioDir,
    order,
    live: true,
    transmitted: true,
    requireApproval: true,
  });

  const summary = {
    ok: policy.ok,
    live: true,
    transmitted: true,
    blockers: policy.blockers,
    readiness: policy.readiness,
    context: policy.context,
    warning: policy.ok
      ? 'Transmitted live execution policy gates passed. A real broker write is still high-risk and should only be used intentionally.'
      : 'Transmitted live execution is blocked until every blocker is resolved.',
  };

  const out = JSON.stringify(summary, null, 2);
  if (process.stdout.isTTY || process.env.OPENCLAW_FORCE_PRINT === '1') {
    console.log(out);
  } else {
    fs.writeFileSync(1, out + '\n');
  }
  if (!policy.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
