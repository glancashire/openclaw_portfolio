const { execFileSync } = require('child_process');
const path = require('path');

const checks = [
  'test-portfolio-execution-gates.js',
  'test-trade-state-reconciliation.js',
  'test-order-status-not-found-reconciliation.js',
  'test-runtime-broker-error-state.js',
  'test-interactive-brokers-filled-order-surface.js',
  'test-interactive-brokers-completed-order-surface.js',
  'test-portfolio-order-lifecycle-e2e.js',
  'test-partial-fill-status-inference.js',
  'test-history-snapshot-types.js',
  'test-dashboard-execution-summary.js',
  'test-latest-trade-proposals-dedup.js',
  'test-duplicate-submission-guard.js',
  'test-approval-transition-guard.js',
  'test-stale-proposal-approval-guard.js',
  'test-reject-trade-transition.js',
  'test-open-order-row-list.js',
  'test-resync-idempotent-open-order-filter.js',
  'test-resync-latest-row-only.js',
  'test-first-purchase-sales-approval-gates.js',
  'test-stage-live-order-records-broker-order-id.js',
  'test-cancel-staged-order-reconciliation.js',
];

function run(script) {
  const scriptPath = path.join(process.cwd(), 'scripts', script);
  const args = [scriptPath];
  if (script === 'test-portfolio-execution-gates.js') args.push('portfolio/etf');
  const stdout = execFileSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { script, ok: true, stdout: stdout.trim() };
}

function main() {
  const results = [];
  for (const script of checks) {
    results.push(run(script));
  }
  console.log(JSON.stringify({ ok: true, checks: results.map(({ script, ok }) => ({ script, ok })) }, null, 2));
}

main();
