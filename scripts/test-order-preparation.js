const assert = require('assert');
const { prepareOrderForSubmission, prepareExecutableRowOrder } = require('../src/execution/orderPreparation');

const instrument = {
  tickerOrIsin: 'IE00BD4TXW66',
  ibkrConid: '808613958',
  ibkrSymbol: 'UBSPX',
  ibkrLocalSymbol: 'BCFT',
  ibkrPrimaryExchange: 'IBIS',
  currency: 'EUR',
};

const prepared = prepareOrderForSubmission(
  { action: 'BUY', quantity: 8, limitPrice: 122.845 },
  instrument,
  { nowMs: Date.parse('2026-05-21T08:25:00Z') }
);
assert.strictEqual(prepared.conid, '808613958');
assert.strictEqual(prepared.symbol, 'UBSPX');
assert.strictEqual(prepared.localSymbol, 'BCFT');
assert.strictEqual(prepared.primaryExchange, 'IBIS');
assert.strictEqual(prepared.exchange, 'SMART');
assert.strictEqual(prepared.currency, 'EUR');
assert.strictEqual(prepared.tif, 'DAY');
assert.strictEqual(prepared.outsideRth, false);
assert.strictEqual(prepared.goodAfterTime, undefined);

const preparedBeforeOpen = prepareOrderForSubmission(
  { action: 'BUY', quantity: 8, limitPrice: 122.845 },
  instrument,
  { nowMs: Date.parse('2026-05-21T06:59:00Z') }
);
assert.strictEqual(preparedBeforeOpen.goodAfterTime, '20260521 09:00:00 MET');

const explicit = prepareOrderForSubmission({ symbol: 'ubspx', exchange: 'IBIS2', primaryExchange: 'IBIS', tif: 'GTC', outsideRth: true, goodAfterTime: 'custom' }, instrument);
assert.strictEqual(explicit.symbol, 'UBSPX');
assert.strictEqual(explicit.exchange, 'IBIS2');
assert.strictEqual(explicit.tif, 'GTC');
assert.strictEqual(explicit.outsideRth, true);
assert.strictEqual(explicit.goodAfterTime, 'custom');

const generic = prepareOrderForSubmission({ symbol: 'emuaa', action: 'BUY' }, { ibkrSymbol: 'EMUAA', currency: 'EUR' });
assert.strictEqual(generic.symbol, 'EMUAA');
assert.strictEqual(generic.exchange, 'SMART');
assert.strictEqual(generic.tif, 'DAY');
assert.strictEqual(generic.outsideRth, undefined);

const tradeRow = { action: 'buy', quantity: '8', limitPrice: '122.845', tickerOrIsin: 'IE00BD4TXW66' };
const rowSnapshot = JSON.stringify(tradeRow);
const preparedFromRow = prepareExecutableRowOrder(tradeRow, [instrument], { nowMs: Date.parse('2026-05-21T06:59:00Z') });
assert.strictEqual(preparedFromRow.instrument.ibkrSymbol, 'UBSPX');
assert.strictEqual(preparedFromRow.preparedOrder.symbol, 'UBSPX');
assert.strictEqual(preparedFromRow.preparedOrder.primaryExchange, 'IBIS');
assert.strictEqual(preparedFromRow.preparedOrder.goodAfterTime, '20260521 09:00:00 MET');
assert.strictEqual(JSON.stringify(tradeRow), rowSnapshot, 'prepareExecutableRowOrder should not mutate the source row');

console.log(JSON.stringify({ ok: true }, null, 2));
