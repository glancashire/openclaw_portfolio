const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

(function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'email-readiness-cli-'));
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({ deliveryMode: 'email_and_repo', externalDeliveryEnabled: true, emailProvider: 'mailgun', emailRecipients: ['lancashire@swift.ch'] }, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-15 | end_of_day | 5000 | 1000 | 4000 | 0 | 0 | ok |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [], acknowledgedBackfilledFills: [] }, null, 2));

  const env = { ...process.env, MAILGUN_API_KEY: 'test-key', MAILGUN_DOMAIN: 'mailgun.example.com', MAILGUN_SENDER: 'bot@mailgun.example.com' };
  const output = execFileSync('node', ['scripts/check-email-delivery-readiness.js', portfolioDir], { cwd: process.cwd(), env, encoding: 'utf8' });
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.policy.deliveryMode, 'email_and_repo');
  assert.strictEqual(parsed.email.ready, true);
  assert.strictEqual(parsed.email.recipient, 'lancashire@swift.ch');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
