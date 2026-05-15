const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { notifyTradeFill } = require('../lib/tradeExecutionNotifier');

function seedRepo(policy) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fill-email-'));
  const portfolioDir = path.join(repoRoot, 'portfolio', 'etf');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify(policy, null, 2));
  return { repoRoot, portfolioDir };
}

(async function main() {
  const disabled = seedRepo({ deliveryMode: 'local_only', emailProvider: 'mailgun', emailRecipients: [] });
  const skipped = await notifyTradeFill({
    portfolioDir: disabled.portfolioDir,
    trade: { symbol: 'SLICHA', action: 'BUY', qty: 1, fillPrice: 221.8, price: 221.8, currency: 'CHF', costChf: 221.8 },
    portfolio: { name: 'ETF Portfolio', totalValueChf: 5000, cashChf: 4778.2, holdings: [] },
    openOrders: [],
    sendEmailImpl: async () => { throw new Error('should not send'); },
  });
  assert.strictEqual(skipped.sent, false);
  assert.strictEqual(skipped.reason, 'email_disabled_by_policy');

  process.env.MAILGUN_API_KEY = 'test-key';
  process.env.MAILGUN_DOMAIN = 'mailgun.example.com';
  process.env.MAILGUN_SENDER = 'bot@mailgun.example.com';
  const enabled = seedRepo({ deliveryMode: 'email_and_repo', externalDeliveryEnabled: true, emailProvider: 'mailgun', emailRecipients: ['lancashire@swift.ch'] });
  let payload = null;
  const sent = await notifyTradeFill({
    portfolioDir: enabled.portfolioDir,
    trade: { symbol: 'SLICHA', action: 'BUY', qty: 1, fillQty: 1, fillPrice: 221.8, price: 221.8, currency: 'CHF', costChf: 221.8 },
    portfolio: { name: 'ETF Portfolio', totalValueChf: 5000, cashChf: 4778.2, holdings: [] },
    openOrders: [],
    sendEmailImpl: async (next) => {
      payload = next;
      return { id: 'fill-stubbed-message' };
    },
  });
  assert.strictEqual(sent.sent, true);
  assert(payload, 'Expected send payload');
  assert.strictEqual(payload.policy.emailRecipients[0], 'lancashire@swift.ch');
  assert(payload.subject.includes('SLICHA filled'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
