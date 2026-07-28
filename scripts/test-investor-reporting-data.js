const assert = require('assert');
const {
  parseHoldingsTable,
  buildInvestorHoldingsSnapshot,
  normalizeFilledTrade,
} = require('../src/reporting/investorReportingData');

(function main() {
  const canonicalHoldings = `# Holdings: demo

## Last Sync
- Date/time: 2026-05-24 10:00:00
- Base currency: CHF
- Total value CHF: 10000
- Portfolio cash CHF: 4000
- Invested value CHF: 6000

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| AAA | ETF A | Global equities | 10 | 600 | CHF | 1 | 6000 | 60 | 60 | 0 |
| CASH-CHF | CHF cash balance | Cash | 4000 | 1 | CHF | 1 | 4000 | 40 | 40 | 0 |
`;

  const canonicalRows = parseHoldingsTable(canonicalHoldings);
  assert.strictEqual(canonicalRows.length, 2);
  assert.strictEqual(canonicalRows[0].tickerOrIsin, 'AAA');
  assert.strictEqual(canonicalRows[0].quantity, 10);
  assert.strictEqual(canonicalRows[0].lastPrice, 600);
  assert.strictEqual(canonicalRows[0].valueChf, 6000);
  assert.strictEqual(canonicalRows[0].avgBuyPrice, null);
  assert.strictEqual(canonicalRows[0].gainSincePurchaseChf, null);

  const altHoldings = `# Holdings: Test

- Date/time: 2026-05-20 00:00:00
- Total value CHF: 5000
- Invested value CHF: 3000
- Cash CHF: 2000

## Current Holdings
| Ticker / ISIN | Name | Quantity | Last price | Market value CHF | Allocation % | Cost basis CHF | Unrealized P/L CHF | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|
| TEST | Test Holding | 3 | 120 | 360 | 7.2 | 300 | 60 | note |
`;
  const altRows = parseHoldingsTable(altHoldings);
  assert.strictEqual(altRows.length, 1);
  assert.strictEqual(altRows[0].costBasisChf, 300);
  assert.strictEqual(altRows[0].gainSincePurchaseChf, 60);
  assert.strictEqual(altRows[0].avgBuyPrice, 100);

  const snapshot = buildInvestorHoldingsSnapshot({
    holdingsText: altHoldings,
    approvedInstruments: [{ tickerOrIsin: 'TEST', name: 'Test Holding', ibkrConid: 'TEST', ibkrSymbol: 'TEST' }],
    historyRows: [
      { date: '2026-01-01', totalChf: 4500 },
      { date: '2026-05-20', totalChf: 5000 },
    ],
  });
  assert.strictEqual(snapshot.rows.length, 1);
  assert.strictEqual(snapshot.rows[0].symbol, 'TEST');
  assert.strictEqual(snapshot.rows[0].name, 'Test Holding');
  assert.strictEqual(snapshot.rows[0].quantityHeld, 3);
  assert.strictEqual(snapshot.rows[0].averageBuyPrice, 100);
  assert.strictEqual(snapshot.rows[0].lastTradedPrice, 120);
  assert.strictEqual(snapshot.rows[0].totalValue, 360);
  assert.strictEqual(snapshot.rows[0].valueChf, 360);
  assert.strictEqual(snapshot.rows[0].gainSincePurchaseChf, 60);
  assert.strictEqual(snapshot.rows[0].gainSincePurchasePct, 20);
  assert(snapshot.rows[0].performanceWindows, 'expected performance windows on investor holding');
  assert.strictEqual(snapshot.rows[0].performanceWindows.sincePurchase.gainChf, 60);
  assert.strictEqual(snapshot.rows[0].performanceWindows.sincePurchase.gainPct, 20);
  assert.strictEqual(snapshot.rows[0].performanceWindows.ytd.availability, 'missing_history');
  assert.strictEqual(snapshot.rows[0].availability.ytd, 'missing_history');

  const brokerishHoldings = `# Holdings: etf

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 75776072 | SXR8 | Global equities | 18 | 691.08 (avg cost) | EUR |  | 12439.52 | 0 | 0 | 0 |
`;
  const mappedSnapshot = buildInvestorHoldingsSnapshot({
    holdingsText: brokerishHoldings,
    approvedInstruments: [{ tickerOrIsin: 'IE00B5BMR087', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)', ibkrConid: '75776072', ibkrLocalSymbol: 'SXR8', ibkrSymbol: 'SXR8' }],
    historyRows: [],
  });
  assert.strictEqual(mappedSnapshot.rows[0].symbol, 'SXR8');
  assert.strictEqual(mappedSnapshot.rows[0].name, 'iShares Core S&P 500 UCITS ETF USD (Acc)');

  const filledTrade = normalizeFilledTrade({
    trade: {
      symbol: 'UBSPX',
      name: 'UBS Core S&P 500',
      action: 'BUY',
      qty: 8,
      fillQty: 8,
      price: 123.18,
      fillPrice: 123.18,
      currency: 'EUR',
      costChf: 984.2,
      fees: 1.8,
      actualChf: 986,
    },
    holdingsRows: [{ tickerOrIsin: 'UBSPX', quantity: 12, name: 'UBS Core S&P 500' }],
  });
  assert.strictEqual(filledTrade.symbol, 'UBSPX');
  assert.strictEqual(filledTrade.name, 'UBS Core S&P 500');
  assert.strictEqual(filledTrade.quantityPurchased, 8);
  assert.strictEqual(filledTrade.pricePerUnit, 123.18);
  assert.strictEqual(filledTrade.unitPrice, 123.18);
  assert.strictEqual(filledTrade.totalCost, 984.2);
  assert.strictEqual(filledTrade.costChfIncludingCommission, 986);
  assert.strictEqual(filledTrade.resultingTotalHeld, 12);

  const fallbackFilledTrade = normalizeFilledTrade({
    trade: {
      symbol: 'AAA',
      action: 'BUY',
      qty: 1,
      fillPrice: 100,
      currency: 'CHF',
      costChf: 100,
      fees: 2,
    },
    holdingsRows: [],
  });
  assert.strictEqual(fallbackFilledTrade.costChfIncludingCommission, 102);
  assert.strictEqual(fallbackFilledTrade.pricePerUnit, 100);
  assert.strictEqual(fallbackFilledTrade.resultingTotalHeld, null);
  assert.strictEqual(fallbackFilledTrade.availability.pricePerUnit, 'available');
  assert.strictEqual(fallbackFilledTrade.availability.resultingTotalHeld, 'missing');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
