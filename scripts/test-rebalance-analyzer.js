#!/usr/bin/env node
'use strict';

/*
 * Tests for lib/rebalanceAnalyzer.js
 *
 * Covers:
 *   - On-target portfolio: zero drift, no actions.
 *   - Single overweight leg (today's actual SPMCHA 2× state).
 *   - Cash-only portfolio: every leg underweight; no_sell needs cash for full deploy.
 *   - FX warnings surfaced.
 *   - Targets-do-not-sum-to-100 warning.
 *   - Min-trade-size honoured (skip with reason).
 *   - Snapshot test on the actual 2026-05-26 ETF portfolio state.
 */

const assert = require('assert');
const { computeRebalancePlan } = require('../lib/rebalanceAnalyzer');

let passed = 0;
function ok(label) { passed += 1; console.log(`  ok — ${label}`); }

// Standard ETF targets (mirrors portfolio/etf/portfolio.md)
const ETF_TARGETS = [
  { symbol: 'SXR8',     targetPct: 40 },  // Global equities (S&P 500)
  { symbol: 'EMUAA',    targetPct: 20 },  // Global equities (EMU)
  { symbol: 'UBSSLI',   targetPct: 12 },  // Swiss equities
  { symbol: 'SPMCHA',   targetPct: 8 },   // Swiss mid
  { symbol: 'CASH-CHF', targetPct: 20 },
];

// === 1. On-target portfolio ===
{
  const netLiq = 50000;
  const holdings = [
    { symbol: 'SXR8',   valueChf: netLiq * 0.40, currency: 'EUR' },
    { symbol: 'EMUAA',  valueChf: netLiq * 0.20, currency: 'EUR' },
    { symbol: 'UBSSLI', valueChf: netLiq * 0.12, currency: 'CHF' },
    { symbol: 'SPMCHA', valueChf: netLiq * 0.08, currency: 'CHF' },
  ];
  const cashChf = netLiq * 0.20;
  const plan = computeRebalancePlan({ holdings, targets: ETF_TARGETS, cashChf, fxRates: { EUR: 0.96 } });

  assert.strictEqual(plan.totals.netLiqChf, netLiq);
  for (const leg of plan.legs) {
    assert(Math.abs(leg.driftPct) < 0.01, `leg ${leg.symbol} drift should be ~0, got ${leg.driftPct}`);
    assert.strictEqual(leg.status, 'on_target', `leg ${leg.symbol} should be on_target`);
  }
  assert.strictEqual(plan.scenarios.no_sell.actions.filter((a) => a.action !== 'SKIP').length, 0);
  assert.strictEqual(plan.scenarios.full_to_target.actions.filter((a) => a.action !== 'SKIP').length, 0);
  assert.strictEqual(plan.scenarios.no_sell.cashNeededChf, 0);
  ok('on-target portfolio: zero drift, no actions');
}

// === 2. Single overweight (SPMCHA at ~2× target) ===
{
  // Mirrors today's state: SPMCHA at 16% (2× target 8%), other legs lighter.
  const netLiq = 50000;
  const holdings = [
    { symbol: 'SXR8',   valueChf: 18500, currency: 'EUR' },  // 37%, target 40 → +1500 buy
    { symbol: 'EMUAA',  valueChf:  9500, currency: 'EUR' },  // 19%, target 20 → +500 buy
    { symbol: 'UBSSLI', valueChf:  6000, currency: 'CHF' },  // 12%, target 12 → on target
    { symbol: 'SPMCHA', valueChf:  8000, currency: 'CHF' },  // 16%, target 8 → -4000 sell
  ];
  const cashChf = 8000;  // 16%, target 20 → +2000 needed
  const plan = computeRebalancePlan({ holdings, targets: ETF_TARGETS, cashChf, fxRates: { EUR: 0.96 } });

  const spmcha = plan.legs.find((l) => l.symbol === 'SPMCHA');
  assert.strictEqual(spmcha.status, 'over');
  assert(spmcha.driftPct > 7.9 && spmcha.driftPct < 8.1, `SPMCHA drift ~+8pp, got ${spmcha.driftPct}`);
  assert(spmcha.gapChf < -3900 && spmcha.gapChf > -4100, `SPMCHA gap ~-4000, got ${spmcha.gapChf}`);

  // Scenario 2 must SELL SPMCHA.
  const sellAction = plan.scenarios.sell_overshoot.actions.find((a) => a.symbol === 'SPMCHA' && a.action === 'SELL');
  assert(sellAction, 'sell_overshoot must contain a SELL for SPMCHA');
  assert(sellAction.amountChf > 3900 && sellAction.amountChf < 4100,
    `SELL amount ~4000 CHF, got ${sellAction.amountChf}`);

  // No sell scenario must NOT trim SPMCHA, and must report the cash-need to buy underweights.
  const noSellSpmcha = plan.scenarios.no_sell.actions.find((a) => a.symbol === 'SPMCHA');
  assert(!noSellSpmcha || noSellSpmcha.action !== 'SELL', 'no_sell must not sell anything');
  ok('overweight SPMCHA: scenario 2 trims, scenario 1 leaves it alone');
}

