const { formatReport, narrativeSummary, formatGenerationStatus } = require('../src/reporting/reportGenerator');

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
  });

  for (const section of ['## Executive Summary', '## Performance', '## Allocation Review', '## Trades During Period', '## Strategy Compliance', '## Freshness', '## Generation Status', '## Execution Lifecycle', '## Execution Plan', '## What Worked', '## What Did Not Work', '## Recommended Changes', '## Next Actions']) {
    assert(report.includes(section), `Expected section ${section}`);
  }

  assert(report.includes('There are in-flight execution states that still need reconciliation attention.'), 'Expected consistent inflight narrative');
  assert(report.includes('- PDF mode: stub'), 'Expected generation status section');
  assert(report.includes('Report rendering required fallback handling: render mode stub'), 'Expected fallback warning in What Did Not Work');

  const summary = narrativeSummary({
    latestSnapshot: { totalValue: '5000', cash: '4000' },
    brokerReadiness: { fallbackRequired: true, message: 'gateway unavailable' },
    lifecycleSummary: { staged: 0, submitted: 0, partiallyFilled: 0 },
    freshness: { stale: true },
    generationMeta,
  });
  assert(/Dashboard freshness is stale/i.test(summary), 'Expected stale freshness narrative');
  assert(/Broker readiness is degraded: gateway unavailable/i.test(summary), 'Expected degraded readiness narrative');

  const generationStatus = formatGenerationStatus(generationMeta);
  assert(/Render warning: render mode stub/i.test(generationStatus), 'Expected render warning line');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
