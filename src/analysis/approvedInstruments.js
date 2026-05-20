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

function parseMetadata(notes) {
  const out = {};
  const matches = String(notes || '').matchAll(/\b([a-zA-Z0-9_\-]+)\s*=\s*([^;|,]+)\b/g);
  for (const match of matches) out[match[1]] = match[2].trim();
  return out;
}

function readApprovedInstruments(portfolioPath) {
  const text = fs.readFileSync(portfolioPath, 'utf8');
  const rows = parseRows(extractSection(text, 'Approved Instruments'));
  return rows.map((row) => {
    const notes = row[8] || '';
    const metadata = parseMetadata(notes);
    return {
      tickerOrIsin: row[0] || '',
      name: row[1] || '',
      assetClass: row[2] && row[2] !== 'Equity' ? row[2] : classifyAssetClass(row[1] || row[0]),
      target: cleanPercent(row[3]),
      min: cleanPercent(row[4]),
      max: cleanPercent(row[5]),
      exchange: row[6] || '',
      currency: row[7] || 'CHF',
      notes,
      metadata,
      ibkrConid: metadata.ibkr_conid || metadata.conid || null,
      ibkrSymbol: metadata.ibkr_symbol || metadata.symbol || null,
      ibkrLocalSymbol: metadata.ibkr_local_symbol || metadata.local_symbol || null,
      ibkrPrimaryExchange: metadata.ibkr_primary_exchange || metadata.primary_exchange || null,
      fxToChfHint: metadata.fx_to_chf ? Number(metadata.fx_to_chf) : null,
    };
  });
}

function readExcludedInstruments(portfolioPath) {
  const text = fs.readFileSync(portfolioPath, 'utf8');
  const rows = parseRows(extractSection(text, 'Excluded Instruments'));
  return rows
    .map((row) => ({
      tickerOrIsin: row[0] || '',
      reason: row[1] || '',
    }))
    .filter((row) => row.tickerOrIsin && String(row.tickerOrIsin).toLowerCase() !== 'none');
}

module.exports = { readApprovedInstruments, readExcludedInstruments, parseMetadata };