// === 3. Cash-only portfolio: full deploy needed ===
{
  const plan = computeRebalancePlan({
    holdings: [],
    targets: ETF_TARGETS,
    cashChf: 100000,
    fxRates: { EUR: 0.96 },
  });
  // Every invested leg is underweight; cash leg is overweight (~80pp over).
  const investLegs = plan.legs.filter((l) => l.symbol !== 'CASH-CHF');
  for (const l of investLegs) assert(l.status === 'under', `${l.symbol} should be under`);

  // no_sell scenario should be able to deploy because cash is way above floor.
  // Total to invest = 80% of 100k = 80k. Cash above floor = 100k - 20k = 80k. Should fit exactly.
  assert.strictEqual(plan.scenarios.no_sell.cashNeededChf, 0);
  // full_to_target same since no overweight invested legs.
  assert.strictEqual(plan.scenarios.full_to_target.cashNeededChf, 0);
  // sells in scenario 2 should be 0 (no overshoots in invested legs).
  assert.strictEqual(plan.scenarios.sell_overshoot.sellsChf, 0);
  ok('cash-only portfolio: full deploy fits within cash above floor');
}

// === 4. FX-rate missing surfaces a warning ===
{
  const plan = computeRebalancePlan({
    holdings: [{ symbol: 'SXR8', valueChf: 1000, currency: 'EUR' }],
    targets: ETF_TARGETS,
    cashChf: 9000,
    fxRates: {}, // none
  });
  const w = plan.warnings.find((x) => x.code === 'FX_RATE_MISSING');
  assert(w, 'must warn on missing EUR FX rate');
  assert(/EUR/.test(w.message));
  ok('FX-rate missing: warning surfaces');
}

// === 5. Targets do not sum to 100 ===
{
  const badTargets = [
    { symbol: 'A', targetPct: 30 },
    { symbol: 'B', targetPct: 30 },
    { symbol: 'CASH-CHF', targetPct: 30 },
  ]; // sums to 90, not 100
  const plan = computeRebalancePlan({
    holdings: [{ symbol: 'A', valueChf: 30, currency: 'CHF' }, { symbol: 'B', valueChf: 30, currency: 'CHF' }],
    targets: badTargets,
    cashChf: 30,
  });
  assert(plan.warnings.find((w) => w.code === 'TARGETS_DO_NOT_SUM_TO_100'));
  ok('targets that do not sum to 100: warning surfaces');
}

// === 6. Min-trade-size honoured ===
{
  // Tiny gaps below minTradeChf must be SKIP'd.
  const netLiq = 50000;
  const holdings = [
    { symbol: 'SXR8',   valueChf: netLiq * 0.40 - 100, currency: 'EUR' }, // -100 gap (under target by 100 chf)
    { symbol: 'EMUAA',  valueChf: netLiq * 0.20,        currency: 'EUR' },
    { symbol: 'UBSSLI', valueChf: netLiq * 0.12,        currency: 'CHF' },
    { symbol: 'SPMCHA', valueChf: netLiq * 0.08,        currency: 'CHF' },
  ];
  const cashChf = netLiq * 0.20 + 100; // tiny excess
  const plan = computeRebalancePlan({ holdings, targets: ETF_TARGETS, cashChf, minTradeChf: 500 });
  const sxr8Action = plan.scenarios.no_sell.actions.find((a) => a.symbol === 'SXR8');
  assert(sxr8Action && sxr8Action.action === 'SKIP', 'tiny gap should be SKIP');
  assert.strictEqual(sxr8Action.reason, 'below_min_trade');
  ok('min-trade-size honoured: tiny gaps SKIP\'d with reason');
}

