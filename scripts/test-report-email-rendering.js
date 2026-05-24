const assert = require('assert');
const { buildReportEmailHtml, buildReportEmailText } = require('../src/reporting/reportEmail');

(function main() {
  const summary = {
    holdings: {
      totalValueChf: 12000,
      investedChf: 10000,
      cashChf: 2000,
      holdingCount: 2,
      latestSnapshotDate: '2026-05-24',
      lastSyncAt: '2026-05-24 09:00:00',
      baseCurrency: 'CHF',
    },
    investorHoldings: {
      totals: {
        totalValueChf: 12000,
        totalGainChf: 800,
        totalGainPct: 7.3,
        rowCount: 2,
      },
      rows: [
        {
          symbol: 'VT',
          name: 'Vanguard Total World Stock ETF',
          quantityHeld: 5,
          averageBuyPrice: 190,
          lastTradedPrice: 210,
          totalValue: 1050,
          gainSincePurchasePct: 10.5,
          ytdPct: 4.2,
          valueChf: 1050,
          gainSincePurchaseChf: 100,
          availability: { averageBuyPrice: 'available', gainSincePurchaseChf: 'available', ytd: 'available' },
        },
        {
          symbol: 'CHSPI',
          name: 'iShares Core SPI',
          quantityHeld: 10,
          averageBuyPrice: null,
          lastTradedPrice: 98,
          totalValue: 980,
          gainSincePurchasePct: null,
          ytdPct: null,
          valueChf: 980,
          gainSincePurchaseChf: null,
          availability: { averageBuyPrice: 'missing', gainSincePurchaseChf: 'missing', ytd: 'missing' },
        },
      ],
    },
    status: {
      health: 'healthy',
      executionPosture: 'ready',
      brokerHealth: 'ready',
      brokerMessage: 'Broker connectivity healthy',
    },
    recommendedNextStep: 'Add gradually to the underweight global equity position while keeping some CHF cash in reserve.',
  };

  const html = buildReportEmailHtml({
    portfolioName: 'etf',
    period: 'summary',
    summaryHtml: '<p>detail</p>',
    summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: summary.recommendedNextStep,
  });

  assert(html.includes('Held instruments'));
  assert(html.includes('Vanguard Total World Stock ETF'));
  assert(html.includes('iShares Core SPI'));
  assert(html.includes('Average buy price'));
  assert(html.includes('Latest price'));
  assert(html.includes('Gain since purchase'));
  assert(html.includes('Next step to improve the portfolio'));
  assert(html.includes('What matters now'));
  assert(html.includes('Total held instruments'));
  assert(html.includes('Cost basis unavailable'));
  assert(html.includes('YTD unavailable'));

  const text = buildReportEmailText({
    portfolioName: 'etf',
    period: 'summary',
    summaryMarkdown: '# Details',
    summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: summary.recommendedNextStep,
  });

  assert(text.includes('Held instruments'));
  assert(text.includes('VT — Vanguard Total World Stock ETF'));
  assert(text.includes('Average buy price: CHF 190.00'));
  assert(text.includes('Average buy price: unavailable'));
  assert(text.includes('Next step to improve the portfolio'));
  assert(text.includes('What matters now: Add gradually to the underweight global equity position while keeping some CHF cash in reserve.'));
  assert(text.includes('Total held instruments: 2'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
