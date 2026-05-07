'use strict';

/**
 * Portfolio drift analyzer.
 * Compares current holdings against target allocations.
 */

const TARGET_ALLOCATIONS = {
  VUSA: { targetPct: 40, name: 'Vanguard S&P 500' },
  SLICHA: { targetPct: 20, name: 'UBS ETF SLI' },
  EMUAA: { targetPct: 20, name: 'UBS MSCI EMU' },
  _CASH: { targetPct: 20, name: 'Cash Reserve' },
};

const DRIFT_THRESHOLD_PCT = 2.0; // Only rebalance if drift > 2%

/**
 * Analyze portfolio drift.
 * @param {object} opts
 * @param {number} opts.totalValue - Total portfolio value in CHF
 * @param {number} opts.cashChf - Current cash in CHF
 * @param {Array} opts.positions - [{ symbol, marketValue }] in CHF
 * @param {object} [opts.targets] - Override target allocations
 * @returns {object} Drift analysis
 */
function analyzeDrift({ totalValue, cashChf, positions, targets }) {
  const alloc = targets || TARGET_ALLOCATIONS;
  const results = [];

  // Calculate actual allocations
  for (const [symbol, target] of Object.entries(alloc)) {
    if (symbol === '_CASH') {
      const actualPct = totalValue > 0 ? (cashChf / totalValue) * 100 : 0;
      results.push({
        symbol: '_CASH',
        name: target.name,
        targetPct: target.targetPct,
        actualPct: Math.round(actualPct * 100) / 100,
        driftPct: Math.round((actualPct - target.targetPct) * 100) / 100,
        actualValue: cashChf,
        targetValue: (target.targetPct / 100) * totalValue,
      });
      continue;
    }

    const pos = positions.find(p => p.symbol === symbol);
    const actualValue = pos ? pos.marketValue : 0;
    const actualPct = totalValue > 0 ? (actualValue / totalValue) * 100 : 0;
    const driftPct = actualPct - target.targetPct;

    results.push({
      symbol,
      name: target.name,
      targetPct: target.targetPct,
      actualPct: Math.round(actualPct * 100) / 100,
      driftPct: Math.round(driftPct * 100) / 100,
      actualValue,
      targetValue: (target.targetPct / 100) * totalValue,
    });
  }

  const needsRebalance = results.filter(r => Math.abs(r.driftPct) > DRIFT_THRESHOLD_PCT && r.symbol !== '_CASH');

  return {
    totalValue,
    cashChf,
    allocations: results,
    needsRebalance,
    maxDrift: Math.max(...results.map(r => Math.abs(r.driftPct))),
    driftThreshold: DRIFT_THRESHOLD_PCT,
  };
}

module.exports = { analyzeDrift, TARGET_ALLOCATIONS, DRIFT_THRESHOLD_PCT };
