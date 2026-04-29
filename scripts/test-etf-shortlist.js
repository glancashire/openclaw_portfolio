const { suggestEtfShortlist } = require('../src/analysis/etfShortlistEngine');

const portfolioPath = process.argv[2] || 'portfolio/etf/portfolio.md';
const result = suggestEtfShortlist(portfolioPath);
const assetClasses = new Set(result.suggestions.map((item) => item.assetClass));
const positiveTargets = result.suggestions.filter((item) => item.suggestedTargetPct > 0);
console.log(JSON.stringify({
  suggestionCount: result.suggestions.length,
  assetClasses: Array.from(assetClasses).sort(),
  positiveTargets: positiveTargets.map((item) => ({ tickerOrIsin: item.tickerOrIsin, assetClass: item.assetClass, suggestedTargetPct: item.suggestedTargetPct })),
}, null, 2));
if (result.suggestions.length < 3) process.exit(1);
if (!assetClasses.has('Global equities') || !assetClasses.has('Swiss equities') || !assetClasses.has('Bonds / cash-like')) process.exit(1);
if (!positiveTargets.length) process.exit(1);
