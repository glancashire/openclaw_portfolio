const assert = require('assert');
const { renderCockpitPage } = require('../src/reporting/summaryArtifacts');

(function main() {
  const html = renderCockpitPage({
    dailySummary: {
      healthHeadline: 'warning',
      cashWaitingToDeployChf: 5000,
      brokerHealth: 'degraded',
      biggestDrift: { assetClass: 'Global equities', driftPct: -60 },
    },
    approvalsQueue: { itemCount: 1 },
    reportHistory: { totalReports: 3 },
    summaries: [
      { portfolio: 'etf', status: { health: 'warning' } },
    ],
    deliveryOverview: {
      portfolios: [
        {
          portfolio: 'etf',
          deliveryPosture: {
            brokerBlockContext: {
              blockedTradeCount: 1,
              topBrokerBlock: {
                tickerOrIsin: 'IE000XZSV718',
                name: 'SPYL',
                blockCode: 'exchange_closed_at_submit',
                blockReason: 'Broker rejected the order because the target exchange was closed at submission time.',
                nextAction: 'Retry during the venue trading session or hand the row back to the market-open runner.',
              },
            },
          },
        },
      ],
    },
  });

  assert(html.includes('Delivery Broker Blocks'), 'expected delivery broker blocks section');
  assert(html.includes('<strong>etf</strong>: [exchange_closed_at_submit] IE000XZSV718 — SPYL'), 'expected broker block summary row');
  assert(html.includes('Reason: Broker rejected the order because the target exchange was closed at submission time.'), 'expected broker block reason');
  assert(html.includes('Next action: Retry during the venue trading session or hand the row back to the market-open runner.'), 'expected broker block next action');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
