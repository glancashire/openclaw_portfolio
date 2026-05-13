const assert = require('assert');
const { normalizeContractDetails } = require('../src/brokers/interactive-brokers/nativeClient');

const result = normalizeContractDetails({
  contract: {
    conId: 808613958,
    symbol: 'UBSPX',
    localSymbol: 'BCFT',
    primaryExch: 'IBIS',
    exchange: 'SMART',
    currency: 'EUR',
    secType: 'STK',
  },
  longName: 'UBS ETF S&P 500A',
  marketName: 'ETF',
});

assert.strictEqual(result.conid, 808613958);
assert.strictEqual(result.symbol, 'UBSPX');
assert.strictEqual(result.exchange, 'IBIS');
assert.strictEqual(result.currency, 'EUR');
assert.strictEqual(result.description, 'BCFT');
assert.strictEqual(result.name, 'UBS ETF S&P 500A');
console.log(JSON.stringify({ ok: true, result }, null, 2));
