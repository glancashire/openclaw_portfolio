const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeHoldingsSnapshot } = require('../src/brokers/shared/holdingsSnapshot');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'holdings-fx-'));
const portfolioDir = path.join(tmp, 'portfolio');
fs.mkdirSync(portfolioDir, { recursive: true });
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# test\n');

const holdings = [
  { identifier: 'CHF1', ticker: 'CHF1', name: 'CHF ETF', assetClass: 'Swiss equities', quantity: 10, price: 100, currency: 'CHF', fxRateToChf: 1, marketValue: 1000 },
  { identifier: 'EUR1', ticker: 'EUR1', name: 'EUR ETF', assetClass: 'Global equities', quantity: 10, price: 50, currency: 'EUR', fxRateToChf: 0.9, marketValue: 450 },
];

const result = writeHoldingsSnapshot({
  portfolioDir,
  holdings,
  cashChf: 100,
  cashBasis: 'CashBalance',
  cashDetail: { CashBalance: 100 },
  fxRates: { CHF: 1, EUR: 0.9 },
  source: 'broker_api',
  broker: 'interactive-brokers',
  normaliseHolding: (h) => h,
  portfolioCashChf: null,
  portfolioCashBasis: 'broker_reported',
});

assert.strictEqual(Number(result.invested.toFixed(2)), 1405.00);
assert.strictEqual(Number(result.total.toFixed(2)), 1505.00);

const text = fs.readFileSync(path.join(portfolioDir, 'holdings.md'), 'utf8');
assert(text.includes('| EUR | 0.9 | 405 |'), 'EUR row should show FX rate and CHF-converted value');
assert(text.includes('Non-CHF holdings are converted to CHF'), 'Should explain FX conversion');

console.log(JSON.stringify({ ok: true, passed: 5 }));
