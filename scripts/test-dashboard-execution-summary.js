const fs = require('fs');
const path = require('path');
const os = require('os');
const { executionLifecycleSummary } = require('../src/reporting/portfolioData');
const { generateDashboard } = require('../src/reporting/dashboardGenerator');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-exec-summary-'));
  const tradesPath = path.join(tempDir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 10:00:00 | approved | buy | AAA | ETF A | 1 | 100 | 100 | 0 | note | user_approved | |\n| 2026-05-03 10:01:00 | submitted | buy | BBB | ETF B | 2 | 200 | 400 | 0 | note | submitted_to_broker | 111 |\n| 2026-05-03 10:02:00 | partially_filled | buy | CCC | ETF C | 3 | 300 | 900 | 450 | note | broker_filled | 222 |\n| 2026-05-03 10:03:00 | failed | buy | DDD | ETF D | 4 | 400 | 1600 | 0 | note | broker_failed | 333 |\n`);

  const summary = executionLifecycleSummary(tradesPath);
  const dashboard = await generateDashboard({
    portfolioName: 'demo',
    holdingsText: `## Last Sync\n- Date/time: 2026-05-03 10:00:00\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 0`,
    allocations: [],
    approvedInstruments: [],
    existingTrades: [
      { date: '2026-05-03 10:03:00', action: 'buy', instrument: 'ETF D', estimatedChf: '1600', status: 'failed' },
    ],
    latestProposals: [],
    executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
    latestSnapshot: { notes: 'demo snapshot' },
    brokerReadiness: { fallbackRequired: false, message: 'healthy' },
    lifecycleSummary: summary,
  });

  console.log(JSON.stringify({ summary, hasLifecycleSection: dashboard.includes('## Execution Lifecycle'), dashboard }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
