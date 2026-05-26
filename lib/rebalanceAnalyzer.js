'use strict';

/**
 * lib/rebalanceAnalyzer.js
 *
 * Pure-function rebalance analyzer.
 *
 * Computes drift, gaps, and three rebalance scenarios:
 *   1. no_sell      — buy under-weighted legs only; reports cash NEEDED.
 *   2. sell_overshoot — trim over-weighted legs back to target, redeploy
 *                       proceeds into under-weighted legs.
 *   3. full_to_target — bring every leg exactly to target weight.
 *
 * Inputs:
 *   holdings:  [{ symbol, valueChf, currency }]
 *   targets:   [{ symbol, targetPct, minPct, maxPct }] (from portfolio.md)
 *              MUST include the cash sleeve as { symbol: 'CASH-CHF', ... }.
 *   cashChf:   number (current cash in CHF)
 *   minTradeChf: number (default 500 — gaps below this are dropped)
 *   fxRates:   { EUR: 0.96, USD: 0.88, ... } — optional, used for warnings only.
 *
 * Output:
 *   {
 *     totals: { netLiqChf, investedChf, cashChf },
 *     legs:   [{ symbol, valueChf, actualPct, targetPct, driftPct, gapChf, status }],
 *     scenarios: {
 *       no_sell:        { actions[], cashNeededChf, freeCashUsedChf, leftoverDriftPp },
 *       sell_overshoot: { actions[], cashNeededChf, sellsChf, buysChf, leftoverDriftPp },
 *       full_to_target: { actions[], cashNeededChf, sellsChf, buysChf, leftoverDriftPp },
 *     },
 *     warnings: [{ code, message, symbol? }],
 *   }
 */

const DEFAULTS = Object.freeze({
  minTradeChf: 500,
});

/**
 * Compute a complete rebalance plan.
 *
 * @param {object} params
 * @param {Array<{symbol:string, valueChf:number, currency?:string}>} params.holdings
 * @param {Array<{symbol:string, targetPct:number, minPct?:number, maxPct?:number}>} params.targets
 *        Must include a CASH sleeve (symbol === 'CASH-CHF').
 * @param {number} params.cashChf
 * @param {number} [params.minTradeChf]
 * @param {object} [params.fxRates] — { CCY: rateToChf }
 * @returns {object} plan
 */
function computeRebalancePlan({
  holdings = [],
  targets = [],
  cashChf = 0,
  minTradeChf = DEFAULTS.minTradeChf,
  fxRates = null,
} = {}) {
  if (!Array.isArray(holdings)) throw new TypeError('holdings must be an array');
  if (!Array.isArray(targets) || targets.length === 0) throw new TypeError('targets must be a non-empty array');

  const warnings = [];

  // --- Totals ---
  const investedChf = holdings.reduce((s, h) => s + Number(h.valueChf || 0), 0);
  const netLiqChf = investedChf + Number(cashChf || 0);

  if (netLiqChf <= 0) {
    return {
      totals: { netLiqChf, investedChf, cashChf },
      legs: [],
      scenarios: emptyScenarios(),
      warnings: [{ code: 'EMPTY_PORTFOLIO', message: 'NetLiq is zero or negative; cannot compute rebalance.' }],
    };
  }

  const targetSumPct = targets.reduce((s, t) => s + Number(t.targetPct || 0), 0);
  if (Math.abs(targetSumPct - 100) > 0.5) {
    warnings.push({
      code: 'TARGETS_DO_NOT_SUM_TO_100',
      message: `Target weights sum to ${targetSumPct.toFixed(2)}% (expected ~100%).`,
    });
  }

  // --- FX-missing warnings for non-CHF holdings without a rate ---
  const rates = fxRates || {};
  const fxSeen = new Set();
  for (const h of holdings) {
    const ccy = (h.currency || 'CHF').toUpperCase();
    if (ccy !== 'CHF' && !fxSeen.has(ccy)) {
      fxSeen.add(ccy);
      if (!Number.isFinite(Number(rates[ccy]))) {
        warnings.push({
          code: 'FX_RATE_MISSING',
          message: `No FX rate provided for ${ccy}; valuations may be off if holdings.md was priced at avg cost.`,
          symbol: h.symbol,
        });
      }
    }
  }

  // --- Build per-leg drift for INVESTED targets only (cash handled separately) ---
  const cashTarget = targets.find((t) => t.symbol === 'CASH-CHF') || { symbol: 'CASH-CHF', targetPct: 0 };
  const investTargets = targets.filter((t) => t.symbol !== 'CASH-CHF');

  const legs = investTargets.map((t) => {
    const h = holdings.find((x) => x.symbol === t.symbol) || { symbol: t.symbol, valueChf: 0, currency: 'CHF' };
    const valueChf = Number(h.valueChf || 0);
    const actualPct = round((valueChf / netLiqChf) * 100, 2);
    const targetPct = Number(t.targetPct || 0);
    const driftPct = round(actualPct - targetPct, 2);
    const targetValueChf = round((targetPct / 100) * netLiqChf, 2);
    const gapChf = round(targetValueChf - valueChf, 2); // +ve = need to BUY, -ve = need to SELL
    const status = driftPct > 1e-9 ? 'over' : driftPct < -1e-9 ? 'under' : 'on_target';
    return { symbol: t.symbol, valueChf: round(valueChf, 2), actualPct, targetPct, driftPct, targetValueChf, gapChf, status, currency: h.currency || 'CHF' };
  });

  // Cash leg (target vs actual)
  const cashActualPct = round((cashChf / netLiqChf) * 100, 2);
  const cashTargetPct = Number(cashTarget.targetPct || 0);
  const cashTargetValueChf = round((cashTargetPct / 100) * netLiqChf, 2);
  const cashLeg = {
    symbol: 'CASH-CHF',
    valueChf: round(cashChf, 2),
    actualPct: cashActualPct,
    targetPct: cashTargetPct,
    driftPct: round(cashActualPct - cashTargetPct, 2),
    targetValueChf: cashTargetValueChf,
    gapChf: round(cashTargetValueChf - cashChf, 2),
    status: cashActualPct > cashTargetPct ? 'over' : cashActualPct < cashTargetPct ? 'under' : 'on_target',
    currency: 'CHF',
  };

  // --- Scenarios ---
  const scenarios = {
    no_sell:        scenarioNoSell({ legs, cashChf, minTradeChf, cashTargetValueChf }),
    sell_overshoot: scenarioSellOvershoot({ legs, cashChf, minTradeChf, cashTargetValueChf }),
    full_to_target: scenarioFullToTarget({ legs, cashChf, minTradeChf, cashTargetValueChf }),
  };

  return {
    totals: { netLiqChf: round(netLiqChf, 2), investedChf: round(investedChf, 2), cashChf: round(cashChf, 2) },
    legs: [...legs, cashLeg],
    scenarios,
    warnings,
  };
}

