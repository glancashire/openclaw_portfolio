const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { clearBrokerErrors, recordBrokerError } = require('../src/execution/runtimeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-incident-summary-'));
  const portfolioDir = path.join(tempDir, 'demo');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-06 11:00:00\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 0\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History: demo\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-06 | end_of_day | 5000 | 0 | 5000 | 0 | 0 | summary seed |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades: demo\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-06 11:05:00 | approved | buy | AAA | ETF A | 1 | 100 | 100 | 0 | approval audit | user_approved | |\n| 2026-05-06 11:06:00 | submitted | buy | BBB | ETF B | 2 | 50 | 100 | 0 | submitted audit | submitted_to_broker | 999 |\n');

  clearBrokerErrors('demo');
  recordBrokerError({ portfolio: 'demo', reason: 'status_error', message: 'temporary issue' });

  const output = execFileSync(process.execPath, [path.join(process.cwd(), 'scripts', 'operator-incident-summary.js'), portfolioDir], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const parsed = JSON.parse(output);

  assert(parsed.ok === true, 'Expected ok true');
  assert(parsed.portfolio === 'demo', 'Expected portfolio name');
  assert(parsed.brokerErrorStatus.consecutive === 1, 'Expected one broker error');
  assert(parsed.executionLifecycle.approved === 1, 'Expected approved count');
  assert(parsed.executionLifecycle.submitted === 1, 'Expected submitted count');
  assert(Array.isArray(parsed.recentTrades) && parsed.recentTrades.length === 2, 'Expected recent trades');
  assert(parsed.latestHistory && parsed.latestHistory.notes === 'summary seed', 'Expected latest history note');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
