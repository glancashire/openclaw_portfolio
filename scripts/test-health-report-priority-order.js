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
  };

  const markdown = buildHealthReportMarkdown(report);
  const html = buildHealthReportHtml(report);

  assert(markdown.indexOf('## Management summary') < markdown.indexOf('## What needs attention now'), 'expected management summary before attention section');
  assert(markdown.indexOf('## What needs attention now') < markdown.indexOf('## What the system already handled'), 'expected attention section before handled section');
  assert(markdown.indexOf('## What the system already handled') < markdown.indexOf('## Remaining status and reference details'), 'expected handled section before reference details');
  assert(markdown.includes('Restore broker connectivity first.'));
  assert(markdown.includes('What the system already handled'));
  assert(markdown.includes('What still needs you'));
  assert(markdown.includes('write failed'));

  assert(html.includes('Management summary'));
  assert(html.includes('What needs attention now'));
  assert(html.includes('What the system already handled'));
  assert(html.includes('What still needs you'));
  assert(html.includes('Remaining status and reference details'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
