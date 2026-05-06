const fs = require('fs');
const os = require('os');
const path = require('path');
const { runReportCycle } = require('./run-report-cycle');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function seedPortfolio(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n\n## Allocation Targets\n| Asset class | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global equities | 60 | 50 | 70 | |\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 60 | 50 | 70 | SIX | CHF | |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| none | none |\n\n## Rebalancing Policy\n- Rebalance threshold: absolute drift > 5 percentage points or relative drift > 20%\n- Minimum trade size: CHF 500\n- Avoid unnecessary trades: true\n- Prefer using new cash before selling: true\n\n## Market Entry Policy\n- Initial deployment mode: staged\n\n## Automation Permissions\n- Generate trade proposals automatically: yes\n\n## Notes / Open Questions\n- settled\n`);
  fs.writeFileSync(path.join(dir, 'holdings.md'), `# Holdings\n\n## Summary\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested CHF: 0\n- Last updated: 2026-05-06 08:00:00\n- Pricing source: simulated\n\n## Current Holdings\n| Currency | Ticker / ISIN | Asset class | Quantity | Price | FX | Value CHF | Weight % | Notes |\n|---|---|---|---:|---:|---:|---:|---:|---|\n| CHF | CASH-CHF | Cash | 1 | 5000 | 1 | 5000 | 100 | cash |\n`);
  fs.writeFileSync(path.join(dir, 'trades.md'), `# Trades\n\n## Trade Log\n| Timestamp | Era | Status | Approval | Action | Ticker / ISIN | Instrument | Quantity | Currency | Limit Price | Estimated CHF | Broker Order ID | Notes |\n|---|---|---|---|---|---|---|---:|---|---:|---:|---|---|\n`);
  fs.writeFileSync(path.join(dir, 'history.md'), `# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-06 | end_of_day | 5000 | 0 | 5000 | 0 | 0 | seed |\n`);
  fs.writeFileSync(path.join(dir, 'dashboard.md'), '# Dashboard\n');
}

async function main() {
  const okDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-ops-ok-'));
  seedPortfolio(okDir);
  const okRun = await runReportCycle({ portfolioDir: okDir, period: 'weekly', dateStamp: '20260506' });
  assert(okRun.ok === true, 'Expected successful report cycle');
  assert(okRun.mode === 'read_only_reporting', 'Expected read-only reporting mode');
  assert(okRun.workflow.length === 3, 'Expected three workflow steps');
  assert(okRun.workflow.every((step) => step.ok === true), 'Expected all workflow steps to succeed');
  assert(okRun.workflow[2].name === 'generate_report', 'Expected report generation step');
  assert(okRun.workflow[2].deliveryMode === 'local_only', 'Expected local-only delivery mode metadata');
  assert(Array.isArray(okRun.workflow[2].pendingActions), 'Expected pending-actions metadata');
  assert(okRun.deliveryStatus && okRun.deliveryStatus.deliveryMode === 'local_only', 'Expected cycle result delivery status');

  const failDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-ops-fail-'));
  seedPortfolio(failDir);
  fs.unlinkSync(path.join(failDir, 'holdings.md'));
  let failed = null;
  try {
    await runReportCycle({ portfolioDir: failDir, period: 'weekly', dateStamp: '20260506' });
  } catch (error) {
    failed = error;
  }
  assert(failed, 'Expected failed report cycle');
  assert(failed.failedStep === 'append_history_snapshot', 'Expected failed step metadata');
  assert(Array.isArray(failed.workflow) && failed.workflow[0].ok === false, 'Expected failed workflow entry');
  assert(failed.mode === 'read_only_reporting', 'Expected failure mode metadata');

  console.log(JSON.stringify({ ok: true, okRun, failed: { failedStep: failed.failedStep, workflow: failed.workflow, mode: failed.mode } }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
