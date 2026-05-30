'use strict';

// Cost-basis enrichment for portfolio reporting.
//
// Source-of-truth strategy is hybrid:
//   1. Prefer per-instrument cost basis derived from filled buys in trades.md.
//      "Filled" is detected from either an explicit Status containing "filled"
//      or an "Execution reconciliation: broker status Filled, ..., avg fill X"
//      annotation embedded in the trade Reason field. Some trade rows in this
//      repo carry status="inactive"/"planned" while the embedded
//      reconciliation note is the canonical fill record, so we consult both.
//   2. If trades.md provides no cost-basis row for a held instrument, fall
//      back to an IBKR-provided average cost (passed in via the holdings
//      snapshot's `avgCostNative` field where available).
//
// The "all-time profit" anchor is the earliest known cost-basis row for a
// given instrument (we average across all known fills, weighted by quantity).
// Unrealized profit is computed against the *current* held quantity, scaled
// from the average buy price, so a partial cost-basis history still yields a
// representative profit number rather than abandoning the row.

function parseTradeRows(tradesText = '') {
  const lines = String(tradesText || '').split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().startsWith('## Trade Log'));
  if (start === -1) return [];
  const tableLines = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('## ') && tableLines.length) break;
    if (line.startsWith('|')) tableLines.push(line);
  }
  return tableLines.slice(2).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

function parseNumber(value) {
  if (value == null) return null;
  const raw = String(value).trim().replace(/[, ]/g, '');
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

// Extract filled-buy "legs" from the trade log. Each leg represents
// quantity X bought at average price P (native currency).
function extractFilledLegs(tradesText = '') {
  const rows = parseTradeRows(tradesText);
  const legs = [];
  // "Execution reconciliation: broker status Filled, order id 9114,
  //  filled 23, remaining 0, avg fill 39.52, last fill 39.52, ..."
  const reconRegex = /Execution reconciliation:\s*broker status Filled[\s\S]*?filled\s+([0-9]+(?:\.[0-9]+)?)[\s\S]*?avg fill\s+([0-9]+(?:\.[0-9]+)?)/i;

  for (const row of rows) {
    const date = row[0] || '';
    const status = String(row[1] || '').toLowerCase();
    const action = String(row[2] || '').toLowerCase();
    const isin = row[3] || '';
    const name = row[4] || '';
    const limitPrice = parseNumber(row[6]);
    const estChf = parseNumber(row[7]);
    const actualChf = parseNumber(row[8]);
    const reason = row[9] || '';
    const brokerOrderId = row[11] || '';

    if (action !== 'buy') continue;
    if (!isin) continue;

    const recon = reason.match(reconRegex);
    let filledQty = null;
    let avgPrice = null;
    let source = null;

    if (recon) {
      filledQty = parseNumber(recon[1]);
      avgPrice = parseNumber(recon[2]);
      source = 'execution_reconciliation';
    } else if (status.includes('filled') || (actualChf != null && actualChf > 0)) {
      filledQty = parseNumber(row[5]);
      avgPrice = limitPrice;
      source = status.includes('filled') ? 'status_filled' : 'actual_chf_positive';
    } else {
      continue;
    }

    if (!Number.isFinite(filledQty) || filledQty <= 0) continue;
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
      // Try to recover an avg price from estimated/actual CHF if we know quantity.
      if (actualChf && actualChf > 0) {
        avgPrice = actualChf / filledQty; // CHF unit price; caller must know currency
      } else if (estChf && estChf > 0) {
        avgPrice = estChf / filledQty;
      } else {
        continue;
      }
    }

    legs.push({
      date,
      isin,
      name,
      action: 'buy',
      filledQty,
      avgPriceNative: avgPrice,
      actualChf: actualChf || null,
      estimatedChf: estChf || null,
      brokerOrderId,
      source,
    });
  }
  return legs;
}