// === 7. Snapshot test on actual 2026-05-26 portfolio ===
// Uses avg-cost CHF values from holdings.md verbatim.
{
  const holdings = [
    { symbol: 'SPMCHA', valueChf: 8262.29,  currency: 'CHF' },  // 64 shares
    { symbol: 'UBSSLI', valueChf: 6165.43,  currency: 'CHF' },  // 38 shares (CHSPI native ticker)
    { symbol: 'EMUAA',  valueChf: 10309.10, currency: 'EUR' },
    { symbol: 'SXR8',   valueChf: 20782.50, currency: 'EUR' },
  ];
  const cashChf = 7153.87;
  const plan = computeRebalancePlan({
    holdings,
    targets: ETF_TARGETS,
    cashChf,
    fxRates: { EUR: 0.96 },
  });

  // NetLiq
  assert(Math.abs(plan.totals.netLiqChf - 52673.19) < 0.01, `netLiq ~52673, got ${plan.totals.netLiqChf}`);

  // SPMCHA must be over (currently 15.69%, target 8 → ~+7.7pp drift, gap ~-4047 CHF).
  const spmcha = plan.legs.find((l) => l.symbol === 'SPMCHA');
  assert(spmcha.driftPct > 7.5 && spmcha.driftPct < 8.0, `SPMCHA drift ~+7.7pp, got ${spmcha.driftPct}`);
  assert(spmcha.status === 'over');

  // SXR8 must be under (currently 39.5%, target 40 → small drift but probably below min-trade after rounding;
  // confirm direction).
  const sxr8 = plan.legs.find((l) => l.symbol === 'SXR8');
  assert(sxr8.actualPct < 40);

  // EMUAA must be under (currently 19.6%).
  const emuaa = plan.legs.find((l) => l.symbol === 'EMUAA');
  assert(emuaa.actualPct < 20);

  // UBSSLI must be on-target-ish (currently ~11.7%).
  const ubsli = plan.legs.find((l) => l.symbol === 'UBSSLI');
  assert(ubsli.actualPct > 11 && ubsli.actualPct < 13);

  // Cash must be under (currently ~13.6%, target 20).
  const cash = plan.legs.find((l) => l.symbol === 'CASH-CHF');
  assert(cash.driftPct < 0, 'cash leg should be under target (we deployed too much earlier today)');

  // Scenario 1 (no-sell): we have only ~7,154 CHF cash but target floor is ~10,535,
  // so deployable = 0 and ALL underweight buys must be reported as cash-needed.
  const s1 = plan.scenarios.no_sell;
  assert(s1.cashNeededChf > 0, 'no_sell must report cash-needed > 0 (cash already below floor)');

  // Scenario 2 (sell-overshoot): SPMCHA sell ~4047 CHF + cash above floor = 0 → ~4047 deployable.
  // Total buy need ~5400 CHF (SXR8 + EMUAA + cash gap covered by sells).
  // Should report some residual cashNeeded (less than scenario 1).
  const s2 = plan.scenarios.sell_overshoot;
  assert(s2.cashNeededChf < s1.cashNeededChf, 'sell-overshoot must need less cash than no-sell');
  assert(s2.sellsChf > 3900 && s2.sellsChf < 4100, `s2 sells ~4047 CHF, got ${s2.sellsChf}`);

  // Scenario 3 (full to target): leftoverDriftPp must be ~0.
  const s3 = plan.scenarios.full_to_target;
  assert(s3.leftoverDriftPp === 0);

  ok('snapshot: 2026-05-26 ETF state computes expected directions and magnitudes');
}

console.log(JSON.stringify({ ok: true, asserted: passed }));
