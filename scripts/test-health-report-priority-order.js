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

  assert(markdown.indexOf('## Immediate status') < markdown.indexOf('## Unresolved exceptions'), 'expected immediate status before unresolved exceptions');
  assert(markdown.indexOf('## Unresolved exceptions') < markdown.indexOf('## Recommended next actions'), 'expected exceptions before recommended next actions');
  assert(markdown.indexOf('## Recommended next actions') < markdown.indexOf('## Remediated during this run'), 'expected next actions before remediated section');
  assert(markdown.indexOf('## Remediated during this run') < markdown.indexOf('## Remaining status and reference details'), 'expected remediated section before reference details');
  assert(markdown.includes('regenerate_dashboard'));
  assert(markdown.includes('write failed'));
  assert(markdown.includes('Restore broker connectivity first.'));

  assert(html.includes('Immediate status'));
  assert(html.includes('Unresolved exceptions'));
  assert(html.includes('Recommended next actions'));
  assert(html.includes('Remediated during this run'));
  assert(html.includes('Remaining status and reference details'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
