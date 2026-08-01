'use strict';

const assert = require('assert');
const { mapExternalQuoteSymbol, resolveHoldingQuotes, extractYahooLastClose } = require('../src/reporting/quoteResolution');
const { QuoteServiceClient } = require('../src/quotes');
const { enrichHoldings } = require('../src/reporting/costBasis');


// Hermetic transport: this test asserts *fallback* resolution behaviour, so it
// must not depend on live broker/network state (a live IBKR gateway would
// otherwise return ibkr_tws and make these assertions non-deterministic).
function createFallbackTransport() {
  return {
    kind: 'test_fallback_stub',
    async getQuote({ context = {} } = {}) {
      if (!context.externalSymbol) {
        return { ok: false, reason: 'missing_symbol', attempts: [] };
      }
      return {
        ok: true,
        price: 42.5,
        close: 42.5,
        currency: 'EUR',
        providerPath: 'yahoo_last_close',
        providerLabel: 'Yahoo Finance (last close)',
        quality: 'last_close',
        asOf: '2026-07-30T07:00:00.000Z',
        ageSeconds: 60,
        ageLabel: '1m',
        note: 'Resolved from Yahoo Finance chart close series for ' + context.externalSymbol + '.',
        attempts: [],
      };
    },
    async getQuotes() { return []; },
    async getProviderHealth() { return []; },
  };
}
const fallbackClient = new QuoteServiceClient({ transport: createFallbackTransport() });

(async function main() {
  assert.strictEqual(mapExternalQuoteSymbol({ ibkrSymbol: 'SXR8', ibkrPrimaryExchange: 'IBIS2' }), 'SXR8.DE');
  assert.strictEqual(mapExternalQuoteSymbol({ ibkrLocalSymbol: 'CHSPI', ibkrSymbol: 'UBSSLI', ibkrPrimaryExchange: 'EBS' }), 'CHSPI.SW');
  assert.strictEqual(mapExternalQuoteSymbol({ ibkrSymbol: 'HMCD', ibkrPrimaryExchange: 'LSEETF' }), 'HMCD.L');
  assert.strictEqual(mapExternalQuoteSymbol({ ibkrSymbol: 'OVR', externalQuoteSymbol: 'OVR.SW' }), 'OVR.SW');

  const yahooExtracted = extractYahooLastClose({
    chart: {
      result: [{
        meta: { symbol: 'AAA.DE', currency: 'EUR', previousClose: 101.25 },
        timestamp: [1717000000, 1717086400],
        indicators: { quote: [{ close: [100.5, 102.75] }] },
      }],
    },
  });
  assert.strictEqual(yahooExtracted.close, 102.75);
  assert.strictEqual(yahooExtracted.symbol, 'AAA.DE');

  const approvedInstruments = [
    { tickerOrIsin: 'AAA', ibkrSymbol: 'AAA', ibkrConid: '1', ibkrPrimaryExchange: 'IBIS2', currency: 'EUR', fxToChfHint: 0.96, name: 'ETF A' },
    { tickerOrIsin: 'OVR', ibkrSymbol: 'OVR', ibkrConid: '2', externalQuoteSymbol: 'OVR.SW', currency: 'EUR', fxToChfHint: 0.96, name: 'ETF Override' },
  ];
  const holdingRows = [
    { tickerOrIsin: 'AAA', symbol: 'AAA', name: 'ETF A', quantity: 10, lastPrice: 100, currency: 'EUR', fxToChf: 0.96, valueChf: 960 },
  ];

  const resolved = await resolveHoldingQuotes({
    holdingRows,
    approvedInstruments,
    portfolio: 'etf',
    brokerReadiness: { fallbackRequired: true, reason: 'native_error' },
    quoteClient: fallbackClient,
  });

  assert.ok(['holdings_snapshot', 'yahoo_last_close'].includes(resolved.rows[0].quoteSource));
  if (resolved.rows[0].quoteSource === 'yahoo_last_close') {
    assert.strictEqual(resolved.rows[0].quoteQuality, 'last_close');
    assert.strictEqual(resolved.rows[0].quoteTrusted, true);
    assert.match(resolved.rows[0].quoteNote, /Yahoo Finance/i);
  } else {
    assert.strictEqual(resolved.rows[0].quoteQuality, 'stale_or_unknown');
    assert.match(resolved.rows[0].quoteNote, /no fresher reporting-time quote|External fallback unavailable|external fallback was skipped|broker\/service quote resolution did not produce a fresher usable valuation/i);
  }

  const enriched = enrichHoldings({
    holdingRows: resolved.rows.map((row) => ({ ...row, valueChf: row.resolvedValueChf ?? row.valueChf })),
    tradesText: `# Trades

## Trade Log
| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|
| 2026-05-01 10:00:00 | filled | buy | AAA | ETF A | 10 | 90 | 900 | 900 | Filled at limit | user | 100 |
`,
    approvedInstruments,
  });

  assert.ok(Number.isFinite(enriched.totals.totalProfitChf));
  assert.ok(Number.isFinite(enriched.totals.totalProfitPct));

  const emuaaResolved = await resolveHoldingQuotes({
    holdingRows: [
      { tickerOrIsin: '243939970', symbol: '243939970', name: 'EMUAA', quantity: 329, lastPrice: 41.11, currency: 'EUR', fxToChf: 0.90366, valueChf: 12222.17 },
    ],
    approvedInstruments: [
      { tickerOrIsin: 'LU0950668870', name: 'UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc', ibkrSymbol: 'EMUAA', ibkrConid: '243939970', ibkrPrimaryExchange: 'IBIS2', externalQuoteSymbol: 'EMUAA.SW', notes: 'ibkr_symbol=EMUAA; ibkr_conid=243939970; ibkr_primary_exchange=IBIS2; external_quote_symbol=EMUAA.SW;' },
    ],
    portfolio: 'etf',
    brokerReadiness: { fallbackRequired: true, reason: 'native_error' },
    quoteClient: fallbackClient,
  });
  assert.ok(['yahoo_last_close', 'holdings_snapshot'].includes(emuaaResolved.rows[0].quoteSource));
  if (emuaaResolved.rows[0].quoteSource === 'yahoo_last_close') {
    assert.strictEqual(emuaaResolved.rows[0].quoteQuality, 'last_close');
    assert.strictEqual(emuaaResolved.rows[0].externalSymbol, 'EMUAA.SW');
  }

  console.log(JSON.stringify({ ok: true, quoteSource: resolved.rows[0].quoteSource, emuaaQuoteSource: emuaaResolved.rows[0].quoteSource }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
