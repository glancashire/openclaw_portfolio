const { formatReport, narrativeSummary, formatGenerationStatus, formatDeliveryStatus, formatPendingActions, formatOperatorQueueSummary, urgencyLabel, deriveRecommendationUrgency, buildIncidentSummary, buildChangeSummary } = require('../src/reporting/reportGenerator');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const generationMeta = {
    markdownWritten: true,
    pdfMode: 'stub',
    pdfPath: '/tmp/demo.pdf',
    htmlPath: null,
    renderWarning: 'render mode stub',
  };

  const deliveryStatus = {
    deliveryMode: 'local_only',
    intendedChannels: ['repo_artifacts'],
    externalDeliveryEnabled: false,
    failureAlertMode: 'local_operator_review',
    failureAlertTargets: ['dashboard', 'markdown_report'],
    overrideLoaded: true,
    ready: false,
    pendingActions: ['Dashboard/report freshness is stale relative to source state.'],
  };

  const report = formatReport({
    portfolioName: 'demo',
    period: 'monthly',
    start: '2026-05-01',
    end: '2026-05-31',
    generated: '2026-05-31T12:00:00.000Z',
    trades: [],
    latestSnapshot: {
      totalValue: '5000',
      cash: '4000',
      dailyChange: '0',
      dailyChangePct: '0',
    },
    executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
    brokerReadiness: { fallbackRequired: false, message: 'healthy' },
    lifecycleSummary: { staged: 1, submitted: 0, partiallyFilled: 0, failed: 0, withBrokerOrderId: 1 },
    freshness: { stale: false, dashboardExists: true, newestSourcePath: 'holdings.md' },
    generationMeta,
    deliveryStatus,
    pendingActions: deliveryStatus.pendingActions,
    previousReportContext: {
      snapshot: { totalValue: 4800, cash: 3900 },
      lifecycleSummary: { proposed: 0, approved: 0, staged: 0, submitted: 0, partiallyFilled: 0 },
      queueSummary: { total: 0, blocking: 0 },
    },
  });

  for (const section of ['## Decision View', '### Executive Summary', '### Incident / Blocker Summary', '### What Changed Since Last Report', '### Recommendation Urgency', '### Recommended Changes', '### Next Actions', '## Audit Detail', '### Performance', '### Allocation Review', '### Trades During Period', '### Strategy Compliance', '### Freshness', '### Delivery Status', '### Operator Queue Summary', '### Pending Operator Actions', '### Generation Status', '### Execution Lifecycle', '### Execution Plan', '### What Worked', '### What Did Not Work']) {
    assert(report.includes(section), `Expected section ${section}`);
  }

  assert(report.includes('There are in-flight execution states that still need reconciliation attention.'), 'Expected consistent inflight narrative');
  assert(report.includes('Reporting delivery posture needs operator attention'), 'Expected delivery readiness narrative');
  assert(report.includes('- PDF mode: stub'), 'Expected generation status section');
  assert(report.includes('- Delivery mode: local_only'), 'Expected delivery status section');
  assert(report.includes('1. [workflow/pending/low] Dashboard/report freshness is stale relative to source state.'), 'Expected pending actions section');
  assert(report.includes('- Total queue items: 1'), 'Expected queue summary section');
  assert(report.includes('Report rendering required fallback handling: render mode stub'), 'Expected fallback warning in What Did Not Work');
  assert(report.includes('- Current urgency: HIGH') || report.includes('- Current urgency: CRITICAL') || report.includes('- Current urgency: MEDIUM'), 'Expected urgency section');
  assert(report.includes('Portfolio value change since previous report'), 'Expected change summary section');
  assert(report.includes('Incident / Blocker Summary'), 'Expected incident summary section');

  const summary = narrativeSummary({
    latestSnapshot: { totalValue: '5000', cash: '4000' },
    brokerReadiness: { fallbackRequired: true, message: 'gateway unavailable' },
    lifecycleSummary: { staged: 0, submitted: 0, partiallyFilled: 0 },
    freshness: { stale: true },
    generationMeta,
    deliveryStatus,
  });
  assert(/Dashboard freshness is stale/i.test(summary), 'Expected stale freshness narrative');
  assert(/Broker readiness is degraded: gateway unavailable/i.test(summary), 'Expected degraded readiness narrative');

  const generationStatus = formatGenerationStatus(generationMeta);
  assert(/Render warning: render mode stub/i.test(generationStatus), 'Expected render warning line');

  const deliverySummary = formatDeliveryStatus(deliveryStatus);
  assert(/Delivery mode: local_only/i.test(deliverySummary), 'Expected delivery mode line');

  const pendingActions = formatPendingActions(['Action one', 'Action two']);
  assert(/1\. Action one/i.test(pendingActions) && /2\. Action two/i.test(pendingActions), 'Expected numbered pending actions');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
