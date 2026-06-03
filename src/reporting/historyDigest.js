'use strict';

/**
 * Read time-series digest from portfolio/<name>/history.md.
 * Dedupes to the latest entry per (date, snapshot) pair.
 * Returns chronologically-ordered series.
 */

const fs = require('fs');
const path = require('path');

function parseHistoryRow(line) {
  // Legacy 8-column layout (no Net deposited):
  //   | date | snapshot | total | invested | cash | dailyChange | dailyChange% | notes |
  // Current 9-column layout:
  //   | date | snapshot | total | invested | netDeposited | cash | dailyChange | dailyChange% | notes |
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length < 8) return null;
  const date = cells[1];
  const snapshot = cells[2];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  // The split-by-pipe yields cells.length = data_columns + 2 (empty leading
  // and trailing entries from the bordering pipes).
  // Legacy 8-column layout  -> cells.length === 10
  // New 9-column layout     -> cells.length === 11
  const isNewLayout = cells.length >= 11;

  if (isNewLayout) {
    return {
      date,
      snapshot,
      totalChf: Number(cells[3]) || 0,
      investedChf: Number(cells[4]) || 0,
      netDepositedChf: cells[5] === '' ? null : (Number(cells[5]) || 0),
      cashChf: Number(cells[6]) || 0,
      dailyChangeChf: Number(cells[7]) || 0,
      dailyChangePct: Number(cells[8]) || 0,
      notes: cells[9] || '',
    };
  }

  // Legacy layout — no net-deposited column. Field is null.
  return {
    date,
    snapshot,
    totalChf: Number(cells[3]) || 0,
    investedChf: Number(cells[4]) || 0,
    netDepositedChf: null,
    cashChf: Number(cells[5]) || 0,
    dailyChangeChf: Number(cells[6]) || 0,
    dailyChangePct: Number(cells[7]) || 0,
    notes: cells[8] || '',
  };
}

/**
 * @returns {Array<{date,totalChf,investedChf,netDepositedChf,cashChf,dailyChangeChf,dailyChangePct,notes}>}
 *   Sorted ascending by date. One row per date — the *last* snapshot in that day wins
 *   (this matches operator intent: end_of_day is canonical, start_of_day is a checkpoint).
 *
 *   netDepositedChf is `null` when the row is from the legacy 8-column layout.
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