function aggregateByIsin(legs = [], approvedInstruments = []) {
  const byIsin = new Map();
  for (const leg of legs) {
    if (!byIsin.has(leg.isin)) {
      byIsin.set(leg.isin, {
        isin: leg.isin,
        name: leg.name,
        legs: [],
        totalQty: 0,
        totalCostNative: 0,
        earliestDate: leg.date || null,
      });
    }
    const agg = byIsin.get(leg.isin);
    agg.legs.push(leg);
    agg.totalQty += leg.filledQty;
    agg.totalCostNative += leg.filledQty * leg.avgPriceNative;
    if (leg.date && (!agg.earliestDate || leg.date < agg.earliestDate)) agg.earliestDate = leg.date;
  }
  for (const [isin, agg] of byIsin) {
    const matched = approvedInstruments.find((i) => i.tickerOrIsin === isin) || null;
    agg.matchedInstrument = matched;
    agg.currency = matched?.currency || 'CHF';
    const fxHint = matched?.fxToChfHint;
    agg.fxToChf = Number.isFinite(Number(fxHint)) && Number(fxHint) > 0
      ? Number(fxHint)
      : (agg.currency === 'CHF' ? 1 : null);
    agg.avgPriceNative = agg.totalQty > 0
      ? Number((agg.totalCostNative / agg.totalQty).toFixed(6))
      : null;
    agg.totalCostChf = agg.fxToChf != null
      ? Number((agg.totalCostNative * agg.fxToChf).toFixed(2))
      : null;
  }
  return byIsin;
}

function buildCostBasisIndex({ tradesText = '', approvedInstruments = [] } = {}) {
  const legs = extractFilledLegs(tradesText);
  const byIsin = aggregateByIsin(legs, approvedInstruments);
  // Multi-key lookup so holdings rows that surface conid / ibkr symbol /
  // local symbol / name (rather than ISIN) can still resolve their
  // cost-basis aggregate.
  const byKey = new Map();
  const upper = (v) => String(v || '').trim().toUpperCase();
  for (const [isin, agg] of byIsin) {
    if (isin) byKey.set(upper(isin), agg);
    const inst = agg.matchedInstrument;
    if (inst) {
      if (inst.ibkrConid) byKey.set(upper(inst.ibkrConid), agg);
      if (inst.ibkrSymbol) byKey.set(upper(inst.ibkrSymbol), agg);
      if (inst.ibkrLocalSymbol) byKey.set(upper(inst.ibkrLocalSymbol), agg);
      if (inst.name) byKey.set(upper(inst.name), agg);
    }
    if (agg.name) byKey.set(upper(agg.name), agg);
  }
  return { byIsin, byKey, legs };
}

function lookupCostBasis(index, holdingRow = {}) {
  if (!index || !index.byKey) return null;
  const upper = (v) => String(v || '').trim().toUpperCase();
  const candidates = [
    holdingRow.tickerOrIsin,
    holdingRow.symbol,
    holdingRow.identifier,
    holdingRow.ticker,
    holdingRow.name,
  ].filter(Boolean).map(upper);
  for (const key of candidates) {
    if (index.byKey.has(key)) return index.byKey.get(key);
  }
  return null;
}

