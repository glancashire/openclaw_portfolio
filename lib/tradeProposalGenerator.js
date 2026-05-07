'use strict';

/**
 * Trade proposal generator.
 * Given drift analysis and prices, generates trades to reduce drift.
 */

const { validateTradeList } = require('./etfQualityFilter');

const MIN_TRADE_CHF = 500;
const CASH_RESERVE_CHF = 1000;
const CASH_RESERVE_PCT = 20;

/**
 * Generate trade proposals to reduce portfolio drift.
 * @param {object} opts
 * @param {object} opts.drift - Output from analyzeDrift()
 * @param {object} opts.prices - { symbol: { price, currency, exchange } }
 * @param {number} [opts.minTradeChf] - Minimum trade size
 * @param {number} [opts.cashReserveChf] - Minimum cash to keep
 * @returns {object} { trades: [...], summary: {...} }
 */
function generateProposal({ drift, prices, minTradeChf = MIN_TRADE_CHF, cashReserveChf = CASH_RESERVE_CHF }) {
  const trades = [];
  const { totalValue, cashChf, allocations } = drift;

  // Available cash for deployment (above reserve)
  const deployable = Math.max(0, cashChf - cashReserveChf);

  // Find underweight instruments (need buying)
  const underweight = allocations
    .filter(a => a.symbol !== '_CASH' && a.driftPct < -drift.driftThreshold)
    .sort((a, b) => a.driftPct - b.driftPct); // Most underweight first

  if (underweight.length === 0) {
    return {
      trades: [],
      summary: {
        reason: 'balanced',
        message: 'Portfolio is within drift threshold. No trades needed.',
        maxDrift: drift.maxDrift,
      },
    };
  }

  if (deployable < minTradeChf) {
    return {
      trades: [],
      summary: {
        reason: 'skip',
        message: `Deployable cash (CHF ${deployable.toFixed(2)}) below minimum trade size (CHF ${minTradeChf})`,
        deployable,
        cashReserve: cashReserveChf,
      },
    };
  }

  // Distribute deployable cash proportionally to drift
  let remaining = deployable;
  const totalDrift = underweight.reduce((sum, a) => sum + Math.abs(a.driftPct), 0);

  for (const alloc of underweight) {
    if (remaining < minTradeChf) break;

    const price = prices[alloc.symbol];
    if (!price) continue;

    // Proportional share of deployable cash
    const share = (Math.abs(alloc.driftPct) / totalDrift) * deployable;
    const tradeAmount = Math.min(share, remaining);

    if (tradeAmount < minTradeChf) continue;

    // Calculate quantity
    const qty = Math.floor(tradeAmount / price.price);
    if (qty < 1) continue;

    const cost = qty * price.price;
    if (cost < minTradeChf) continue;

    trades.push({
      symbol: alloc.symbol,
      name: alloc.name,
      action: 'BUY',
      qty,
      price: price.price,
      currency: price.currency,
      exchange: price.exchange || 'EBS',
      costChf: cost,
      allocBefore: alloc.actualPct,
      allocAfter: ((alloc.actualValue + cost) / totalValue) * 100,
      driftBefore: alloc.driftPct,
    });

    remaining -= cost;
  }

  // Validate quality
  const validation = validateTradeList(trades);
  if (!validation.allPass) {
    const failing = validation.results.filter(r => !r.pass);
    return {
      trades: [],
      summary: {
        reason: 'quality_fail',
        message: `ETF quality filter rejected: ${failing.map(f => f.symbol).join(', ')}`,
        failures: failing,
      },
    };
  }

  const totalDeployed = trades.reduce((sum, t) => sum + t.costChf, 0);

  return {
    trades,
    summary: {
      reason: 'rebalance',
      message: `${trades.length} trade(s) proposed to reduce drift`,
      totalDeployed,
      remainingCash: cashChf - totalDeployed,
      cashReserveOk: (cashChf - totalDeployed) >= cashReserveChf,
    },
  };
}

module.exports = { generateProposal, MIN_TRADE_CHF, CASH_RESERVE_CHF };
