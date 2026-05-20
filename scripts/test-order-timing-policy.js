const assert = require('assert');
const { applyExecutionTimingPolicy } = require('../src/execution/orderTimingPolicy');

const passthrough = applyExecutionTimingPolicy({ symbol: 'EMUAA', quantity: 1 }, { ibkrSymbol: 'EMUAA', ibkrPrimaryExchange: 'SMART' });
assert.strictEqual(passthrough.symbol, 'EMUAA');
assert.strictEqual(passthrough.quantity, 1);
assert.strictEqual(passthrough.tif, 'DAY');
assert.strictEqual(passthrough.outsideRth, undefined);
assert.strictEqual(passthrough.goodAfterTime, undefined);

const ubspx = applyExecutionTimingPolicy(
  { symbol: 'UBSPX', conid: '808613958' },
  { ibkrSymbol: 'UBSPX', ibkrPrimaryExchange: 'IBIS' }
);
assert.strictEqual(ubspx.tif, 'DAY');
assert.strictEqual(ubspx.outsideRth, false);
assert.strictEqual(ubspx.goodAfterTime, '20260521 09:00:00 MET');

const explicit = applyExecutionTimingPolicy(
  { symbol: 'UBSPX', tif: 'GTC', outsideRth: true, goodAfterTime: 'custom time' },
  { ibkrSymbol: 'UBSPX', ibkrPrimaryExchange: 'IBIS' }
);
assert.strictEqual(explicit.tif, 'GTC');
assert.strictEqual(explicit.outsideRth, true);
assert.strictEqual(explicit.goodAfterTime, 'custom time');

console.log(JSON.stringify({ ok: true }, null, 2));
