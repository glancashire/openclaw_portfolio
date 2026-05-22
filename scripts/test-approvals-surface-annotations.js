'use strict';

/* Phase 203 — surface envelope annotations in approvals queue / pending reproposals. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const realRoot = path.resolve(__dirname, '..');
const { listPendingReproposals, listLatestPendingReproposals, describeReproposalItem } = require(path.join(realRoot, 'src/reporting/reproposalSurface'));

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p203-'));
  const dir = path.join(root, 'runtime', 'basket-reproposals', 'etf');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(root, 'runtime', 'approved-order-baskets', 'etf'), { recursive: true });

  // Reproposal envelope WITH new annotations (Phase 200/202 outputs)
  const env1 = {
    schemaVersion: '1.0',
    portfolio: 'etf',
    approvalId: 'basket-etf-x-reproposal-1',
    parentApprovalId: 'basket-etf-x',
    reproposalVersion: 1,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'pending_user_approval',
    legs: [
      { legId: 'leg-1', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', action: 'BUY', quantity: 19, limitPrice: 130.5, currency: 'CHF', previousLimit: 129, quoteQuality: { tier: 'stale_only', missingFields: ['ask','bid','liveLast'], observedFields: { close: 128.5 } } },
    ],
    requiresOperatorAttention: true,
    quoteQualitySummary: { tiers: { stale_only: 1 }, attentionLegIds: ['leg-1'] },
    currencyDeployment: { CHF: 2479.5 },
  };
  fs.writeFileSync(path.join(dir, 'basket-etf-x-reproposal-1.json'), JSON.stringify(env1, null, 2));

  // Reproposal envelope WITHOUT new annotations (older format) — must still work, fields null/false
  const env2 = {
    schemaVersion: '1.0',
    portfolio: 'etf',
    approvalId: 'basket-etf-y-reproposal-1',
    parentApprovalId: 'basket-etf-y',
    reproposalVersion: 1,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'pending_user_approval',
    legs: [
      { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8', action: 'BUY', quantity: 2, limitPrice: 691, currency: 'EUR', previousLimit: 689 },
    ],
  };
  fs.writeFileSync(path.join(dir, 'basket-etf-y-reproposal-1.json'), JSON.stringify(env2, null, 2));

  // ── listPendingReproposals exposes the new fields ──
  const items = listPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(items.length, 2);
  const itemX = items.find((i) => i.approvalId === 'basket-etf-x-reproposal-1');
  assert.strictEqual(itemX.requiresOperatorAttention, true);
  assert.deepStrictEqual(itemX.currencyDeployment, { CHF: 2479.5 });
  assert.strictEqual(itemX.quoteQualitySummary.tiers.stale_only, 1);
  const itemY = items.find((i) => i.approvalId === 'basket-etf-y-reproposal-1');
  assert.strictEqual(itemY.requiresOperatorAttention, false);
  assert.strictEqual(itemY.currencyDeployment, null);
  assert.strictEqual(itemY.quoteQualitySummary, null);

  // ── describeReproposalItem includes the new fields ──
  const surfaceX = describeReproposalItem({ portfolio: 'etf', reproposal: itemX });
  assert.strictEqual(surfaceX.requiresOperatorAttention, true);
  assert.deepStrictEqual(surfaceX.currencyDeployment, { CHF: 2479.5 });
  assert(surfaceX.quoteQualitySummary);

  const surfaceY = describeReproposalItem({ portfolio: 'etf', reproposal: itemY });
  assert.strictEqual(surfaceY.requiresOperatorAttention, false);
  assert.strictEqual(surfaceY.currencyDeployment, null);
  assert.strictEqual(surfaceY.quoteQualitySummary, null);

  // ── latestOnly filter passes through annotations ──
  const latest = listLatestPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(latest.length, 2);
  for (const item of latest) {
    assert('requiresOperatorAttention' in item);
    assert('quoteQualitySummary' in item);
    assert('currencyDeployment' in item);
  }

  console.log(JSON.stringify({ ok: true, testsPassed: 3 }));
})().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
