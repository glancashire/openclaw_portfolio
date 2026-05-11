const assert = require('assert');
const {
  renderPortfolioSummaryMarkdown,
} = require('../src/reporting/summaryArtifacts');

(function main() {
  const markdown = renderPortfolioSummaryMarkdown({
    portfolio: 'etf',
    generatedAt: '2026-05-11T10:00:00.000Z',
    status: {
      health: 'warning',
      strategy: 'active',
      brokerHealth: 'degraded',
      executionPosture: 'blocked',
      deliveryPosture: 'ready',
      dataFreshness: 'current',
    },
    explanations: {
      biggestDrift: 'Global equities are below target.',
      executionBlock: 'Execution is blocked by a broker-side rejection.',
      approvalBacklog: 'No approval backlog.',
      noTradePosture: 'Trade posture is live.',
    },
    holdings: {
      totalValueChf: 10000,
      cashChf: 1000,
      investedChf: 9000,
      holdingCount: 3,
      lastSyncAt: '2026-05-11T09:59:00.000Z',
      latestSnapshotDate: '2026-05-11',
    },
    recommendedNextStep: 'Retry during the venue trading session or hand the row back to the market-open runner.',
    operatorQueue: {
      summary: { total: 1, blocking: 1, approvals: 0, openRunnerQueue: 0, openRunnerRetry: 0, recovery: 1, warnings: 0 },
      items: [
        {
          queueType: 'execution_block',
          status: 'blocked',
          severity: 'high',
          summary: 'SPYL was blocked by the broker.',
          recommendedOperatorAction: 'Retry during the venue trading session.',
        },
      ],
    },
    blockers: {
      items: [{ severity: 'high', message: 'Broker rejected SPYL because the exchange was closed at submission time.' }],
    },
    approvals: {
      proposedCount: 1,
      approvedCount: 1,
      pendingApprovalCount: 0,
    },
    execution: {
      tradeState: { queuedForOpenRunner: 0, blocked: 1 },
      openRunnerRetryState: { queuedRetry: 0 },
      inFlightCount: 0,
      failedCount: 0,
      blockedRows: [
        {
          tickerOrIsin: 'IE000XZSV718',
          name: 'SPYL',
          blockCode: 'exchange_closed_at_submit',
          blockReason: 'Broker rejected the order because the target exchange was closed at submission time.',
          nextAction: 'Retry during the venue trading session or hand the row back to the market-open runner.',
          brokerOrderId: '9105',
        },
      ],
    },
    observability: {
      eventsPresent: true,
      recentSummary: {
        total: 3,
        blockedTrades: 1,
        openRunnerQueueEvents: 0,
        openRunnerRetryEvents: 0,
        degradedBrokerEvents: 1,
        staleDataEvents: 0,
      },
    },
    allocation: [],
    instruments: [],
    recentMaterialEvents: [],
    readiness: null,
  });

  assert(markdown.includes('## Broker Block Details'), 'expected broker block details section');
  assert(markdown.includes('[exchange_closed_at_submit] IE000XZSV718 — SPYL'), 'expected broker block row label');
  assert(markdown.includes('Reason: Broker rejected the order because the target exchange was closed at submission time.'), 'expected broker block reason');
  assert(markdown.includes('Next action: Retry during the venue trading session or hand the row back to the market-open runner.'), 'expected broker block next action');
  assert(markdown.includes('Broker order id: 9105'), 'expected broker order id');

  console.log(JSON.stringify({ ok: true }));
})();
