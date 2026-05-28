const fs = require('fs');

function extractTableSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).filter((line) => line.startsWith('|'));
}

function parseTableRows(lines) {
  return lines.slice(2).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim())).filter((row) => row.length > 0);
}

function parseNumber(value) {
  const cleaned = String(value || '').replace(/[% ,]/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function loadTargets(portfolioPath) {
  const text = fs.readFileSync(portfolioPath, 'utf8');
  const rows = parseTableRows(extractTableSection(text, 'Allocation Targets'));
  return rows.map((row) => ({
    assetClass: row[0],
    target: parseNumber(row[1]),
    min: parseNumber(row[2]),
    max: parseNumber(row[3]),
    notes: row[4] || '',
  }));
}

function loadCurrentAllocations(holdingsPath) {
  const text = fs.readFileSync(holdingsPath, 'utf8');
  const rows = parseTableRows(extractTableSection(text, 'Current Holdings'));
  const byAsset = new Map();
  let investedTotal = 0;
  for (const row of rows) {
    const assetClass = row[2];
    const valueChf = parseNumber(row[7]);
    investedTotal += valueChf;
    byAsset.set(assetClass, (byAsset.get(assetClass) || 0) + valueChf);
  }

  // Source CHF cash from the holdings summary lines; prefer the broker-account cash
  // because that's the figure already included in `Total value CHF`. Falls back to the
  // legacy `Cash CHF` label, then the (possibly untrusted) portfolio cash line.
  const summaryMatch = (label) => {
    const m = text.match(new RegExp(`- ${label}:\\s*(.+)`));
    return m ? parseNumber(m[1]) : null;
  };
  let cashChf = 0;
  for (const label of ['Broker account cash CHF', 'Cash CHF', 'Portfolio cash CHF']) {
    const v = summaryMatch(label);
    if (v != null && v > 0) { cashChf = v; break; }
  }
  // Back-compat: if the older two-column Cash table (Currency | Amount) is present and the
  // summary lines didn't yield a positive value, parse it.
  if (cashChf === 0) {
    const cashSection = extractTableSection(text, 'Cash');
    const cashRows = parseTableRows(cashSection);
    cashChf = cashRows
      .filter((row) => String(row[0] || '').trim().toUpperCase() === 'CHF')
      .reduce((sum, row) => sum + parseNumber(row[3] || row[1] || '0'), 0);
  }
  if (cashChf > 0) {
    byAsset.set('Bonds / cash-like', (byAsset.get('Bonds / cash-like') || 0) + cashChf);
  }

  const total = investedTotal + cashChf;
  const result = new Map();
  for (const [assetClass, value] of byAsset.entries()) {
    result.set(assetClass, total > 0 ? (value / total) * 100 : 0);
  }
  return { totalInvestedValue: total, currentByAsset: result };
}

function analyzeAllocation({ portfolioPath, holdingsPath }) {
  const targets = loadTargets(portfolioPath);
  const { totalInvestedValue, currentByAsset } = loadCurrentAllocations(holdingsPath);
  return targets.map((target) => {
    const current = currentByAsset.get(target.assetClass) || 0;
    const drift = current - target.target;
    const status = current < target.min || current > target.max ? 'out_of_bounds' : (Math.abs(drift) >= 5 ? 'drifted' : 'on_track');
    return {
      assetClass: target.assetClass,
      current: Number(current.toFixed(2)),
      target: target.target,
      drift: Number(drift.toFixed(2)),
      min: target.min,
      max: target.max,
      status,
      totalInvestedValue,
    };
  });
}

module.exports = { analyzeAllocation };
