const fs = require('fs');
const {
  suggestEtfShortlist,
  formatShortlistMarkdown,
  buildApprovedInstrumentRows,
  replaceApprovedInstrumentsSection,
} = require('../src/analysis/etfShortlistEngine');

const portfolioPath = process.argv[2];
const mode = process.argv[3] || 'json';
if (!portfolioPath) {
  console.error('Usage: node scripts/suggest-etf-shortlist.js <portfolio.md> [json|markdown|apply]');
  process.exit(1);
}

const result = suggestEtfShortlist(portfolioPath);
if (mode === 'markdown') {
  process.stdout.write(formatShortlistMarkdown(result));
} else if (mode === 'apply') {
  const original = fs.readFileSync(portfolioPath, 'utf8');
  const rows = buildApprovedInstrumentRows(result, { topPerAssetClass: 2 });
  const updated = replaceApprovedInstrumentsSection(original, rows);
  fs.writeFileSync(portfolioPath, updated);
  console.log(JSON.stringify({ ok: true, updated: portfolioPath, rowsApplied: rows.length, shortlist: result }, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
