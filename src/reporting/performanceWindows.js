'use strict';

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function roundCurrency(value) {
  const numeric = toNumber(value);
  return numeric == null ? null : Number(numeric.toFixed(2));
}

function roundPercent(value) {
  const numeric = toNumber(value);
  return numeric == null ? null : Number(numeric.toFixed(1));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function startOfYearUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

function subtractDaysUtc(now = new Date(), days = 0) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - Number(days || 0)));
}

function buildWindowResult({ label, availability, anchorDate = null, anchorTotalChf = null, currentTotalChf = null, gainChf = null, gainPct = null } = {}) {
  return {
    label,
    availability,
    anchorDate,
    anchorTotalChf: roundCurrency(anchorTotalChf),
    currentTotalChf: roundCurrency(currentTotalChf),
    gainChf: roundCurrency(gainChf),
    gainPct: roundPercent(gainPct),
  };
}

function computeGainPct(gainChf, anchorTotalChf) {
  const gain = toNumber(gainChf);
  const anchor = toNumber(anchorTotalChf);
  if (gain == null || anchor == null || anchor === 0) return null;
  return (gain / anchor) * 100;
}

function findSnapshotOnOrBefore(historyRows = [], targetDate) {
  const target = targetDate instanceof Date ? formatDate(targetDate) : String(targetDate || '');
  const rows = Array.isArray(historyRows) ? historyRows.filter((row) => row && row.date && toNumber(row.totalChf) != null) : [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (String(rows[i].date) <= target) return rows[i];
  }
  return null;
}

function currentSnapshot(historyRows = []) {
  const rows = Array.isArray(historyRows) ? historyRows.filter((row) => row && row.date && toNumber(row.totalChf) != null) : [];
  return rows.length ? rows[rows.length - 1] : null;
}

function buildPortfolioWindowFromHistory({ historyRows = [], label, targetDate, allowEarliestInYear = false } = {}) {
  const current = currentSnapshot(historyRows);
  if (!current) return buildWindowResult({ label, availability: 'missing_history' });

  let anchor = findSnapshotOnOrBefore(historyRows, targetDate);
  let availability = 'available';
  if (!anchor && allowEarliestInYear) {
    const yearPrefix = formatDate(targetDate).slice(0, 4);
    anchor = historyRows.find((row) => String(row.date || '').startsWith(yearPrefix) && toNumber(row.totalChf) != null) || null;
    if (anchor) availability = 'partial';
  }
  if (!anchor) return buildWindowResult({ label, availability: 'missing_history', currentTotalChf: current.totalChf });

  const gainChf = Number(current.totalChf) - Number(anchor.totalChf);
  return buildWindowResult({
    label,
    availability,
    anchorDate: anchor.date,
    anchorTotalChf: anchor.totalChf,
    currentTotalChf: current.totalChf,
    gainChf,
    gainPct: computeGainPct(gainChf, anchor.totalChf),
  });
}

function buildPortfolioPerformanceWindows({ historyRows = [], sincePurchase = null, now = new Date() } = {}) {
  const current = currentSnapshot(historyRows);
  const currentTotalChf = current ? Number(current.totalChf) : null;
  const currentYearStart = startOfYearUtc(now);
  const windows = {
    sincePurchase: buildWindowResult({
      label: 'Since purchase',
      availability: sincePurchase?.availability || 'missing',
      anchorDate: sincePurchase?.anchorDate || null,
      anchorTotalChf: sincePurchase?.anchorTotalChf || sincePurchase?.costBasisChf || null,
      currentTotalChf,
      gainChf: sincePurchase?.gainChf ?? null,
      gainPct: sincePurchase?.gainPct ?? null,
    }),
    last7d: buildPortfolioWindowFromHistory({ historyRows, label: 'Last 7 days', targetDate: subtractDaysUtc(now, 7) }),
    last30d: buildPortfolioWindowFromHistory({ historyRows, label: 'Last 30 days', targetDate: subtractDaysUtc(now, 30) }),
    ytd: buildPortfolioWindowFromHistory({ historyRows, label: 'YTD', targetDate: currentYearStart, allowEarliestInYear: true }),
    last365d: buildPortfolioWindowFromHistory({ historyRows, label: 'Last 365 days', targetDate: subtractDaysUtc(now, 365) }),
  };
  return { windows, asOfDate: current?.date || null };
}

function buildInstrumentPerformanceWindows({ gainSincePurchaseChf = null, gainSincePurchasePct = null, costBasisChf = null } = {}) {
  const sincePurchaseAvailable = toNumber(gainSincePurchaseChf) != null;
  return {
    sincePurchase: buildWindowResult({
      label: 'Since purchase',
      availability: sincePurchaseAvailable ? 'available' : 'missing',
      anchorDate: null,
      anchorTotalChf: costBasisChf,
      currentTotalChf: toNumber(costBasisChf) != null && toNumber(gainSincePurchaseChf) != null ? Number(costBasisChf) + Number(gainSincePurchaseChf) : null,
      gainChf: gainSincePurchaseChf,
      gainPct: gainSincePurchasePct,
    }),
    last7d: buildWindowResult({ label: 'Last 7 days', availability: 'missing_history' }),
    last30d: buildWindowResult({ label: 'Last 30 days', availability: 'missing_history' }),
    ytd: buildWindowResult({ label: 'YTD', availability: 'missing_history' }),
    last365d: buildWindowResult({ label: 'Last 365 days', availability: 'missing_history' }),
  };
}

module.exports = {
  buildPortfolioPerformanceWindows,
  buildInstrumentPerformanceWindows,
  findSnapshotOnOrBefore,
};
