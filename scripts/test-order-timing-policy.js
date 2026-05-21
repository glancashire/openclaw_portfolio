const assert = require('assert');
const { applyExecutionTimingPolicy } = require('../src/execution/orderTimingPolicy');

const passthrough = applyExecutionTimingPolicy({ symbol: 'EMUAA', quantity: 1 }, { ibkrSymbol: 'EMUAA', ibkrPrimaryExchange: 'SMART' });
assert.strictEqual(passthrough.symbol, 'EMUAA');
assert.strictEqual(passthrough.quantity, 1);
assert.strictEqual(passthrough.tif, 'DAY');
assert.strictEqual(passthrough.outsideRth, undefined);
assert.strictEqual(passthrough.goodAfterTime, undefined);

const ubspxBeforeOpen = applyExecutionTimingPolicy(
  { symbol: 'UBSPX', conid: '808613958' },
  { ibkrSymbol: 'UBSPX', ibkrPrimaryExchange: 'IBIS' },
  { nowMs: Date.parse('2026-05-21T06:59:00Z') }
);
assert.strictEqual(ubspxBeforeOpen.tif, 'DAY');
assert.strictEqual(ubspxBeforeOpen.outsideRth, false);
assert.strictEqual(ubspxBeforeOpen.goodAfterTime, '20260521 09:00:00 MET');

const ubspxAfterOpen = applyExecutionTimingPolicy(
  { symbol: 'UBSPX', conid: '808613958' },
  { ibkrSymbol: 'UBSPX', ibkrPrimaryExchange: 'IBIS' },
  { nowMs: Date.parse('2026-05-21T08:25:00Z') }
);
assert.strictEqual(ubspxAfterOpen.tif, 'DAY');
assert.strictEqual(ubspxAfterOpen.outsideRth, false);
assert.strictEqual(ubspxAfterOpen.goodAfterTime, undefined);

const explicit = applyExecutionTimingPolicy(
  { symbol: 'UBSPX', tif: 'GTC', outsideRth: true, goodAfterTime: 'custom time' },
  { ibkrSymbol: 'UBSPX', ibkrPrimaryExchange: 'IBIS' }
);
assert.strictEqual(explicit.tif, 'GTC');
assert.strictEqual(explicit.outsideRth, true);
assert.strictEqual(explicit.goodAfterTime, 'custom time');

console.log(JSON.stringify({ ok: true }, null, 2));
