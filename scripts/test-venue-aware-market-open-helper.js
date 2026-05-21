const assert = require('assert');
const { resolveVenueAwareMarketWindow } = require('../src/execution/venueAwareMarketWindow');

const resolved = resolveVenueAwareMarketWindow({
  diagnostics: [
    {
      preparedOrder: { primaryExchange: 'IBIS', symbol: 'UBSPX' },
      approvedInstrument: { ibkrPrimaryExchange: 'IBIS' },
    }
  ]
});
assert.strictEqual(resolved.exchange, 'IBIS');
assert.strictEqual(resolved.instrumentLabel, 'UBSPX');
assert.ok(typeof resolved.nextOpen === 'string' && resolved.nextOpen.includes('T'));

const fallback = resolveVenueAwareMarketWindow({ diagnostics: [] });
assert.strictEqual(fallback.exchange, 'EBS');
console.log(JSON.stringify({ ok: true }, null, 2));
