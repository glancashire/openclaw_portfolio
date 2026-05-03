const { aggregateExecutionFills } = require('../src/brokers/interactive-brokers/client');
const { normaliseOrder } = require('../src/brokers/interactive-brokers/types');

function main() {
  const fills = [
    { time: '2026-05-03T12:00:00Z', symbol: 'EMUAA', secType: 'STK', side: 'BOT', shares: 5, price: 38.4, orderId: 12345, execId: 'abc1' },
    { time: '2026-05-03T12:00:05Z', symbol: 'EMUAA', secType: 'STK', side: 'BOT', shares: 5, price: 38.5, orderId: 12345, execId: 'abc2' },
  ];
  const aggregated = aggregateExecutionFills(fills, 12345);
  const order = normaliseOrder(aggregated);
  console.log(JSON.stringify({ aggregated, order }, null, 2));
}

main();
