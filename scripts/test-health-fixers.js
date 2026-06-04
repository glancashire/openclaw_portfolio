'use strict';

/**
 * Unit tests for src/reporting/healthFixers.js
 *
 * Strategy: for each fixer, stub the underlying side-effect helpers via the
 * fixersOverride parameter on runSecondPassFixers. This keeps the test
 * hermetic — no IBKR, no shell-out, no filesystem writes outside the tmp dir.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  runSecondPassFixers,
  pickFixerKey,
  HARD_EXCLUDED_CODES,
  RATE_LIMIT_MS,
} = require('../src/reporting/healthFixers');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok --', label);
  asserted++;
}

function makeTmpPortfolio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'healthfixers-'));
  const portfolioDir = path.join(root, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  return { root, portfolioDir };
}

// ── pickFixerKey: blocker → fixer mapping ────────────────────────────────────

{
  ok('pickFixerKey: null blocker → null', pickFixerKey(null) === null);
  ok('pickFixerKey: missing code → null', pickFixerKey({}) === null);
  ok('pickFixerKey: broker_unready → broker_unready', pickFixerKey({ code: 'broker_unready' }) === 'broker_unready');
  ok('pickFixerKey: fill_notification_backfill', pickFixerKey({ code: 'fill_notification_backfill' }) === 'fill_notification_backfill');
  ok('pickFixerKey: delivery_freshness_stale', pickFixerKey({ code: 'delivery_freshness_stale' }) === 'delivery_freshness_stale');
  ok('pickFixerKey: delivery_attention + reconcile message → reconcile fixer',
    pickFixerKey({ code: 'delivery_attention', message: '5 trade row(s) are submitted with no broker confirmation — run sync-portfolio-order-status to reconcile.' }) === 'delivery_attention_reconcile');
  ok('pickFixerKey: delivery_attention + freshness message → dashboard fixer',
    pickFixerKey({ code: 'delivery_attention', message: 'dashboard freshness is stale' }) === 'delivery_attention_dashboard');
  ok('pickFixerKey: delivery_attention + unknown message → null',
    pickFixerKey({ code: 'delivery_attention', message: 'something completely different' }) === null);
  ok('pickFixerKey: random unknown code → null', pickFixerKey({ code: 'totally_made_up' }) === null);
}

// ── HARD_EXCLUDED_CODES are skipped ──────────────────────────────────────────

(async function testHardExcluded() {
  const { portfolioDir } = makeTmpPortfolio();
  const stubFixer = {
    fixer: async () => ({ ok: true, detail: 'should not have been called' }),
    label: 'should not run',
  };
  // Inject a fake fixer matching broker_automation_paused — must still be skipped.
  const report = { health: { blockers: [{ code: 'broker_automation_paused', message: 'paused' }] } };
  const result = await runSecondPassFixers({
    report, portfolioDir,
    fixersOverride: { broker_automation_paused: stubFixer },
  });
  ok('hard-excluded: attempted=0', result.attempted.length === 0);
  ok('hard-excluded: skipped includes hard_excluded reason', result.skipped.some((s) => s.reason === 'hard_excluded' && s.code === 'broker_automation_paused'));
  ok('hard-excluded: HARD_EXCLUDED_CODES contains broker_automation_paused', HARD_EXCLUDED_CODES.has('broker_automation_paused'));
})();

// ── No fixer in whitelist → skipped, not error ──────────────────────────────

(async function testNoFixer() {
  const { portfolioDir } = makeTmpPortfolio();
  const report = { health: { blockers: [{ code: 'totally_unknown_blocker', message: 'mystery' }] } };
  const result = await runSecondPassFixers({ report, portfolioDir });
  ok('no-fixer: attempted=0', result.attempted.length === 0);
  ok('no-fixer: skipped reason no_fixer_in_whitelist', result.skipped.some((s) => s.reason === 'no_fixer_in_whitelist'));
})();

// ── Empty blockers → no-op ───────────────────────────────────────────────────

(async function testEmpty() {
  const { portfolioDir } = makeTmpPortfolio();
  const result = await runSecondPassFixers({ report: { health: { blockers: [] } }, portfolioDir });
  ok('empty: attempted=0', result.attempted.length === 0);
  ok('empty: rateLimited=0', result.rateLimited.length === 0);
  ok('empty: skipped=0', result.skipped.length === 0);
})();

// ── Successful fixer runs and persists rate state ────────────────────────────

(async function testSuccess() {
  const { portfolioDir } = makeTmpPortfolio();
  let calls = 0;
  const fixer = {
    fixer: async () => { calls++; return { ok: true, detail: 'fixed it' }; },
    label: 'test fixer',
  };
  const report = { health: { blockers: [{ code: 'broker_unready', message: 'broker offline' }] } };
  const result = await runSecondPassFixers({
    report, portfolioDir,
    fixersOverride: { broker_unready: fixer },
  });
  ok('success: fixer invoked once', calls === 1);
  ok('success: attempted has 1 entry', result.attempted.length === 1);
  ok('success: attempted entry ok=true', result.attempted[0].ok === true);
  ok('success: attempted entry has durationMs', typeof result.attempted[0].durationMs === 'number');
  ok('success: detail propagated', result.attempted[0].detail === 'fixed it');
  ok('success: rate state file written', fs.existsSync(path.join(portfolioDir, 'health-pass2-rate.json')));
  const rateState = JSON.parse(fs.readFileSync(path.join(portfolioDir, 'health-pass2-rate.json'), 'utf8'));
  ok('success: rate state has timestamp for fixerKey', typeof rateState.broker_unready === 'number' && rateState.broker_unready > 0);
})();

// ── Rate-limited: second call within 24h is suppressed ──────────────────────

(async function testRateLimit() {
  const { portfolioDir } = makeTmpPortfolio();
  let calls = 0;
  const fixer = {
    fixer: async () => { calls++; return { ok: true }; },
    label: 'rate test',
  };
  const report = { health: { blockers: [{ code: 'broker_unready', message: 'still down' }] } };
  await runSecondPassFixers({ report, portfolioDir, fixersOverride: { broker_unready: fixer } });
  const result2 = await runSecondPassFixers({ report, portfolioDir, fixersOverride: { broker_unready: fixer } });
  ok('rate-limit: fixer ran exactly once across two calls', calls === 1);
  ok('rate-limit: second call attempted=0', result2.attempted.length === 0);
  ok('rate-limit: rateLimited has 1 entry', result2.rateLimited.length === 1);
  ok('rate-limit: rateLimited entry has nextEligibleAt', typeof result2.rateLimited[0].nextEligibleAt === 'string');
  ok('rate-limit: RATE_LIMIT_MS = 24h', RATE_LIMIT_MS === 24 * 60 * 60 * 1000);
})();

// ── Rate-limit expires: simulate by passing a `now` 25h later ────────────────

(async function testRateLimitExpiry() {
  const { portfolioDir } = makeTmpPortfolio();
  let calls = 0;
  const fixer = {
    fixer: async () => { calls++; return { ok: true }; },
    label: 'expiry test',
  };
  const report = { health: { blockers: [{ code: 'broker_unready', message: 'flap' }] } };
  await runSecondPassFixers({ report, portfolioDir, fixersOverride: { broker_unready: fixer } });
  const future = new Date(Date.now() + 25 * 3600 * 1000);
  const result2 = await runSecondPassFixers({
    report, portfolioDir, fixersOverride: { broker_unready: fixer }, now: future,
  });
  ok('expiry: fixer ran twice', calls === 2);
  ok('expiry: second call attempted=1', result2.attempted.length === 1);
})();

// ── Fixer that throws is captured as failed attempt, still updates rate ──────

(async function testFixerThrows() {
  const { portfolioDir } = makeTmpPortfolio();
  const fixer = {
    fixer: async () => { throw new Error('kaboom'); },
    label: 'throwing fixer',
  };
  const report = { health: { blockers: [{ code: 'broker_unready', message: 'x' }] } };
  const result = await runSecondPassFixers({ report, portfolioDir, fixersOverride: { broker_unready: fixer } });
  ok('throws: attempted has 1 entry', result.attempted.length === 1);
  ok('throws: ok=false', result.attempted[0].ok === false);
  ok('throws: error message captured', String(result.attempted[0].error).includes('kaboom'));
  ok('throws: rate state still updated (don\'t retry-loop on broken fixer)',
    fs.existsSync(path.join(portfolioDir, 'health-pass2-rate.json')));
})();

// ── Multiple blockers: each gets its own fixer + rate entry ──────────────────

(async function testMultiple() {
  const { portfolioDir } = makeTmpPortfolio();
  let brokerCalls = 0; let backfillCalls = 0;
  const fixers = {
    broker_unready: { fixer: async () => { brokerCalls++; return { ok: true }; }, label: 'broker' },
    fill_notification_backfill: { fixer: async () => { backfillCalls++; return { ok: false, error: 'no fills' }; }, label: 'backfill' },
  };
  const report = { health: { blockers: [
    { code: 'broker_unready', message: '1' },
    { code: 'fill_notification_backfill', message: '2' },
    { code: 'broker_automation_paused', message: 'never' },
    { code: 'unknown_blocker', message: 'meh' },
  ] } };
  const result = await runSecondPassFixers({ report, portfolioDir, fixersOverride: fixers });
  ok('multi: both whitelisted fixers ran', brokerCalls === 1 && backfillCalls === 1);
  ok('multi: attempted=2', result.attempted.length === 2);
  ok('multi: rate state has both entries',
    Object.keys(JSON.parse(fs.readFileSync(path.join(portfolioDir, 'health-pass2-rate.json'), 'utf8'))).length === 2);
  ok('multi: hard_excluded skipped', result.skipped.some((s) => s.reason === 'hard_excluded'));
  ok('multi: unknown blocker skipped no_fixer_in_whitelist', result.skipped.some((s) => s.reason === 'no_fixer_in_whitelist'));
})();

// ── Wait for the async IIFEs to flush, then print summary ─────────────────────

setTimeout(() => {
  console.log('\nhealth-fixers tests: ' + asserted + ' assertions passed');
  if (asserted < 33) {
    console.error('FAIL: expected at least 33 assertions, got ' + asserted);
    process.exit(1);
  }
}, 1500);
