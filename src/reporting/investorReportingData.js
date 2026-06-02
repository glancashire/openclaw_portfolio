'use strict';

function parseNumber(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw || raw === '—' || raw.toLowerCase() === 'unknown' || raw.toLowerCase() === 'n/a') return null;
  const normalized = raw.replace(/'/g, '').replace(/,/g, '').replace(/%/g, '').trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function splitTable(lines, heading = '## Current Holdings') {
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return { headers: [], rows: [] };
  const tableLines = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('## ') && tableLines.length) break;
    if (line.startsWith('|')) tableLines.push(line);
  }
  if (tableLines.length < 2) return { headers: [], rows: [] };
  const headers = tableLines[0].split('|').slice(1, -1).map((cell) => cell.trim());
  const rows = tableLines.slice(2).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
  return { headers, rows };
}

function getField(row, headerMap, candidates = []) {
  for (const key of candidates) {
    const idx = headerMap.get(key.toLowerCase());
    if (idx != null) return row[idx] || '';
  }
  return '';
}

function parseHoldingsTable(holdingsText = '') {
  const lines = String(holdingsText || '').split(/\r?\n/);
  const { headers, rows } = splitTable(lines);
  const headerMap = new Map(headers.map((header, index) => [String(header).toLowerCase(), index]));

  return rows.map((row) => {
    const tickerOrIsin = getField(row, headerMap, ['Ticker / ISIN', 'Ticker', 'Symbol']);
    const name = getField(row, headerMap, ['Name']);
    const quantity = parseNumber(getField(row, headerMap, ['Quantity']));
    const lastPrice = parseNumber(getField(row, headerMap, ['Price', 'Last price', 'Market price']));
    const currency = getField(row, headerMap, ['Currency']) || 'CHF';
    const fxToChf = parseNumber(getField(row, headerMap, ['FX rate to CHF', 'FX rate'])) || (currency === 'CHF' ? 1 : null);
    const valueChf = parseNumber(getField(row, headerMap, ['Value CHF', 'Market value CHF']));
    const allocationPct = parseNumber(getField(row, headerMap, ['Allocation %', 'Weight %']));
    const targetPct = parseNumber(getField(row, headerMap, ['Target %']));
    const driftPct = parseNumber(getField(row, headerMap, ['Drift %']));
    const costBasisChf = parseNumber(getField(row, headerMap, ['Cost basis CHF']));
    const gainSincePurchaseChf = parseNumber(getField(row, headerMap, ['Unrealized P/L CHF']));
    const avgBuyPrice = costBasisChf != null && quantity != null && quantity !== 0
      ? Number((costBasisChf / quantity).toFixed(4))
      : null;

    return {
      tickerOrIsin,
      symbol: tickerOrIsin,
      name,
      quantity,
      lastPrice,
      currency,
      fxToChf,
      valueChf,
      allocationPct,
      targetPct,
      driftPct,
      costBasisChf,
      gainSincePurchaseChf,
      avgBuyPrice,
    };
  }).filter((row) => row.tickerOrIsin || row.name);
}

function firstHistoryValue(historyRows = []) {
  const first = Array.isArray(historyRows) ? historyRows.find((row) => Number.isFinite(Number(row.totalChf))) : null;
  return first ? Number(first.totalChf) : null;
}

function lastHistoryValue(historyRows = []) {
  const rows = Array.isArray(historyRows) ? historyRows.filter((row) => Number.isFinite(Number(row.totalChf))) : [];
  if (!rows.length) return null;
  return Number(rows[rows.length - 1].totalChf);
}

