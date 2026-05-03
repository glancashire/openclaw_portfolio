const path = require('path');
const { evaluateExecutionPolicy } = require('../src/execution/portfolioExecution');

async function main() {
  const portfolioDir = path.resolve(process.argv[2] || 'portfolio/etf');

  const unapproved = await evaluateExecutionPolicy({
    portfolioDir,
    live: false,
    order: {
      symbol: 'NOTREAL',
      action: 'BUY',
      quantity: 1,
    },
  });

  const liveWithoutApproval = await evaluateExecutionPolicy({
    portfolioDir,
    live: true,
    order: {
      symbol: 'EMUAA',
      conid: '243939970',
      action: 'BUY',
      quantity: 1,
      orderType: 'LMT',
      limitPrice: 38.5,
      currency: 'EUR',
      exchange: 'SMART',
      secType: 'STK',
    },
  });

  console.log(JSON.stringify({ unapproved, liveWithoutApproval }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
