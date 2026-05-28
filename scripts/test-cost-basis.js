'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  extractFilledLegs,
  buildCostBasisIndex,
  enrichHoldings,
} = require('../src/reporting/costBasis');

(function unitTests() {
  // Synthetic trades.md exercising both paths: explicit "filled" Status
  // and the "Execution reconciliation: broker status Filled" Reason note.
  const tradesText = `# Trades

## Trade Log
| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|
| 2026-05-01 10:00:00 | filled | buy | AAA | Alpha ETF | 10 | 100 | 1000 | 1000 | Filled at limit | user | 100 |
| 2026-05-02 10:00:00 | inactive | buy | BBB | Beta ETF | 5 | 50 | 250 | 0 | Execution reconciliation: broker status Filled, order id 9000, filled 5, remaining 0, avg fill 49.5, last fill 49.5, exec id deadbeef.01, executed at 2026-05-02 | user | 9000 |
| 2026-05-03 10:00:00 | inactive | buy | BBB | Beta ETF | 5 | 51 | 255 | 0 | Execution reconciliation: broker status Filled, order id 9001, filled 5, remaining 0, avg fill 51.0, last fill 51.0, exec id deadbeef.02 | user | 9001 |
| 2026-05-04 10:00:00 | planned | hold | CASH-CHF | CHF cash balance | 0 | 0 | 1000 | 0 | hold | n/a |  |
| 2026-05-05 10:00:00 | inactive | buy | DDD | Drift ETF | 7 | 30 | 210 | 0 | Broker rejected | n/a | 9999 |
`;

  const legs = extractFilledLegs(tradesText);
  assert.strictEqual(legs.length, 3, 'should detect 3 filled buys');
  assert.strictEqual(legs[0].isin, 'AAA');
  assert.strictEqual(legs[0].filledQty, 10);
  assert.strictEqual(legs[1].isin, 'BBB');
  assert.strictEqual(legs[1].avgPriceNative, 49.5);

  const approved = [
    { tickerOrIsin: 'AAA', name: 'Alpha ETF', currency: 'CHF', fxToChfHint: 1, ibkrConid: '111' },
    { tickerOrIsin: 'BBB', name: 'Beta ETF', currency: 'EUR', fxToChfHint: 0.96, ibkrConid: '222', ibkrSymbol: 'BETA' },
  ];
  const index = buildCostBasisIndex({ tradesText, approvedInstruments: approved });
  const aaa = index.byKey.get('AAA');
  assert.strictEqual(aaa.totalQty, 10);
  assert.strictEqual(aaa.avgPriceNative, 100);
  assert.strictEqual(aaa.totalCostChf, 1000);
  const bbb = index.byKey.get('BBB');
  assert.strictEqual(bbb.totalQty, 10);
  assert.strictEqual(bbb.avgPriceNative, 50.25);
  assert.strictEqual(bbb.currency, 'EUR');
  assert.ok(Math.abs(bbb.totalCostChf - 482.4) < 0.05);
  // Conid lookup
  assert.strictEqual(index.byKey.get('111').isin, 'AAA');
  assert.strictEqual(index.byKey.get('222').isin, 'BBB');
  assert.strictEqual(index.byKey.get('BETA').isin, 'BBB');

  // Enrichment - holdings reference by conid (as in real ETF holdings.md)
  const holdingRows = [
    { tickerOrIsin: '111', name: 'Alpha ETF', quantity: 10, currency: 'CHF', fxToChf: 1, valueChf: 1200 },
    { tickerOrIsin: '222', name: 'Beta ETF', quantity: 8, currency: 'EUR', fxToChf: 0.96, valueChf: 400 },
    { tickerOrIsin: 'ZZZ', name: 'Unknown', quantity: 1, currency: 'CHF', fxToChf: 1, valueChf: 100 },
  ];
  const { rows: enriched, totals } = enrichHoldings({ holdingRows, tradesText, approvedInstruments: approved });
  assert.strictEqual(enriched[0].costBasisChf, 1000);
  assert.strictEqual(enriched[0].unrealizedProfitChf, 200);
  assert.strictEqual(enriched[0].unrealizedProfitPct, 20);
  assert.strictEqual(enriched[0].costBasisSource, 'trades_md');
  // Beta: avg native 50.25 EUR * 8 = 402 EUR -> ~385.92 CHF
  assert.ok(Math.abs(enriched[1].costBasisChf - 385.92) < 0.05);
  assert.ok(enriched[1].unrealizedProfitChf > 0);
  // Unknown row gets no cost basis
  assert.strictEqual(enriched[2].costBasisChf, null);
  assert.strictEqual(enriched[2].unrealizedProfitChf, null);
  // Totals only sum covered rows
  assert.ok(totals.totalProfitChf > 0);
  assert.strictEqual(totals.coveredCount, 2);

  // Fallback path: AvgCost via avgCostByKey
  const fallbackEnriched = enrichHoldings({
    holdingRows: [{ tickerOrIsin: 'NEW', name: 'New ETF', quantity: 5, currency: 'CHF', fxToChf: 1, valueChf: 600 }],
    tradesText: '',
    approvedInstruments: [],
    avgCostByKey: { NEW: 100 },
  });
  assert.strictEqual(fallbackEnriched.rows[0].costBasisChf, 500);
  assert.strictEqual(fallbackEnriched.rows[0].unrealizedProfitChf, 100);
  assert.strictEqual(fallbackEnriched.rows[0].costBasisSource, 'ibkr_avg_cost');

  console.log('unit tests ok');
})();

(function realDataSmokeTest() {
  const tradesPath = path.join(__dirname, '..', 'portfolio', 'etf', 'trades.md');
  const portfolioPath = path.join(__dirname, '..', 'portfolio', 'etf', 'portfolio.md');
  if (!fs.existsSync(tradesPath) || !fs.existsSync(portfolioPath)) {
    console.log('real-data smoke test skipped (paths missing)');
    return;
  }
  const tradesText = fs.readFileSync(tradesPath, 'utf8');
  const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
  const approved = readApprovedInstruments(portfolioPath);
  const index = buildCostBasisIndex({ tradesText, approvedInstruments: approved });
  // Expect at least one filled leg for the SXR8/IE00B5BMR087 path and at least one EMUAA leg.
  assert.ok(index.legs.length > 0, 'expected at least one filled leg from real trades.md');
  console.log('real-data smoke test ok: filled legs =', index.legs.length, 'ISINs =', index.byIsin.size);
  for (const [isin, agg] of index.byIsin) {
    console.log(`  ${isin}: qty=${agg.totalQty} avgNative=${agg.avgPriceNative} costChf=${agg.totalCostChf} ccy=${agg.currency}`);
  }
})();
