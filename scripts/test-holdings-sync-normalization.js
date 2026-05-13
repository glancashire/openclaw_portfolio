const assert = require('assert');
const { normaliseHolding } = require('../src/brokers/interactive-brokers/types');

const fxHelper = normaliseHolding({
  contract: { conId: 12087817, symbol: 'EUR.CHF', localSymbol: 'EUR.CHF', currency: 'CHF' },
  position: 0,
  avgCost: 0,
});
assert.strictEqual(fxHelper.quantity, 0);
assert.strictEqual(fxHelper.ticker, 'EUR.CHF');

const nativePosition = normaliseHolding({
  contract: { conId: 243939970, symbol: 'EMUAA', localSymbol: 'EMUAA', currency: 'EUR' },
  position: 49,
  avgCost: 39.8108,
});
assert.strictEqual(nativePosition.price, 39.8108, 'expected avgCost fallback price');
assert.strictEqual(Number(nativePosition.marketValue.toFixed(4)), Number((49 * 39.8108).toFixed(4)), 'expected avgCost-derived market value');

console.log(JSON.stringify({ ok: true }, null, 2));
