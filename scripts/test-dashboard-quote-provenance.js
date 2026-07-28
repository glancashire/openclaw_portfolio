const assert = require('assert');
const { generateDashboard } = require('../src/reporting/dashboardGenerator');

async function main() {
  const dashboard = await generateDashboard({
    portfolioName: 'etf',
    holdingsText: `## Last Sync
- Date/time: 2026-05-03 10:00:00
- Total value CHF: 5000
- Cash CHF: 1000
- Invested value CHF: 4000

## Current Holdings
| Ticker / ISIN | Name | Quantity | Price | Currency | FX to CHF | Value CHF |
|---|---|---:|---:|---|---:|---:|
| AAA | ETF A | 10 | 100 | EUR | 1.0 | 1000 |
`,
    allocations: [],
    approvedInstruments: [
      { tickerOrIsin: 'AAA', ibkrSymbol: 'AAA', ibkrConid: '1', ibkrPrimaryExchange: 'IBIS2', currency: 'EUR', fxToChfHint: 1.0, name: 'ETF A' },
    ],
    existingTrades: [],
    latestProposals: [],
    executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
    latestSnapshot: { date: '2026-05-03', dailyChange: '0', dailyChangePct: '0' },
    brokerReadiness: { authenticated: false, fallbackRequired: true, marketDataMode: 'unknown', message: 'degraded' },
    lifecycleSummary: { proposed: 0, approved: 0, staged: 0, submitted: 0, partiallyFilled: 0 },
  });

  assert.match(dashboard, /Quote coverage:/i);
  assert.match(dashboard, /Oldest quote age:/i);
  assert.match(dashboard, /Quote source \| Quote age/i);
  console.log(JSON.stringify({ ok: true, hasQuoteCoverage: true }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
