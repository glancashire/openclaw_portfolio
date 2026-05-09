'use strict';

const { notifyTradeFill } = require('../lib/tradeExecutionNotifier');

async function main() {
  const to = process.argv[2] || 'lancashire@swift.ch';

  // Mock trade fill
  const trade = {
    symbol: 'SLICHA',
    action: 'BUY',
    qty: 4,
    price: 222.50,
    fillPrice: 221.80,
    fillQty: 4,
    currency: 'CHF',
    costChf: 887.20,
    fees: 1.50,
    orderId: '1234567',
    time: '2026-05-08 09:02:14',
  };

  // Mock portfolio state after this trade
  const portfolio = {
    name: 'ETF Portfolio',
    totalValueChf: 5000.00,
    cashChf: 4112.80,
    holdings: [
      { symbol: 'SLICHA', name: 'UBS ETF SLI', valueChf: 887.20, allocPct: 17.7, targetPct: 20.0, driftPct: -2.3 },
    ],
  };

  // Mock open orders (the other 2 trades still pending)
  const openOrders = [
    { symbol: 'EMUAA', action: 'BUY', qty: 27, limitPrice: 40.30, currency: 'EUR', status: 'Submitted' },
    { symbol: 'CSPX', action: 'BUY', qty: 3, limitPrice: 795.00, currency: 'USD', status: 'Submitted' },
  ];

  console.log(`Sending test trade notification to ${to}...`);
  const result = await notifyTradeFill({ trade, portfolio, openOrders, to });
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(err.stack || String(err));
  process.exit(1);
});
