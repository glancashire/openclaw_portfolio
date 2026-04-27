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
  let total = 0;
  for (const row of rows) {
    const assetClass = row[2];
    const valueChf = parseNumber(row[7]);
    total += valueChf;
    byAsset.set(assetClass, (byAsset.get(assetClass) || 0) + valueChf);
  }

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