function buildInvestorHoldingsSnapshot({ holdingsText = '', historyRows = [], approvedInstruments = [], profitLossRows = [], totalValueChf = null } = {}) {
  const rows = parseHoldingsTable(holdingsText);
  const ytdStart = firstHistoryValue(historyRows);
  const ytdEnd = lastHistoryValue(historyRows);
  const ytdChf = ytdStart != null && ytdEnd != null ? Number((ytdEnd - ytdStart).toFixed(2)) : null;
  const ytdPct = ytdChf != null && ytdStart ? Number(((ytdChf / ytdStart) * 100).toFixed(1)) : null;
  const profitLossIndex = new Map();
  for (const row of profitLossRows || []) {
    for (const key of [row.tickerOrIsin, row.symbol, row.name]) {
      if (!key) continue;
      profitLossIndex.set(String(key), row);
    }
  }
  const totalValue = Number.isFinite(Number(totalValueChf)) && Number(totalValueChf) > 0
    ? Number(totalValueChf)
    : rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.valueChf)) ? Number(row.valueChf) : 0), 0);

  return {
    rows: rows.map((row) => {
      const matchedInstrument = (approvedInstruments || []).find((instrument) => {
        const candidates = [
          instrument.tickerOrIsin,
          instrument.ibkrConid,
          instrument.ibkrSymbol,
          instrument.ibkrLocalSymbol,
        ].filter(Boolean).map((value) => String(value));
        return candidates.includes(String(row.symbol || '')) || candidates.includes(String(row.name || '')) || candidates.includes(String(row.tickerOrIsin || ''));
      });
      const profitLossRow = [
        matchedInstrument?.tickerOrIsin,
        matchedInstrument?.ibkrConid,
        matchedInstrument?.ibkrSymbol,
        matchedInstrument?.ibkrLocalSymbol,
        row.tickerOrIsin,
        row.symbol,
        row.name,
      ].find((key) => key != null && profitLossIndex.has(String(key)));
      const profitLoss = profitLossRow != null ? profitLossIndex.get(String(profitLossRow)) : null;
      const quantityHeld = Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : null;
      const costBasisChf = Number.isFinite(Number(profitLoss?.costBasisChf)) ? Number(profitLoss.costBasisChf) : row.costBasisChf;
      const gainSincePurchaseChf = Number.isFinite(Number(profitLoss?.unrealizedProfitChf)) ? Number(profitLoss.unrealizedProfitChf) : row.gainSincePurchaseChf;
      const gainPct = Number.isFinite(Number(profitLoss?.unrealizedProfitPct))
        ? Number(profitLoss.unrealizedProfitPct)
        : row.gainSincePurchaseChf != null && row.costBasisChf
          ? Number(((row.gainSincePurchaseChf / row.costBasisChf) * 100).toFixed(1))
          : null;
      const allocationPct = Number.isFinite(Number(row.allocationPct)) && Number(row.allocationPct) > 0
        ? Number(row.allocationPct)
        : (Number.isFinite(Number(row.valueChf)) && totalValue > 0 ? Number(((Number(row.valueChf) / totalValue) * 100).toFixed(1)) : null);
      const targetPct = Number.isFinite(Number(row.targetPct)) && Number(row.targetPct) > 0
        ? Number(row.targetPct)
        : (matchedInstrument && Number.isFinite(Number(matchedInstrument.target)) ? Number(matchedInstrument.target) : null);
      const driftPct = Number.isFinite(Number(row.driftPct)) && Number(row.driftPct) !== 0
        ? Number(row.driftPct)
        : (Number.isFinite(allocationPct) && Number.isFinite(targetPct) ? Number((allocationPct - targetPct).toFixed(1)) : null);
      return {
        symbol: matchedInstrument?.ibkrLocalSymbol || matchedInstrument?.ibkrSymbol || row.name || row.symbol,
        name: matchedInstrument?.name || row.name || row.symbol,
        quantityHeld,
        averageBuyPrice: costBasisChf != null && quantityHeld ? Number((costBasisChf / quantityHeld).toFixed(4)) : row.avgBuyPrice,
        lastTradedPrice: row.lastPrice,
        totalValue: row.valueChf,
        gainSincePurchase: gainPct,
        gainSincePurchaseChf,
        gainSincePurchasePct: gainPct,
        ytdChf,
        ytdPct,
        valueChf: row.valueChf,
        currency: row.currency,
        allocationPct,
        targetPct,
        driftPct,
        costBasisChf,
        availability: {
          averageBuyPrice: (costBasisChf != null || row.avgBuyPrice != null) ? 'available' : 'missing',
          gainSincePurchaseChf: gainSincePurchaseChf == null ? 'missing' : 'available',
          ytd: ytdChf == null ? 'missing' : 'portfolio_level_only',
        },
      };
    }),
  };
}

function normalizeFilledTrade({ trade = {}, holdingsRows = [] } = {}) {
  const quantityPurchased = parseNumber(trade.fillQty) ?? parseNumber(trade.qty);
  const unitPrice = parseNumber(trade.fillPrice) ?? parseNumber(trade.price);
  const totalCost = parseNumber(trade.costChf);
  const actualChf = parseNumber(trade.actualChf);
  const fees = parseNumber(trade.fees) || 0;
  const costChfIncludingCommission = actualChf != null
    ? actualChf
    : totalCost != null
      ? Number((totalCost + fees).toFixed(2))
      : null;
  const holdingsMatch = (holdingsRows || []).find((row) => String(row.tickerOrIsin || row.symbol) === String(trade.symbol || ''));
  const resultingTotalHeld = holdingsMatch
    ? (parseNumber(holdingsMatch.quantityHeld) ?? parseNumber(holdingsMatch.quantity) ?? null)
    : null;

  return {
    symbol: trade.symbol || trade.tickerOrIsin || null,
    name: trade.name || trade.instrument || holdingsMatch?.name || null,
    quantityPurchased,
    pricePerUnit: unitPrice,
    unitPrice,
    totalCost,
    costChfIncludingCommission,
    resultingTotalHeld,
    currency: trade.currency || 'CHF',
    availability: {
      pricePerUnit: unitPrice == null ? 'missing' : 'available',
      costChfIncludingCommission: costChfIncludingCommission == null ? 'missing' : actualChf != null ? 'actual' : 'estimated_from_fees',
      resultingTotalHeld: resultingTotalHeld == null ? 'missing' : 'available',
    },
  };
}

module.exports = {
  parseHoldingsTable,
  buildInvestorHoldingsSnapshot,
  normalizeFilledTrade,
};
