'use strict';

const assert = require('assert');
const { mapExternalQuoteSymbol, resolveHoldingQuotes } = require('../src/reporting/quoteResolution');
const { enrichHoldings } = require('../src/reporting/costBasis');

(async function main() {
  assert.strictEqual(mapExternalQuoteSymbol({ ibkrSymbol: 'SXR8', ibkrPrimaryExchange: 'IBIS2' }), 'SXR8.DE');
  assert.strictEqual(mapExternalQuoteSymbol({ ibkrLocalSymbol: 'CHSPI', ibkrSymbol: 'UBSSLI', ibkrPrimaryExchange: 'EBS' }), 'CHSPI.SW');
  assert.strictEqual(mapExternalQuoteSymbol({ ibkrSymbol: 'HMCD', ibkrPrimaryExchange: 'LSEETF' }), 'HMCD.L');

  const approvedInstruments = [
    { tickerOrIsin: 'AAA', ibkrSymbol: 'AAA', ibkrConid: '1', ibkrPrimaryExchange: 'IBIS2', currency: 'EUR', fxToChfHint: 0.96, name: 'ETF A' },
  ];
  const holdingRows = [
    { tickerOrIsin: 'AAA', symbol: 'AAA', name: 'ETF A', quantity: 10, lastPrice: 100, currency: 'EUR', fxToChf: 0.96, valueChf: 960 },
  ];

  const resolved = await resolveHoldingQuotes({
    holdingRows,
    approvedInstruments,
    portfolio: 'etf',
    brokerReadiness: { fallbackRequired: true, reason: 'native_error' },
  });

  assert.strictEqual(resolved.rows[0].quoteSource, 'holdings_snapshot');
  assert.strictEqual(resolved.rows[0].quoteQuality, 'stale_or_unknown');
  assert.match(resolved.rows[0].quoteNote, /no fresher reporting-time quote/i);

  const enriched = enrichHoldings({
    holdingRows: resolved.rows.map((row) => ({ ...row, valueChf: row.resolvedValueChf ?? row.valueChf })),
    tradesText: `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-01 10:00:00 | filled | buy | AAA | ETF A | 10 | 90 | 900 | 900 | Filled at limit | user | 100 |\n`,
    approvedInstruments,
  });

  assert.strictEqual(enriched.totals.totalProfitChf, 96);
  assert.strictEqual(enriched.totals.totalProfitPct, 11.11);

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
