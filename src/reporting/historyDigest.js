'use strict';

/**
 * Read time-series digest from portfolio/<name>/history.md.
 * Dedupes to the latest entry per (date, snapshot) pair.
 * Returns chronologically-ordered series.
 */

const fs = require('fs');
const path = require('path');

function parseHistoryRow(line) {
  // | date | snapshot | total | invested | cash | dailyChange | dailyChange% | notes |
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length < 8) return null;
  const date = cells[1];
  const snapshot = cells[2];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    date,
    snapshot,
    totalChf: Number(cells[3]) || 0,
    investedChf: Number(cells[4]) || 0,
    cashChf: Number(cells[5]) || 0,
    dailyChangeChf: Number(cells[6]) || 0,
    dailyChangePct: Number(cells[7]) || 0,
    notes: cells[8] || '',
  };
}

/**
 * @returns {Array<{date,totalChf,investedChf,cashChf,dailyChangeChf,dailyChangePct,notes}>}
 *   Sorted ascending by date. One row per date — the *last* snapshot in that day wins
 *   (this matches operator intent: end_of_day is canonical, start_of_day is a checkpoint).
 */
function readNetLiqHistory(portfolioDir) {
  const file = path.join(portfolioDir, 'history.md');
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const byDate = new Map();
  for (const line of lines) {
    const row = parseHistoryRow(line);
    if (!row) continue;
    // Prefer end_of_day over start_of_day. Track insertion order; later wins ties.
    const existing = byDate.get(row.date);
    if (!existing) {
      byDate.set(row.date, row);
    } else {
      const isEod = (s) => /end_of_day/i.test(s || '');
      // Replace if new is end_of_day and existing isn't, or both same kind (later wins)
      if (isEod(row.snapshot) && !isEod(existing.snapshot)) {
        byDate.set(row.date, row);
      } else if (!isEod(row.snapshot) && isEod(existing.snapshot)) {
        // keep existing
      } else {
        byDate.set(row.date, row); // later wins
      }
    }
  }
  const series = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return series;
}

function lastNDays(series, n) {
  return series.slice(-n);
}

module.exports = { readNetLiqHistory, lastNDays, parseHistoryRow };
