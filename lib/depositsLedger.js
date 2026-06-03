'use strict';

/**
 * lib/depositsLedger.js
 *
 * Parser for portfolio/<name>/deposits.md.
 *
 * Format:
 *   ## Ledger
 *   | Date | Direction | Currency | Amount native | FX to CHF | Amount CHF | Method | Reference | Notes |
 *
 * Direction is `deposit` (cash in) or `withdrawal` (cash out).
 * Withdrawals subtract from cumulative net deposits.
 *
 * Returns:
 *   {
 *     entries: Array<{ date, direction, currency, amountNative, fxToChf, amountChf, method, reference, notes }>,
 *     totals: {
 *       cumulativeDepositsChf: Number,
 *       cumulativeWithdrawalsChf: Number,
 *       netDepositedChf: Number,
 *       lastDate: String|null,
 *     }
 *   }
 */
const fs = require('fs');
const path = require('path');

function parseDepositsLedger(md) {
  const entries = [];
  if (typeof md !== 'string' || !md.trim()) {
    return { entries, totals: { cumulativeDepositsChf: 0, cumulativeWithdrawalsChf: 0, netDepositedChf: 0, lastDate: null } };
  }

  // Find the "## Ledger" section.
  const sectionMatch = md.match(/##\s+Ledger[\r\n]+([\s\S]*?)(?:\n##\s|$)/);
  const section = sectionMatch ? sectionMatch[1] : md;

  const lines = section.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;            // separator row
    if (/^\|\s*Date\b/i.test(trimmed)) continue;       // header row

    // Split, drop leading/trailing empty cells from leading/trailing pipe.
    const cells = trimmed.split('|').map((c) => c.trim());
    if (cells.length && cells[0] === '') cells.shift();
    if (cells.length && cells[cells.length - 1] === '') cells.pop();
    if (cells.length < 6) continue;

    const [date, directionRaw, currency, amountNativeRaw, fxRaw, amountChfRaw, method = '', reference = '', notes = ''] = cells;
    const direction = String(directionRaw || '').toLowerCase();
    if (direction !== 'deposit' && direction !== 'withdrawal') continue;

    const amountNative = parseNumber(amountNativeRaw);
    const fxToChf = parseNumber(fxRaw);
    const amountChf = parseNumber(amountChfRaw);
    if (!Number.isFinite(amountChf)) continue;

    entries.push({
      date: String(date || ''),
      direction,
      currency: String(currency || '').toUpperCase(),
      amountNative,
      fxToChf,
      amountChf,
      method: String(method || '').toLowerCase(),
      reference: String(reference || ''),
      notes: String(notes || ''),
    });
  }

  // Sort chronologically (string compare on YYYY-MM-DD works).
  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let cumulativeDepositsChf = 0;
  let cumulativeWithdrawalsChf = 0;
  for (const e of entries) {
    if (e.direction === 'deposit') cumulativeDepositsChf += e.amountChf;
    else if (e.direction === 'withdrawal') cumulativeWithdrawalsChf += e.amountChf;
  }
  const netDepositedChf = Number((cumulativeDepositsChf - cumulativeWithdrawalsChf).toFixed(2));

  return {
    entries,
    totals: {
      cumulativeDepositsChf: Number(cumulativeDepositsChf.toFixed(2)),
      cumulativeWithdrawalsChf: Number(cumulativeWithdrawalsChf.toFixed(2)),
      netDepositedChf,
      lastDate: entries.length ? entries[entries.length - 1].date : null,
    },
  };
}

function loadDepositsLedger(portfolioDir) {
  const ledgerPath = path.join(portfolioDir, 'deposits.md');
  if (!fs.existsSync(ledgerPath)) {
    return { entries: [], totals: { cumulativeDepositsChf: 0, cumulativeWithdrawalsChf: 0, netDepositedChf: 0, lastDate: null }, missing: true };
  }
  const md = fs.readFileSync(ledgerPath, 'utf8');
  const parsed = parseDepositsLedger(md);
  return { ...parsed, missing: false };
}

function parseNumber(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[\s,'`]/g, '').replace(/CHF/i, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  parseDepositsLedger,
  loadDepositsLedger,
};
