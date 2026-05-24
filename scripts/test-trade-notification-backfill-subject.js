const assert = require('assert');
const { notifyTradeFill } = require('../lib/tradeExecutionNotifier');

(async function main() {
  const sent = [];
  const sendEmailImpl = async (payload) => {
    sent.push(payload);
    return { id: 'queued-stub' };
  };

  process.env.MAILGUN_API_KEY = '***';
  process.env.MAILGUN_DOMAIN = 'mailgun.example.com';
  process.env.MAILGUN_SENDER = 'bot@mailgun.example.com';

  const common = {
    trade: { symbol: 'UBSPX', action: 'BUY', qty: 8, fillQty: 8, price: 123.18, fillPrice: 123.18, currency: 'EUR', costChf: 984.2, orderId: '9119' },
    portfolio: { totalValueChf: 5000, cashChf: 1000, holdings: [] },
    openOrders: [],
    to: 'lancashire@swift.ch',
  };

  const live = await notifyTradeFill({ ...common, sendEmailImpl, notificationMode: 'live_fill' });
  const backfill = await notifyTradeFill({ ...common, sendEmailImpl, notificationMode: 'backfill' });

  assert.strictEqual(live.sent, true);
  assert.strictEqual(backfill.sent, true);
  assert(sent[0].subject.startsWith('BUY 8 UBSPX filled @ 123.18 EUR'));
  assert(sent[1].subject.startsWith('[Backfill] BUY 8 UBSPX filled @ 123.18 EUR'));
  assert(sent[0].html.includes('Purchase summary'));
  assert(sent[0].text.includes('Purchase summary'));
  assert(/delayed notification backfill/i.test(sent[1].text));

  console.log(JSON.stringify({ ok: true, subjects: sent.map((p) => p.subject) }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
