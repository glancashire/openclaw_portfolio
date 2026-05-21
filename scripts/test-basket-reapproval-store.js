const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { saveApprovalEnvelope } = require('../src/execution/basketApprovalStore');
const { evaluateLegPriceDrift, detectBasketPriceDrift } = require('../src/execution/basketReapprovalStore');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'basket-reapproval-'));
process.chdir(dir);

saveApprovalEnvelope({
  approvalId: 'basket-183d',
  portfolio: 'etf',
  createdAt: '2026-05-21T22:00:00Z',
  expiresAt: '2099-05-21T22:00:00Z',
  legs: [
    { legId: 'leg-1', instrument: 'IE00B5BMR087', action: 'BUY', quantity: 2, limitPrice: 689.2, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 2 },
    { legId: 'leg-2', instrument: 'LU0950668870', action: 'BUY', quantity: 14, limitPrice: 40.9, currency: 'EUR', exchange: 'SMART', primaryExchange: 'XETRA', maxAttempts: 1 },
  ],
}, { rootDir: dir });

const within = evaluateLegPriceDrift({ approvedLeg: { limitPrice: 100 }, currentLeg: { limitPrice: 100.4 }, tolerancePct: 0.5 });
assert.strictEqual(within.withinBand, true);
assert.strictEqual(within.stale, false);

const stale = evaluateLegPriceDrift({ approvedLeg: { limitPrice: 100 }, currentLeg: { limitPrice: 101 }, tolerancePct: 0.5 });
assert.strictEqual(stale.withinBand, false);
assert.strictEqual(stale.stale, true);
assert.strictEqual(stale.lowerBound, 99.5);
assert.strictEqual(stale.upperBound, 100.5);

const approvalEnvelope = {
  approvalId: 'basket-183d',
  portfolio: 'etf',
  legs: [
    { legId: 'leg-1', instrument: 'IE00B5BMR087', action: 'BUY', quantity: 2, limitPrice: 689.2 },
    { legId: 'leg-2', instrument: 'LU0950668870', action: 'BUY', quantity: 14, limitPrice: 40.9 },
  ],
};

const drift = detectBasketPriceDrift({
  approvalEnvelope,
  currentLegs: [
    { legId: 'leg-1', limitPrice: 689.8 },
    { legId: 'leg-2', limitPrice: 41.4 },
  ],
  tolerancePct: 0.5,
  now: new Date('2026-05-21T23:00:00Z'),
});

assert.strictEqual(drift.affectedLegCount, 1);
assert.strictEqual(drift.unaffectedLegCount, 1);
assert.strictEqual(drift.affectedLegs[0].legId, 'leg-2');
assert(drift.compactReapproval);
assert(fs.existsSync(drift.compactReapproval.path));
assert.strictEqual(drift.compactReapproval.artifact.legs.length, 1);
assert.strictEqual(drift.compactReapproval.artifact.legs[0].legId, 'leg-2');

console.log(JSON.stringify({ ok: true }, null, 2));
