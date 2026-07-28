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
    profitLoss: {
      totals: { totalProfitChf: -45.20, totalProfitPct: -0.87, totalCostBasisChf: 5255.59, coveredCount: 2 },
    },
    investorHoldings: {
      rows: [
        { symbol: 'SXR8', name: 'iShares Core S&P 500', quantityHeld: 5, valueChf: 3500, gainSincePurchaseChf: 20, gainSincePurchasePct: 0.6, allocationPct: 67, averageBuyPrice: 696, performanceWindows: { sincePurchase: { availability: 'available', gainChf: 20, gainPct: 0.6 }, last7d: { availability: 'missing_history' }, last30d: { availability: 'missing_history' }, ytd: { availability: 'missing_history' }, last365d: { availability: 'missing_history' } } },
        { symbol: 'CHSPI', name: 'iShares Core SPI', quantityHeld: 10, valueChf: 1710, gainSincePurchaseChf: -65, gainSincePurchasePct: -3.7, allocationPct: 33, averageBuyPrice: 177, performanceWindows: { sincePurchase: { availability: 'available', gainChf: -65, gainPct: -3.7 }, last7d: { availability: 'missing_history' }, last30d: { availability: 'missing_history' }, ytd: { availability: 'missing_history' }, last365d: { availability: 'missing_history' } } },
      ],
      totals: { rowCount: 2, totalValueChf: 5210.39, totalGainChf: -45.20 },
    },
    performance: { portfolio: { windows: { sincePurchase: { availability: 'available', gainChf: -45.2, gainPct: -0.87 }, last7d: { availability: 'missing_history' }, last30d: { availability: 'missing_history' }, ytd: { availability: 'missing_history' }, last365d: { availability: 'missing_history' } } } },
    status: {
      health: 'attention_needed',
      executionPosture: 'ready_for_review',
      brokerHealth: 'healthy',
    },
  };

  // === Report email: HTML ===
  const reportHtml = buildReportEmailHtml({
    portfolioName: 'etf',
    period: 'weekly',
    summary,
    summaryHtml: '<h1>Demo summary</h1><p>Everything looks good.</p>',
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: null,
  });

  // Block 1: Portfolio Value Snapshot (hero card)
  assert(reportHtml.includes('Total portfolio value'), 'HTML has hero label');
  assert(reportHtml.includes('5&#39;327.03') || reportHtml.includes("5'327.03"), 'HTML has total value');
  assert(reportHtml.includes('Cash'), 'HTML has cash');
  assert(reportHtml.includes('116.64'), 'HTML has cash value');
  assert(reportHtml.includes('Invested'), 'HTML has invested');
  assert(reportHtml.includes('5&#39;210.39') || reportHtml.includes("5'210.39"), 'HTML has invested value');

  // Block 2: Profit / Loss strip
  assert(reportHtml.includes('Unrealized Profit'), 'HTML has P/L strip');
  assert(reportHtml.includes('Portfolio value windows (reference only)'), 'HTML has reference value windows section');
  assert(reportHtml.includes('#991b1b') || reportHtml.includes('991b1b'), 'Negative profit uses red');

  // Block 3: Holdings table
  assert(reportHtml.includes('Instrument'), 'HTML has Instrument header');
  assert(reportHtml.includes('Value CHF'), 'HTML has Value CHF header');
  assert(reportHtml.includes('Cost basis CHF'), 'HTML has Cost basis header');
  assert(reportHtml.includes('Since purchase'), 'HTML has since purchase header');
  assert(reportHtml.includes('7d'), 'HTML has 7d header');
  assert(reportHtml.includes('30d'), 'HTML has 30d header');
  assert(reportHtml.includes('YTD'), 'HTML has YTD header');
  assert(reportHtml.includes('365d'), 'HTML has 365d header');
  assert(reportHtml.includes('Weight %'), 'HTML has Weight % header');
  assert(reportHtml.includes('SXR8'), 'HTML has SXR8');
  assert(reportHtml.includes('CHSPI'), 'HTML has CHSPI');
  assert(reportHtml.includes('TOTAL'), 'HTML has sum row');
  assert(reportHtml.includes('100%'), 'HTML sum row has 100%');

  // Removed sections
  assert(!reportHtml.includes('Overall analysis'), 'No Overall analysis section');
  assert(!reportHtml.includes('Core recommendation'), 'No Core recommendation');
  assert(!reportHtml.includes('Improve:'), 'No Improve label');
  assert(!reportHtml.includes('Recommendation'), 'No per-row Recommendation column');
  assert(!reportHtml.includes('Supporting detail'), 'No supporting detail');
  assert(!reportHtml.includes('Demo summary'), 'Raw summary not embedded');

  // Design characteristics
  assert(reportHtml.includes('linear-gradient(135deg'), 'Hero uses gradient');
  assert(reportHtml.includes('#1e293b'), 'Hero uses dark slate');

  // === Report email: Text ===
  const reportText = buildReportEmailText({
    portfolioName: 'etf',
    period: 'weekly',
    summary,
    summaryMarkdown: '# Demo summary',
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: null,
  });

  assert(reportText.includes('Portfolio Value'), 'Text has portfolio value section');
  assert(reportText.includes("Total value: CHF 5'327.03"), 'Text has total value');
  assert(reportText.includes('Cash: CHF 116.64'), 'Text has cash');
  assert(reportText.includes("Invested: CHF 5'210.39"), 'Text has invested');
  assert(reportText.includes('Profit / Loss'), 'Text has P/L section');
  assert(reportText.includes('Portfolio value windows (reference only)'), 'Text has reference value windows section');
  assert(reportText.includes('Holdings'), 'Text has holdings section');
  assert(reportText.includes('SXR8'), 'Text has SXR8');
  assert(reportText.includes('CHSPI'), 'Text has CHSPI');
  assert(reportText.includes('TOTAL'), 'Text has sum row');
  assert(reportText.includes('Weight %'), 'Text has weight header');
  assert(!reportText.includes('Core recommendation'), 'Text has no recommendation');
  assert(!reportText.includes('Demo summary'), 'Text does not embed raw summary');

  // === Trade notification email ===
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
  assert(tradeHtml.includes('Fill summary'));
  assert(tradeHtml.includes('Purchase summary'));
  assert(tradeHtml.includes('Resulting total held'));
  assert(tradeHtml.includes('Cost in CHF including commission'));
  assert(tradeHtml.includes('UBS ETF SLI'));
  assert(tradeHtml.includes('4'));
  assert(tradeHtml.includes('888.70'));
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
