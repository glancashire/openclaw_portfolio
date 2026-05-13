const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const Module = require('module');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'self-heal-plan-'));
  const portfolioDir = path.join(tempDir, 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-10 09:00:00 | approved | buy | AAA | ETF A | 1 | 10 | 10 | 0 | test | approved |  |  |  |  |  |\n| 2026-05-10 09:05:00 | inactive | buy | BBB | ETF B | 1 | 10 | 10 | 0 | test | queued_for_open_runner |  | exchange_closed_at_submit | closed | 2026-05-10 09:05:10 | retry |\n`);
  fs.mkdirSync(path.join(tempDir, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [9107] }, null, 2));

  const target = path.resolve(process.cwd(), 'src/execution/portfolioHealth.js');
  const original = Module._load;
  delete require.cache[target];
  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return { getInteractiveBrokersReadiness: async () => ({ fallbackRequired: true, reachable: false, authenticated: false, message: 'gateway down' }) };
    }
    if (request.endsWith('../reporting/deliveryPolicy') || request === '../reporting/deliveryPolicy') {
      return { reportDeliveryStatus: () => ({ pendingActions: ['delivery backlog'] }) };
    }
    return original.apply(this, arguments);
  };
  try {
    const { buildSelfHealPlan } = require(target);
    const result = await buildSelfHealPlan({ portfolioDir, repoRoot: tempDir });
    assert.strictEqual(result.dryRun, true);
    assert.strictEqual(result.health.health, 'blocked');
    assert(result.actions.some((entry) => /reconcile-live/i.test(entry.command || '')));
    assert(result.actions.some((entry) => /requeue-open|delivery/i.test(entry.command || '')));
    assert(result.health.recommendedActions.some((entry) => /native IBKR connectivity/i.test(entry)));
    console.log(JSON.stringify({ ok: true, actionCount: result.actions.length }, null, 2));
  } finally {
    Module._load = original;
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
