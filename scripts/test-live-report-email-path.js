const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { deliverPortfolioSummaryEmail } = require('../src/reporting/deliveryExecutor');

function seed(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({
    deliveryMode: 'email_and_repo',
    intendedChannels: ['repo_artifacts', 'email'],
    externalDeliveryEnabled: true,
    emailProvider: 'mailgun',
    emailRecipients: ['lancashire@swift.ch'],
    pendingActionThresholds: { staleDashboard: false, failedTrades: 99, inFlightOrders: 99, brokerAutomationPaused: false },
  }, null, 2));
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [], acknowledgedBackfilledFills: [] }, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-15 | end_of_day | 5000 | 1000 | 4000 | 0 | 0 | ok |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  fs.writeFileSync(path.join(portfolioDir, 'summary.md'), '# Demo summary\n\nReady for email delivery.\n');
  fs.writeFileSync(path.join(portfolioDir, 'summary.html'), '<h1>Demo summary</h1><p>Ready for email delivery.</p>');
  return portfolioDir;
}

(async function main() {
  process.env.MAILGUN_API_KEY = 'test-key';
  process.env.MAILGUN_DOMAIN = 'mailgun.example.com';
  process.env.MAILGUN_SENDER = 'bot@mailgun.example.com';
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'live-report-email-path-'));
  const portfolioDir = seed(repoRoot);
  let payload = null;
  const result = await deliverPortfolioSummaryEmail({
    portfolioDir,
    period: 'weekly',
    summaryPath: path.join(portfolioDir, 'summary.md'),
    summaryHtmlPath: path.join(portfolioDir, 'summary.html'),
    sendEmailImpl: async (next) => {
      payload = next;
      return { id: 'queued-stub' };
    },
  });

  assert.strictEqual(result.sent, true);
  assert(payload, 'expected email payload');
  assert(payload.policy.emailRecipients.includes('lancashire@swift.ch'));
  assert(payload.subject.includes('weekly overview'));
  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
