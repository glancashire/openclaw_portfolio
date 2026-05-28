const assert = require('assert');
const { extractFxRatesToChf } = require('../src/brokers/interactive-brokers/holdingsSync');

const ledger = [
  { account: 'U1', tag: 'ExchangeRate', value: '1', currency: 'CHF' },
  { account: 'U1', tag: 'ExchangeRate', value: '0.9143087', currency: 'EUR' },
  { account: 'U1', tag: 'SettledCash', value: '100', currency: 'CHF' },
];

const rates = extractFxRatesToChf(ledger);
assert.strictEqual(rates.CHF, 1);
assert.strictEqual(rates.EUR, 0.9143087);

console.log(JSON.stringify({ ok: true, passed: 2 }));
