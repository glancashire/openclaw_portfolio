const { normaliseOrder } = require('../src/brokers/interactive-brokers/types');

function main() {
  const completed = {
    orderId: 54321,
    permId: 777,
    symbol: 'CSSPX',
    secType: 'STK',
    action: 'BUY',
    orderType: 'LMT',
    quantity: 4,
    status: 'Cancelled',
    filled: 1,
    remaining: 3,
    limitPrice: 540,
    avgFillPrice: 539.8,
    lastFillPrice: 539.8,
    completedTime: '20260503 12:10:00',
    completedStatus: 'Cancelled',
    currency: 'USD',
  };
  console.log(JSON.stringify({ order: normaliseOrder(completed) }, null, 2));
}

main();
