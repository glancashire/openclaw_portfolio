const assert = require('assert');
const { buildReportEmailHtml, buildReportEmailText } = require('../src/reporting/reportEmail');
const { buildTradeEmailHtml, buildTradeEmailText } = require('../lib/tradeNotificationEmail');

(function main() {
  const summary = {
    holdings: {
      totalValueChf: 5327.03,
      investedChf: 5210.39,
      cashChf: 116.64,
      holdingCount: 2,
      latestSnapshotDate: '2026-05-15',
      lastSyncAt: '2026-05-13 14:29:30',
      baseCurrency: 'CHF',
      dailyChangeChf: 0,
      dailyChangePct: 0,
    },
    status: {
      health: 'attention_needed',
      executionPosture: 'ready_for_review',
      brokerHealth: 'healthy',
      brokerMessage: 'Interactive Brokers read-only connectivity and live/realtime market data are available.',
    },
  };

  const reportHtml = buildReportEmailHtml({
    portfolioName: 'etf',
    period: 'weekly',
    summary,
    summaryHtml: '<h1>Demo summary</h1><p>Everything looks good.</p>',
    deliveryStatus: { pendingActions: ['1 delivery item needs review'] },
    topBlocker: '[broker_unready] Broker connectivity is degraded.',
    nextAction: 'Restore broker connectivity first.',
  });
  const reportText = buildReportEmailText({
    portfolioName: 'etf',
    period: 'weekly',
    summary,
    summaryMarkdown: '# Demo summary\n\nEverything looks good.',
    deliveryStatus: { pendingActions: ['1 delivery item needs review'] },
    topBlocker: '[broker_unready] Broker connectivity is degraded.',
    nextAction: 'Restore broker connectivity first.',
  });

  assert(reportHtml.includes('OpenClaw Portfolio Report'));
  assert(reportHtml.includes('Management summary'));
  assert(reportHtml.includes('Investor take'));
  assert(reportHtml.includes('Portfolio value'));
  assert(reportHtml.includes('Gain since purchase'));
  assert(reportHtml.includes('max-width:720px'));
  assert(reportHtml.includes('display:inline-block;vertical-align:top;width:calc(50% - 10px)'));
  assert(reportHtml.includes('linear-gradient(135deg'));
  assert(reportHtml.includes('CHF 5&#39;327.03') || reportHtml.includes('CHF 5,327.03'));
  assert(reportHtml.includes('+CHF 116.64'));
  assert(reportHtml.includes('+2.2%'));
  assert(reportHtml.includes('Immediate priorities'));
  assert(reportHtml.includes('What matters now'));
  assert(reportHtml.includes('Status snapshot'));
  assert(reportHtml.includes('Workflow items'));
  assert(!reportHtml.includes('Supporting detail'));
  assert(!reportHtml.includes('report-email-summary'));
  assert(reportHtml.includes('Restore broker connectivity first.'));
  assert(reportHtml.includes('[broker_unready] Broker connectivity is degraded.'));
  assert(reportHtml.includes('1 delivery item needs review'));
  assert(!reportHtml.includes('No active blocker is currently surfaced.'));
  assert(reportHtml.includes('Management summary'));

  assert(reportText.includes('Management summary'));
  assert(reportText.includes('Headline metrics'));
  assert(reportText.includes('Portfolio value (CHF): CHF'));
  assert(reportText.includes('Gain since purchase (CHF): +CHF 116.64'));
  assert(reportText.includes('Gain since purchase (%): +2.2%'));
  assert(reportText.includes('Top blocker: [broker_unready] Broker connectivity is degraded.'));
  assert(reportText.includes('What matters now: Restore broker connectivity first.'));
  assert(reportText.includes('Next action: Restore broker connectivity first.'));
  assert(!reportText.includes('Supporting detail'));

  const tradeInput = {
    symbol: 'SLICHA',
    name: 'UBS ETF SLI',
    action: 'BUY',
    qty: 4,
    fillQty: 4,
    price: 222.5,
    fillPrice: 221.8,
    currency: 'CHF',
    costChf: 887.2,
    fees: 1.5,
    actualChf: 888.7,
    orderId: '1234567',
    time: '2026-05-15 12:00:00',
  };
  const portfolioInput = {
    name: 'ETF Portfolio',
    totalValueChf: 5000,
    cashChf: 4112.8,
    holdings: [
      { symbol: 'SLICHA', name: 'UBS ETF SLI', quantityHeld: 4, valueChf: 887.2, allocPct: 17.7, targetPct: 20, driftPct: -2.3 },
    ],
  };
  const openOrdersInput = [
    { symbol: 'EMUAA', action: 'BUY', qty: 27, limitPrice: 40.3, currency: 'EUR', status: 'Submitted' },
  ];
  const tradeHtml = buildTradeEmailHtml(tradeInput, portfolioInput, openOrdersInput);
  const tradeText = buildTradeEmailText(tradeInput, portfolioInput, openOrdersInput);
  assert(tradeHtml.includes('Management summary'));
  assert(tradeHtml.includes('Purchase summary'));
  assert(tradeHtml.includes('Resulting total held'));
  assert(tradeHtml.includes('Cost in CHF including commission'));
  assert(tradeHtml.includes('UBS ETF SLI'));
  assert(tradeHtml.includes('4'));
  assert(tradeHtml.includes('CHF 888.70'));
  assert(tradeHtml.includes('Portfolio after fill'));
  assert(tradeHtml.includes('Remaining open orders'));
  assert(tradeHtml.includes('BUY filled'));
  assert(tradeHtml.includes('1 open order(s)'));
  assert(tradeHtml.includes('SLICHA fill confirmed'));
  assert(tradeText.includes('Purchase summary'));
  assert(tradeText.includes('Symbol: SLICHA'));
  assert(tradeText.includes('Name: UBS ETF SLI'));
  assert(tradeText.includes('Quantity purchased: 4'));
  assert(tradeText.includes('Price per unit: CHF 221.80'));
  assert(tradeText.includes('Total cost: CHF 887.20'));
  assert(tradeText.includes('Cost in CHF including commission: CHF 888.70'));
  assert(tradeText.includes('Resulting total held: 4'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
