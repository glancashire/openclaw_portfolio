'use strict';

// Phase L2.B — daily-loss circuit breaker tests.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  ensureBaseline,
  readBaseline,
  evaluateDailyLossCircuitBreaker,
  _baselinePath,
} = require('../src/execution/dailyLossCircuitBreaker');

let passed = 0;
function check(cond, msg) {
  assert.ok(cond, msg);
  passed += 1;
}

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'daily-loss-'));
}

const NOW = new Date('2026-07-28T10:00:00Z');
const LATER = new Date('2026-07-28T15:00:00Z');
const NEXT_DAY = new Date('2026-07-29T09:00:00Z');

// --- baseline capture on first check of the day ---
{
  const rootDir = tmpRoot();
  const b = ensureBaseline({ rootDir, portfolio: 'etf', currentNlvChf: 100000, now: NOW });
  check(b && b.nlvChf === 100000 && b.date === '2026-07-28', 'baseline captured on first check');
  check(fs.existsSync(_baselinePath(rootDir, 'etf')), 'baseline file written');
  // second check same day keeps baseline even if NLV moved
  const b2 = ensureBaseline({ rootDir, portfolio: 'etf', currentNlvChf: 90000, now: LATER });
  check(b2.nlvChf === 100000, 'baseline sticky within same UTC day');
  // new day re-captures
  const b3 = ensureBaseline({ rootDir, portfolio: 'etf', currentNlvChf: 90000, now: NEXT_DAY });
  check(b3.nlvChf === 90000 && b3.date === '2026-07-29', 'baseline re-captured on new UTC day');
}

// --- no baseline + no current: no enforcement, ok ---
{
  const rootDir = tmpRoot();
  const r = evaluateDailyLossCircuitBreaker({ rootDir, portfolio: 'etf', currentNlvChf: undefined, now: NOW, captureBaseline: false });
  check(r.ok === true && r.enforced === false, 'no baseline/current → not enforced, ok');
}

// --- within threshold: ok ---
{
  const rootDir = tmpRoot();
  ensureBaseline({ rootDir, portfolio: 'etf', currentNlvChf: 100000, now: NOW });
  const r = evaluateDailyLossCircuitBreaker({ rootDir, portfolio: 'etf', currentNlvChf: 95000, now: LATER, maxDailyLossPct: 8 });
  check(r.ok === true, '5% drop under 8% threshold → ok');
  check(r.dropPct === 5, `dropPct computed = 5 (got ${r.dropPct})`);
  check(r.dropChf === 5000, `dropChf computed = 5000 (got ${r.dropChf})`);
}

// --- percent threshold breached: blocked ---
{
  const rootDir = tmpRoot();
  ensureBaseline({ rootDir, portfolio: 'etf', currentNlvChf: 100000, now: NOW });
  const r = evaluateDailyLossCircuitBreaker({ rootDir, portfolio: 'etf', currentNlvChf: 90000, now: LATER, maxDailyLossPct: 8 });
  check(r.ok === false, '10% drop over 8% threshold → blocked');
  check(r.code === 'daily_loss_circuit_breaker', 'blocker code set');
  check(r.dropPct === 10, `dropPct = 10 (got ${r.dropPct})`);
  check(/frozen/i.test(r.reason), 'reason mentions transmit freeze');
}

// --- boundary: exactly at threshold trips (>=) ---
{
  const rootDir = tmpRoot();
  ensureBaseline({ rootDir, portfolio: 'etf', currentNlvChf: 100000, now: NOW });
  const r = evaluateDailyLossCircuitBreaker({ rootDir, portfolio: 'etf', currentNlvChf: 92000, now: LATER, maxDailyLossPct: 8 });
  check(r.ok === false, 'exactly 8% drop trips (>=)');
}

// --- absolute CHF threshold breached even if pct is disabled ---
{
  const rootDir = tmpRoot();
  ensureBaseline({ rootDir, portfolio: 'etf', currentNlvChf: 500000, now: NOW });
  const r = evaluateDailyLossCircuitBreaker({ rootDir, portfolio: 'etf', currentNlvChf: 480000, now: LATER, maxDailyLossPct: 0, maxDailyLossChf: 15000 });
  check(r.ok === false, 'CHF 20k drop over CHF 15k floor → blocked');
  check(/CHF/.test(r.reason), 'reason mentions CHF trigger');
}

// --- gain (negative drop): never trips ---
{
  const rootDir = tmpRoot();
  ensureBaseline({ rootDir, portfolio: 'etf', currentNlvChf: 100000, now: NOW });
  const r = evaluateDailyLossCircuitBreaker({ rootDir, portfolio: 'etf', currentNlvChf: 110000, now: LATER, maxDailyLossPct: 8 });
  check(r.ok === true && r.dropChf === -10000, 'intra-day gain never trips breaker');
}

// --- runner integration: breaker blocks the whole basket before any submit ---
{
  const { executeApprovedBasket } = require('../src/execution/basketExecutionRunner');
  const rootDir = tmpRoot();
  const portfolioDir = path.join(rootDir, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  // baseline high, so a low current NLV trips the breaker
  ensureBaseline({ rootDir, portfolio: 'etf', currentNlvChf: 100000, now: NOW });

  // minimal approved envelope store
  const { saveApprovalEnvelope } = require('../src/execution/basketApprovalStore');
  const approvalId = 'test-basket-1';
  saveApprovalEnvelope({
    approvalId,
    portfolio: 'etf',
    expiresAt: new Date(LATER.getTime() + 60 * 60 * 1000).toISOString(),
    legs: [
      { legId: 'L1', instrument: 'XDWE', status: 'approved', action: 'BUY', quantity: 10, limitPrice: 30, currency: 'EUR', maxAttempts: 1 },
    ],
  }, { rootDir, now: NOW });

  let submitted = 0;
  const result = require('../src/execution/basketExecutionRunner').executeApprovedBasket({
    portfolioDir,
    approvalId,
    rootDir,
    now: LATER,
    submitLeg: async () => { submitted += 1; return { ok: true }; },
    safeguardConfig: {
      skipDailyTransmitCap: true, // isolate the L2.B breaker
      currentNlvChf: 88000, // 12% drop
      maxDailyLossPct: 8,
    },
  });
  return result.then((r) => {
    check(submitted === 0, 'no leg submitted when breaker trips');
    check(Array.isArray(r.safeguardBlockers) && r.safeguardBlockers[0].code === 'daily_loss_circuit_breaker', 'runner returns breaker blocker');
    check(r.runState.legs.L1.status === 'blocked', 'leg marked blocked by breaker');
    console.log(JSON.stringify({ ok: true, passed }));
  });
}
