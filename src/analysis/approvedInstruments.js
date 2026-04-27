const fs = require('fs');

function extractSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function parseRows(section) {
  return section
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

function cleanPercent(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === ':') return null;
  const num = Number(raw.replace(/[% ,]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function classifyAssetClass(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('swiss') || lower.includes('sli') || lower.includes('spi')) return 'Swiss equities';
  if (lower.includes('bond') || lower.includes('money')) return 'Bonds / cash-like';
  return 'Global equities';
}

function readApprovedInstruments(portfolioPath) {
  const text = fs.readFileSync(portfolioPath, 'utf8');
  const rows = parseRows(extractSection(text, 'Approved Instruments'));
  return rows.map((row) => ({
    tickerOrIsin: row[0] || '',
    name: row[1] || '',
    assetClass: row[2] && row[2] !== 'Equity' ? row[2] : classifyAssetClass(row[1] || row[0]),
    target: cleanPercent(row[3]),
    min: cleanPercent(row[4]),
    max: cleanPercent(row[5]),
    exchange: row[6] || '',
    currency: row[7] || 'CHF',
    notes: row[8] || '',
  }));
}

module.exports = { readApprovedInstruments };
