const assert = require('assert');
const { calculateSmartLimit } = require('../src/execution/marketOpenPolicy');

assert.strictEqual(calculateSmartLimit({ ask: 15.5865, bid: 15.58 }, 'BUY', { currency: 'EUR' }), 15.59, 'expected EUR quote to round up to cent tick');
assert.strictEqual(calculateSmartLimit({ ask: 158.84, bid: 158.8 }, 'BUY', { currency: 'CHF' }), 158.85, 'expected CHF quote to round up to 0.05 tick above 100');
assert.strictEqual(calculateSmartLimit({ bid: 15.5865, ask: 15.59 }, 'SELL', { currency: 'EUR' }), 15.58, 'expected sell quote to round down to cent tick');
console.log(JSON.stringify({ ok: true }, null, 2));
