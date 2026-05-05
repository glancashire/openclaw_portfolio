const { formatReport } = require('../src/reporting/reportGenerator');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const report = formatReport({
    portfolioName: 'demo',
    period: 'weekly',
    start: '2026-05-01',
    end: '2026-05-05',
    generated: '2026-05-05T12:00:00.000Z',
    trades: [],
    latestSnapshot: {
      totalValue: '5000',
      cash: '4000',
      dailyChange: '0',
      dailyChangePct: '0',
    },
    executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
    brokerReadiness: { fallbackRequired: false, message: 'healthy' },
    lifecycleSummary: {
      proposed: 1,
      approved: 1,
      staged: 2,
      submitted: 3,
      partiallyFilled: 4,
      filled: 5,
      cancelled: 6,
      failed: 7,
      withBrokerOrderId: 8,
    },
  });

  assert(report.includes('- Staged: 2'), 'Expected staged lifecycle count in report');
  assert(report.includes('- Submitted: 3'), 'Expected submitted lifecycle count in report');
  assert(report.includes('- In-flight orders: yes') || report.includes('In-flight orders: yes'), 'Expected staged orders to count as inflight');
  assert(report.includes('Reconcile in-flight orders before approving overlapping new plans or revising allocations.'), 'Expected staged inflight orders to drive reconciliation guidance');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
