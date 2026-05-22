'use strict';

/* Phase 190 — buildReproposalForCancelledLegs unit + integration tests. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildReproposalForCancelledLegs,
  computeBumpedLimitPrice,
  roundToTick,
  isSwissIsin,
  pickTick,
} = require('../src/execution/basketReproposalBuilder');

(async () => {
  // Unit: roundToTick
  assert.strictEqual(roundToTick(129.27, 0.05), 129.30);
  assert.strictEqual(roundToTick(129.30, 0.05), 129.30);
  assert.strictEqual(roundToTick(129.31, 0.05), 129.35);
  assert.strictEqual(roundToTick(40.7408, 0.01), 40.75);
  assert.strictEqual(roundToTick(40.75, 0.01), 40.75);

  // Unit: isSwissIsin
  assert.strictEqual(isSwissIsin('CH0130595124'), true);
  assert.strictEqual(isSwissIsin('IE00B5BMR087'), false);
  assert.strictEqual(isSwissIsin(''), false);
  assert.strictEqual(isSwissIsin(null), false);

  // Unit: pickTick
  assert.strictEqual(pickTick({ instrument: 'CH0130595124', currency: 'CHF' }), 0.05);
  assert.strictEqual(pickTick({ instrument: 'IE00B5BMR087', currency: 'EUR' }), 0.01);
  assert.strictEqual(pickTick({ instrument: 'LU0950668870', currency: 'EUR' }), 0.01);

  // Unit: computeBumpedLimitPrice
  // Ask available: 0.5% over ask, rounded up to 0.05 tick
  const swissBump = computeBumpedLimitPrice({ ask: 128.50, lastClose: 128.50, previousLimit: 129.00, tick: 0.05 });
  assert(swissBump > 129.00, `swiss bump must exceed previous 129.00, got ${swissBump}`);
  assert(swissBump <= 130.00, `swiss bump should be reasonable, got ${swissBump}`);

  // No ask: use lastClose × 1.0075
  const closeOnlyBump = computeBumpedLimitPrice({ ask: NaN, lastClose: 128.50, previousLimit: 129.00, tick: 0.05 });
  assert(closeOnlyBump > 129.00, `close-only bump must exceed previous 129.00, got ${closeOnlyBump}`);

  // Both missing: fall back to previousLimit × 1.005
  const fallbackBump = computeBumpedLimitPrice({ ask: NaN, lastClose: NaN, previousLimit: 129.00, tick: 0.05 });
  assert(fallbackBump > 129.00, 'fallback must exceed previous limit');

  // No info at all
  const nothing = computeBumpedLimitPrice({ ask: NaN, lastClose: NaN, previousLimit: NaN, tick: 0.05 });
  assert.strictEqual(nothing, null);

  // EUR instrument
  const eurBump = computeBumpedLimitPrice({ ask: 691.18, lastClose: 687.28, previousLimit: 692.50, tick: 0.01 });
  assert(eurBump > 692.50, `EUR bump must exceed previous 692.50, got ${eurBump}`);

  // Integration: build full reproposal envelope
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reprop-'));
  const runState = {
    legs: {
      'leg-1': { legId: 'leg-1', instrument: 'IE00B5BMR087', status: 'filled', brokerOrderId: 9124, fillQuantity: 16, avgFillPrice: 691.04 },
      'leg-2': { legId: 'leg-2', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', conid: '91639399', status: 'cancelled', brokerOrderId: 9127 },
    },
  };
  const originalEnvelope = {
    legs: [
      { legId: 'leg-1', instrument: 'IE00B5BMR087', limitPrice: 692.50 },
      { legId: 'leg-2', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', conid: '91639399', action: 'BUY', quantity: 19, limitPrice: 129.00, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS' },
    ],
  };
  const quoteFn = async (conid) => {
    if (Number(conid) === 91639399) return { ask: NaN, lastClose: 128.50, last: 128.50 };
    return null;
  };
  const result = await buildReproposalForCancelledLegs({
    portfolio: 'etf',
    approvalId: 'basket-etf-test',
    runState,
    originalEnvelope,
    quoteFn,
    rootDir: dir,
    now: '2026-05-22T11:00:00Z',
  });
  assert.strictEqual(result.skipped, false);
  assert.strictEqual(result.version, 1);
  assert(fs.existsSync(result.path), 'reproposal file should exist');
  const envelope = JSON.parse(fs.readFileSync(result.path, 'utf8'));
  assert.strictEqual(envelope.parentApprovalId, 'basket-etf-test');
  assert.strictEqual(envelope.approvalId, 'basket-etf-test-reproposal-1');
  assert.strictEqual(envelope.reproposalVersion, 1);
  assert.strictEqual(envelope.legs.length, 1, 'only cancelled leg should appear');
  assert.strictEqual(envelope.legs[0].instrument, 'CH0130595124');
  assert(envelope.legs[0].limitPrice > 129.00, `reproposal limit must exceed 129.00, got ${envelope.legs[0].limitPrice}`);
  assert.strictEqual(envelope.legs[0].previousLimit, 129.00);
  assert.strictEqual(envelope.legs[0].status, 'pending_user_approval');

  // Versioning: a second build increments version
  const result2 = await buildReproposalForCancelledLegs({
    portfolio: 'etf',
    approvalId: 'basket-etf-test',
    runState,
    originalEnvelope,
    quoteFn,
    rootDir: dir,
    now: '2026-05-22T11:05:00Z',
  });
  assert.strictEqual(result2.version, 2);
  assert(result2.path !== result.path, 'second reproposal should land at a new path');

  // No cancelled legs => skipped
  const allFilled = { legs: { 'leg-1': { status: 'filled' } } };
  const skip = await buildReproposalForCancelledLegs({ portfolio: 'etf', approvalId: 'x', runState: allFilled, originalEnvelope, quoteFn, rootDir: dir });
  assert.strictEqual(skip.skipped, true);
  assert.strictEqual(skip.reason, 'no_cancelled_legs');

  // Quote function failure does not crash; leg gets needs_manual_review
  const badQuote = async () => { throw new Error('feed dead'); };
  const result3 = await buildReproposalForCancelledLegs({ portfolio: 'etf', approvalId: 'basket-y', runState, originalEnvelope, quoteFn: badQuote, rootDir: dir });
  // With bad quote we still have previousLimit fallback path so leg should be priced, not flagged
  const env3 = JSON.parse(fs.readFileSync(result3.path, 'utf8'));
  assert(env3.legs[0].limitPrice > 129.00, 'fallback to previousLimit × 1.005 should still produce a valid bumped price');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