// ---- Scenario implementations ----

function scenarioNoSell({ legs, cashChf, minTradeChf, cashTargetValueChf }) {
  // Buy each underweight leg up to target. Bounded by available cash above the cash-target floor.
  const underweight = legs.filter((l) => l.gapChf > 0);
  const totalBuyChf = underweight.reduce((s, l) => s + l.gapChf, 0);

  // Cash we are willing to spend = current cash - cash floor (target cash). Don't go below floor.
  const deployable = Math.max(0, cashChf - cashTargetValueChf);

  const actions = [];
  let buysChf = 0;
  if (totalBuyChf <= deployable) {
    for (const l of underweight) {
      if (Math.abs(l.gapChf) < minTradeChf) {
        actions.push({ symbol: l.symbol, action: 'SKIP', amountChf: 0, reason: 'below_min_trade', gapChf: l.gapChf });
        continue;
      }
      actions.push({ symbol: l.symbol, action: 'BUY', amountChf: round(l.gapChf, 2) });
      buysChf += l.gapChf;
    }
  } else {
    // Pro-rate buys to fit available cash.
    const scale = totalBuyChf > 0 ? deployable / totalBuyChf : 0;
    for (const l of underweight) {
      const scaledChf = l.gapChf * scale;
      if (scaledChf < minTradeChf) {
        actions.push({ symbol: l.symbol, action: 'SKIP', amountChf: 0, reason: 'below_min_trade_after_scale', gapChf: l.gapChf, scaledChf: round(scaledChf, 2) });
        continue;
      }
      actions.push({ symbol: l.symbol, action: 'BUY', amountChf: round(scaledChf, 2), note: 'pro_rated_to_available_cash' });
      buysChf += scaledChf;
    }
  }

  const cashNeededChf = Math.max(0, round(totalBuyChf - deployable, 2));
  const leftoverDriftPp = computeLeftoverDrift(legs, actions);

  return {
    label: 'No-sell — buy underweight legs only',
    actions,
    cashNeededChf,
    cashAvailableForDeploy: round(deployable, 2),
    sellsChf: 0,
    buysChf: round(buysChf, 2),
    leftoverDriftPp,
  };
}

