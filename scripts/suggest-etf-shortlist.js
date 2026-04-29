const { suggestEtfShortlist, formatShortlistMarkdown } = require('../src/analysis/etfShortlistEngine');

const portfolioPath = process.argv[2];
const mode = process.argv[3] || 'json';
if (!portfolioPath) {
  console.error('Usage: node scripts/suggest-etf-shortlist.js <portfolio.md> [json|markdown]');
  process.exit(1);
}

const result = suggestEtfShortlist(portfolioPath);
if (mode === 'markdown') {
  process.stdout.write(formatShortlistMarkdown(result));
} else {
  console.log(JSON.stringify(result, null, 2));
}
