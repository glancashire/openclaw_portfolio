const { writeHoldingsSnapshot } = require('../src/brokers/ig/holdingsSync');

const portfolioDir = process.argv[2];
if (!portfolioDir) {
  console.error('Usage: node scripts/simulate-holdings-sync.js <portfolio-dir>');
  process.exit(1);
}

const result = writeHoldingsSnapshot({
  portfolioDir,
  source: 'simulated',
  broker: 'ig',
  cashChf: 5000,
  holdings: [
    { isin: 'CH0032912732', name: 'UBS SLI ETF', assetClass: 'Swiss equities', quantity: 10, price: 100, currency: 'CHF', marketValue: 1000 },
    { isin: 'IE00B5BMR087', name: 'iShares Core S&P 500', assetClass: 'Global equities', quantity: 20, price: 200, currency: 'CHF', marketValue: 4000 },
  ],
});
console.log(JSON.stringify(result, null, 2));
