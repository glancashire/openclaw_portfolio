const assert = require('assert');
const { buildHealthReportMarkdown, buildHealthReportHtml } = require('../src/reporting/healthReport');

(function main() {
  const report = {
    portfolio: 'etf',
    generatedAt: '2026-05-16T09:00:00.000Z',
    health: {
      health: 'blocked',
      severity: 'high',
      blockers: [
        { code: 'broker_unready', message: 'Broker connectivity is degraded.' },
        { code: 'delivery_attention', message: 'Delivery posture needs operator review.' },
      ],
      recommendedActions: [
        'Restore broker connectivity first.',
        'Review delivery exceptions after broker recovery.',
      ],
      nextAction: 'Restore broker connectivity first.',
    },
    before: {
      deliveryStatus: { pendingActions: ['Delivery posture needs operator review.'] },
      generatedStateIssues: [{ severity: 'warning', message: 'Dashboard freshness warning.' }],
      fillNotificationState: { reconciledUnnotifiedFills: [9107], acknowledgedBackfilledFills: [] },
    },
    after: {
      deliveryStatus: { pendingActions: ['Delivery posture needs operator review.'] },
      generatedStateIssues: [{ severity: 'warning', message: 'Dashboard freshness warning.' }],
      fillNotificationState: { reconciledUnnotifiedFills: [9107], acknowledgedBackfilledFills: [] },
    },
    selfHeal: {
      dryRun: false,
      plannedActions: [],
      actions: [
        { kind: 'regenerate_dashboard', ok: true, dashboardPath: '/tmp/dashboard.md' },
        { kind: 'regenerate_reporting_artifacts', ok: false, error: 'write failed' },
      ],
    },
    trends: {
      direction: 'worsening',
      summary: 'Health direction is worsening: 1 of the last 2 checks was blocked and the latest run is still blocked.',
    },
  };

  const markdown = buildHealthReportMarkdown(report);
  const html = buildHealthReportHtml(report);

  assert(markdown.indexOf('## Management summary') < markdown.indexOf('## What matters now'), 'expected management summary before action section');
  assert(markdown.indexOf('## What matters now') < markdown.indexOf('## Health direction'), 'expected action section before health direction');
  assert(markdown.indexOf('## Health direction') < markdown.indexOf('## Remaining status and reference details'), 'expected health direction before reference details');
  assert(markdown.includes('Restore broker connectivity first.'));
  assert(markdown.includes('What the system already handled'));
  assert(markdown.includes('Health direction is worsening'));
  assert(markdown.includes('write failed'));
  assert(!markdown.includes('What still needs you'));
  assert(!markdown.includes('Recent trends'));

  assert(html.includes('Management summary'));
  assert(html.includes('What matters now'));
  assert(html.includes('What the system already handled'));
  assert(html.includes('Health direction'));
  assert(html.includes('Remaining status and reference details'));
  assert(!html.includes('What still needs you'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
