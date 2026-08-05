'use strict';

// Regression: a service quote that reports ok:true but a non-positive price
// (e.g. an empty Yahoo close series from a wrong external symbol) must NOT be
// accepted as a trusted quote. Before this guard, price 0 resolved to
// valueChf=0 with quoteTrusted=true, injecting a phantom -100% loss into the
// P&L surface (observed 2026-08-03/04 for UKGBPB.SW and EMUAA.SW).

const assert = require('assert');
const { resolveHoldingQuotes } = require('../src/reporting/quoteResolution');
const { QuoteServiceClient } = require('../src/quotes');

function transportReturning(quote) {
  return {
    kind: 'test_fixed_quote',
    async getQuote() { return quote; },
    async getQuotes() { return []; },
    async getProviderHealth() { return []; },
  };
}

const holdingRows = [{
  tickerOrIsin: '136319312', symbol: 'UKGBPB', name: 'UKGBPB',
  quantity: 180, lastPrice: 41.11, currency: 'GBP', fxToChf: 1.15, valueChf: 8525.21,
}];
const approvedInstruments = [{
  tickerOrIsin: 'LU0950670850', ibkrSymbol: 'UKGBPB', ibkrConid: '136319312',
  ibkrPrimaryExchange: 'EBS', currency: 'GBP',
}];

(async function main() {
  // Case 1: zero price -> reject, fall back to snapshot, not trusted.
  for (const badPrice of [0, -1, null, undefined]) {
    const client = new QuoteServiceClient({ transport: transportReturning({
      ok: true, price: badPrice, close: badPrice,
      providerPath: 'yahoo_last_close', providerLabel: 'Yahoo', quality: 'last_close', attempts: [],
    }) });
    const { rows } = await resolveHoldingQuotes({
      holdingRows, approvedInstruments, portfolio: 'etf',
      brokerReadiness: { fallbackRequired: true, reason: 'native_error' },
      quoteClient: client,
    });
    const row = rows[0];
    assert.strictEqual(row.resolvedValueChf, 8525.21, `bad price ${badPrice} should keep snapshot value`);
    assert.strictEqual(row.quoteSource, 'holdings_snapshot', `bad price ${badPrice} should not adopt service source`);
    assert.strictEqual(row.quoteTrusted, false, `bad price ${badPrice} must not be trusted`);
    assert.notStrictEqual(row.unrealizedProfitPct, -100, `bad price ${badPrice} must not produce -100% row`);
  }

  // Case 2: a valid positive price is still accepted and trusted.
  const goodClient = new QuoteServiceClient({ transport: transportReturning({
    ok: true, price: 42.5, close: 42.5,
    providerPath: 'yahoo_last_close', providerLabel: 'Yahoo', quality: 'last_close',
    asOf: '2026-08-04T07:00:00.000Z', attempts: [],
  }) });
  const { rows: goodRows } = await resolveHoldingQuotes({
    holdingRows, approvedInstruments, portfolio: 'etf',
    brokerReadiness: { fallbackRequired: true, reason: 'native_error' },
    quoteClient: goodClient,
  });
  const good = goodRows[0];
  assert.strictEqual(good.quoteSource, 'yahoo_last_close', 'positive price should adopt service source');
  assert.strictEqual(good.quoteTrusted, true, 'positive price should be trusted');
  assert.strictEqual(good.resolvedValueChf, Number((42.5 * 180 * 1.15).toFixed(2)), 'positive price should compute value');

  console.log(JSON.stringify({ ok: true, cases: 'zero/negative/null/undefined rejected; positive accepted' }, null, 2));
})().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
