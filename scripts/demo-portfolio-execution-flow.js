const fs = require('fs');
const path = require('path');
const os = require('os');
const { appendTradeEvent, markTradeApproved, reconcileOrderStatus, readTradesTable } = require('../src/execution/tradeState');
const { appendHistorySnapshot } = require('../src/analysis/historyWriter');
const { generateDashboard } = require('../src/reporting/dashboardGenerator');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-demo-'));
  const holdingsText = `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-03 20:30:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 0\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 5000 | 1 | 5000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n`;
  const tradesPath = path.join(tempDir, 'trades.md');
  const historyPath = path.join(tempDir, 'history.md');
  const holdingsPath = path.join(tempDir, 'holdings.md');

  fs.writeFileSync(holdingsPath, holdingsText);
  fs.writeFileSync(tradesPath, `# Trades: demo\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n`);
  fs.writeFileSync(historyPath, `# History: demo\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n`);

  appendTradeEvent(tradesPath, {
    status: 'proposed',
    action: 'buy',
    tickerOrIsin: 'LU0950668870',
    name: 'UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc',
    quantity: 10,
    limitPrice: 38.5,
    estimatedChf: 385,
    actualChf: 0,
    reason: 'demo proposal',
    approval: 'pending_user_approval',
    brokerOrderId: '',
  }, '2026-05-03 20:31:00');

  markTradeApproved(tradesPath, { dateTime: '2026-05-03 20:31:00', tickerOrIsin: 'LU0950668870' });
  appendHistorySnapshot(historyPath, holdingsPath, 'execution_approved', 'Demo trade approved.', { executionStatus: 'approved' });
  reconcileOrderStatus(tradesPath, { dateTime: '2026-05-03 20:31:00', tickerOrIsin: 'LU0950668870' }, { orderId: 321, status: 'Submitted', filled: 0, remaining: 10, transmit: true });
  appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', 'Demo trade submitted.', { executionStatus: 'submitted' });
  reconcileOrderStatus(tradesPath, { orderId: '321', tickerOrIsin: 'LU0950668870' }, { orderId: 321, status: 'Filled', filled: 10, remaining: 0, avgFillPrice: 38.45, lastFillPrice: 38.5, executedAt: '2026-05-03T20:33:00Z', execId: 'demo-fill-1', estimatedValue: 384.5 });
  appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', 'Demo trade filled.', { executionStatus: 'filled' });

  const dashboard = await generateDashboard({
    portfolioName: 'demo',
    holdingsText,
    allocations: [],
    approvedInstruments: [
      { tickerOrIsin: 'LU0950668870', name: 'UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc', target: 20 },
    ],
    existingTrades: readTradesTable(tradesPath).rows.map((row) => ({
      date: row['Date/time'],
      action: row.Action,
      instrument: row.Name,
      estimatedChf: row['Estimated CHF'],
      status: row.Status,
    })),
    latestProposals: [],
    executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
    latestSnapshot: { notes: 'Demo trade filled.', snapshot: 'execution_filled' },
    brokerReadiness: { fallbackRequired: false, message: 'demo ready' },
    lifecycleSummary: { proposed: 0, approved: 0, submitted: 0, partiallyFilled: 0, filled: 1, cancelled: 0, failed: 0, planned: 0, withBrokerOrderId: 1 },
  });

  console.log(JSON.stringify({
    ok: true,
    tempDir,
    trades: readTradesTable(tradesPath).rows,
    history: fs.readFileSync(historyPath, 'utf8'),
    dashboard,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