function enrichHoldingWithCostBasis(holdingRow = {}, index = null, options = {}) {
  const heldQty = Number(holdingRow.quantity || 0);
  const valueChf = Number(holdingRow.valueChf || 0);
  let costBasisCurrency = null;
  let costBasisNative = null;
  let costBasisChf = null;
  let costBasisSource = null;
  let avgBuyPrice = null;

  const cost = index ? lookupCostBasis(index, holdingRow) : null;
  if (cost && cost.avgPriceNative != null && cost.totalQty > 0 && heldQty > 0) {
    avgBuyPrice = cost.avgPriceNative;
    costBasisCurrency = cost.currency;
    costBasisNative = Number((heldQty * avgBuyPrice).toFixed(4));
    const fx = cost.fxToChf != null ? cost.fxToChf : Number(holdingRow.fxToChf || 1);
    if (Number.isFinite(fx) && fx > 0) {
      costBasisChf = Number((costBasisNative * fx).toFixed(2));
      costBasisSource = 'trades_md';
    }
  }

  // Fallback: IBKR AvgCost from holdings snapshot, if surfaced.
  if (costBasisChf == null && options.avgCostNative != null && Number.isFinite(Number(options.avgCostNative))) {
    avgBuyPrice = Number(options.avgCostNative);
    costBasisCurrency = holdingRow.currency || 'CHF';
    if (heldQty > 0) {
      costBasisNative = Number((heldQty * avgBuyPrice).toFixed(4));
      const fx = Number(holdingRow.fxToChf || (costBasisCurrency === 'CHF' ? 1 : null));
      if (Number.isFinite(fx) && fx > 0) {
        costBasisChf = Number((costBasisNative * fx).toFixed(2));
        costBasisSource = 'ibkr_avg_cost';
      }
    }
  }

  let unrealizedProfitChf = null;
  let unrealizedProfitPct = null;
  if (costBasisChf != null && Number.isFinite(valueChf)) {
    unrealizedProfitChf = Number((valueChf - costBasisChf).toFixed(2));
    if (costBasisChf > 0) {
      unrealizedProfitPct = Number(((unrealizedProfitChf / costBasisChf) * 100).toFixed(2));
    }
  }

  return {
    ...holdingRow,
    costBasisCurrency,
    costBasisNative,
    costBasisChf,
    costBasisSource,
    avgBuyPrice,
    unrealizedProfitChf,
    unrealizedProfitPct,
  };
}

function enrichHoldings({ holdingRows = [], tradesText = '', approvedInstruments = [], avgCostByKey = null } = {}) {
  const index = buildCostBasisIndex({ tradesText, approvedInstruments });
  const enriched = holdingRows.map((row) => {
    const fallback = avgCostByKey
      ? avgCostByKey[String(row.tickerOrIsin || row.symbol || '').toUpperCase()]
      : null;
    return enrichHoldingWithCostBasis(row, index, { avgCostNative: fallback });
  });
  let totalProfitChf = 0;
  let totalCostBasisChf = 0;
  let coveredValueChf = 0;
  let coveredCount = 0;
  for (const row of enriched) {
    if (row.unrealizedProfitChf != null && row.costBasisChf != null) {
      totalProfitChf += row.unrealizedProfitChf;
      totalCostBasisChf += row.costBasisChf;
      coveredValueChf += Number(row.valueChf || 0);
      coveredCount += 1;
    }
  }
  const totals = {
    totalProfitChf: Number(totalProfitChf.toFixed(2)),
    totalCostBasisChf: Number(totalCostBasisChf.toFixed(2)),
    coveredValueChf: Number(coveredValueChf.toFixed(2)),
    coveredCount,
    totalProfitPct: totalCostBasisChf > 0
      ? Number(((totalProfitChf / totalCostBasisChf) * 100).toFixed(2))
      : null,
  };
  return { rows: enriched, totals, index };
}


function buildProfitLossSummary({ holdingRows = [], tradesText = '', approvedInstruments = [], avgCostByKey = null } = {}) {
  const enriched = enrichHoldings({ holdingRows, tradesText, approvedInstruments, avgCostByKey });
  return {
    rows: enriched.rows.map((row) => ({
      tickerOrIsin: row.tickerOrIsin || row.symbol || '',
      symbol: row.symbol || row.tickerOrIsin || '',
      name: row.name || '',
      currency: row.currency || 'CHF',
      quantity: Number(row.quantity || 0),
      valueChf: Number(row.valueChf || 0),
      costBasisChf: row.costBasisChf,
      costBasisSource: row.costBasisSource,
      unrealizedProfitChf: row.unrealizedProfitChf,
      unrealizedProfitPct: row.unrealizedProfitPct,
      quoteSource: row.quoteSource || null,
      quoteQuality: row.quoteQuality || null,
      quoteAsOf: row.quoteAsOf || null,
      quoteNote: row.quoteNote || null,
      quoteTrusted: row.quoteTrusted === true,
    })),
    totals: enriched.totals,
    index: enriched.index,
  };
}

module.exports = {
  parseTradeRows,
  extractFilledLegs,
  aggregateByIsin,
  buildCostBasisIndex,
  lookupCostBasis,
  enrichHoldingWithCostBasis,
  enrichHoldings,
  buildProfitLossSummary,
};