function scenarioSellOvershoot({ legs, cashChf, minTradeChf, cashTargetValueChf }) {
  // Sell legs whose gap is negative (overweight). Use proceeds + (cash above floor) to buy underweight legs.
  const overweight = legs.filter((l) => l.gapChf < 0);
  const underweight = legs.filter((l) => l.gapChf > 0);

  const actions = [];
  let sellsChf = 0;
  for (const l of overweight) {
    const sellChf = -l.gapChf; // positive
    if (sellChf < minTradeChf) {
      actions.push({ symbol: l.symbol, action: 'SKIP', amountChf: 0, reason: 'below_min_trade', gapChf: l.gapChf });
      continue;
    }
    actions.push({ symbol: l.symbol, action: 'SELL', amountChf: round(sellChf, 2) });
    sellsChf += sellChf;
  }

  const totalBuyChf = underweight.reduce((s, l) => s + l.gapChf, 0);
  const cashAboveFloor = Math.max(0, cashChf - cashTargetValueChf);
  const deployable = sellsChf + cashAboveFloor;

  let buysChf = 0;
  if (totalBuyChf <= deployable) {
    for (const l of underweight) {
      if (l.gapChf < minTradeChf) {
        actions.push({ symbol: l.symbol, action: 'SKIP', amountChf: 0, reason: 'below_min_trade', gapChf: l.gapChf });
        continue;
      }
      actions.push({ symbol: l.symbol, action: 'BUY', amountChf: round(l.gapChf, 2) });
      buysChf += l.gapChf;
    }
  } else {
    const scale = totalBuyChf > 0 ? deployable / totalBuyChf : 0;
    for (const l of underweight) {
      const scaledChf = l.gapChf * scale;
      if (scaledChf < minTradeChf) {
        actions.push({ symbol: l.symbol, action: 'SKIP', amountChf: 0, reason: 'below_min_trade_after_scale', gapChf: l.gapChf, scaledChf: round(scaledChf, 2) });
        continue;
      }
      actions.push({ symbol: l.symbol, action: 'BUY', amountChf: round(scaledChf, 2), note: 'pro_rated_to_available_cash_plus_sells' });
      buysChf += scaledChf;
    }
  }

  const cashNeededChf = Math.max(0, round(totalBuyChf - deployable, 2));
  const leftoverDriftPp = computeLeftoverDrift(legs, actions);

  return {
    label: 'Sell-overshoot — trim overweight, redeploy into underweight',
    actions,
    cashNeededChf,
    cashAvailableForDeploy: round(cashAboveFloor + sellsChf, 2),
    sellsChf: round(sellsChf, 2),
    buysChf: round(buysChf, 2),
    leftoverDriftPp,
  };
}

function scenarioFullToTarget({ legs, cashChf, minTradeChf, cashTargetValueChf }) {
  // Equivalent to sell_overshoot in our two-sided gap model — but we always
  // execute every gap above min-trade-size, regardless of cash arithmetic.
  // Net cash impact reported.
  const actions = [];
  let sellsChf = 0;
  let buysChf = 0;
  for (const l of legs) {
    if (Math.abs(l.gapChf) < minTradeChf) {
      if (Math.abs(l.driftPct) > 0.05) {
        actions.push({ symbol: l.symbol, action: 'SKIP', amountChf: 0, reason: 'below_min_trade', gapChf: l.gapChf });
      }
      continue;
    }
    if (l.gapChf > 0) {
      actions.push({ symbol: l.symbol, action: 'BUY',  amountChf: round(l.gapChf, 2) });
      buysChf += l.gapChf;
    } else {
      actions.push({ symbol: l.symbol, action: 'SELL', amountChf: round(-l.gapChf, 2) });
      sellsChf += -l.gapChf;
    }
  }
  const cashAboveFloor = Math.max(0, cashChf - cashTargetValueChf);
  const cashNeededChf = Math.max(0, round(buysChf - sellsChf - cashAboveFloor, 2));
  const leftoverDriftPp = 0; // by definition every actionable gap is closed

  return {
    label: 'Full to target — sell every overweight, buy every underweight',
    actions,
    cashNeededChf,
    cashAvailableForDeploy: round(cashAboveFloor + sellsChf, 2),
    sellsChf: round(sellsChf, 2),
    buysChf: round(buysChf, 2),
    leftoverDriftPp,
  };
}

function computeLeftoverDrift(legs, actions) {
  // Sum of |drift| in pp that the proposed actions don't close.
  const actionMap = new Map();
  for (const a of actions) {
    if (a.action === 'BUY') actionMap.set(a.symbol, (actionMap.get(a.symbol) || 0) + a.amountChf);
    if (a.action === 'SELL') actionMap.set(a.symbol, (actionMap.get(a.symbol) || 0) - a.amountChf);
  }
  let leftover = 0;
  for (const l of legs) {
    const applied = actionMap.get(l.symbol) || 0;
    const remainingGapChf = l.gapChf - applied;
    // Convert remaining CHF gap back to pp by dividing by netliq (each leg has same denominator).
    if (l.targetPct === 0 && Math.abs(remainingGapChf) < 1e-9) continue;
    // Approx: pp = remainingGapChf / netLiq * 100. Each leg's pp leftover.
    // We don't have netLiq directly here — derive: targetValueChf / targetPct * 100 = netLiq, when targetPct > 0.
    if (l.targetPct > 0) {
      const netLiq = (l.targetValueChf / l.targetPct) * 100;
      leftover += Math.abs(remainingGapChf / netLiq * 100);
    }
  }
  return round(leftover, 2);
}

function emptyScenarios() {
  return {
    no_sell:        { label: 'No-sell',        actions: [], cashNeededChf: 0, sellsChf: 0, buysChf: 0, leftoverDriftPp: 0 },
    sell_overshoot: { label: 'Sell-overshoot', actions: [], cashNeededChf: 0, sellsChf: 0, buysChf: 0, leftoverDriftPp: 0 },
    full_to_target: { label: 'Full to target', actions: [], cashNeededChf: 0, sellsChf: 0, buysChf: 0, leftoverDriftPp: 0 },
  };
}

function round(n, dp = 2) {
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

module.exports = { computeRebalancePlan, DEFAULTS };
