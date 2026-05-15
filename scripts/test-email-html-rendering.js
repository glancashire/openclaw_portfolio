const assert = require('assert');
const { buildReportEmailHtml } = require('../src/reporting/reportEmail');
const { buildTradeEmailHtml } = require('../lib/tradeNotificationEmail');

(function main() {
  const reportHtml = buildReportEmailHtml({
    portfolioName: 'etf',
    period: 'weekly',
    summaryHtml: '<h1>Demo summary</h1><p>Everything looks good.</p>',
    deliveryStatus: { pendingActions: ['1 delivery item needs review'] },
  });
  assert(reportHtml.includes('OpenClaw Portfolio Report'));
  assert(reportHtml.includes('Delivery posture'));
  assert(reportHtml.includes('Portfolio summary'));
  assert(reportHtml.includes('report-email-summary'));
  assert(reportHtml.includes('1 delivery item needs review'));

  const tradeHtml = buildTradeEmailHtml({
    symbol: 'SLICHA',
    action: 'BUY',
    qty: 4,
    fillQty: 4,
    price: 222.5,
    fillPrice: 221.8,
    currency: 'CHF',
    costChf: 887.2,
    fees: 1.5,
    orderId: '1234567',
    time: '2026-05-15 12:00:00',
  }, {
    name: 'ETF Portfolio',
    totalValueChf: 5000,
    cashChf: 4112.8,
    holdings: [
      { symbol: 'SLICHA', name: 'UBS ETF SLI', valueChf: 887.2, allocPct: 17.7, targetPct: 20, driftPct: -2.3 },
    ],
  }, [
    { symbol: 'EMUAA', action: 'BUY', qty: 27, limitPrice: 40.3, currency: 'EUR', status: 'Submitted' },
  ]);
  assert(tradeHtml.includes('Execution summary'));
  assert(tradeHtml.includes('Portfolio after trade'));
  assert(tradeHtml.includes('Remaining open orders'));
  assert(tradeHtml.includes('BUY filled'));
  assert(tradeHtml.includes('SLICHA fill confirmed'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
