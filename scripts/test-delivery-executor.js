const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { deliverPortfolioSummaryEmail } = require('../src/reporting/deliveryExecutor');

function seedPortfolio(repoRoot, deliveryPolicy) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  const configDir = path.join(repoRoot, 'config');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'report_delivery_policy.json'), JSON.stringify(deliveryPolicy, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-15 | end_of_day | 5000 | 1000 | 4000 | 0 | 0 | ok |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  fs.writeFileSync(path.join(portfolioDir, 'summary.md'), '# Demo summary\n\nEverything looks good.\n');
  fs.writeFileSync(path.join(portfolioDir, 'summary.html'), '<h1>Demo summary</h1><p>Everything looks good.</p>');
  return portfolioDir;
}

(async function main() {
  const repoRoot1 = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-executor-local-'));
  const portfolioDir1 = seedPortfolio(repoRoot1, { deliveryMode: 'local_only', externalDeliveryEnabled: false, emailProvider: 'mailgun', emailRecipients: [] });
  const skipped = await deliverPortfolioSummaryEmail({
    portfolioDir: portfolioDir1,
    period: 'weekly',
    summaryPath: path.join(portfolioDir1, 'summary.md'),
    summaryHtmlPath: path.join(portfolioDir1, 'summary.html'),
    sendEmailImpl: async () => { throw new Error('should not send'); },
  });
  assert.strictEqual(skipped.attempted, false);
  assert.strictEqual(skipped.reason, 'email_disabled_by_policy');

  const repoRoot2 = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-executor-email-'));
  process.env.MAILGUN_API_KEY = 'test-key';
  process.env.MAILGUN_DOMAIN = 'mailgun.example.com';
  process.env.MAILGUN_SENDER = 'bot@mailgun.example.com';
  const portfolioDir2 = seedPortfolio(repoRoot2, { deliveryMode: 'email_and_repo', externalDeliveryEnabled: true, emailProvider: 'mailgun', emailRecipients: ['lancashire@swift.ch'], pendingActionThresholds: { staleDashboard: false, failedTrades: 99, inFlightOrders: 99, brokerAutomationPaused: false } });
  let sentPayload = null;
  const sent = await deliverPortfolioSummaryEmail({
    portfolioDir: portfolioDir2,
    period: 'weekly',
    summaryPath: path.join(portfolioDir2, 'summary.md'),
    summaryHtmlPath: path.join(portfolioDir2, 'summary.html'),
    sendEmailImpl: async (payload) => {
      sentPayload = payload;
      return { id: 'stubbed-message' };
    },
  });
  assert.strictEqual(sent.attempted, true);
  assert.strictEqual(sent.sent, true);
  assert(sentPayload, 'Expected stub send payload');
  assert(sentPayload.subject.includes('weekly overview'));
  assert(sentPayload.html.includes('investor overview'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
