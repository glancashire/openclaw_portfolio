'use strict';

// Phase D1 — FX cash reconciliation tests.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  extractCashByCurrency,
  reconcileCash,
  formatCashReconciliationSection,
} = require('../src/brokers/shared/cashReconciliation');
const { writeHoldingsSnapshot } = require('../src/brokers/shared/holdingsSnapshot');

let passed = 0;
function check(cond, msg) {
  assert.ok(cond, msg);
  passed += 1;
}

// --- extractCashByCurrency: array ledger, multi-currency, skips BASE ---
const ledger = [
  { tag: 'CashBalance', currency: 'CHF', value: 1000 },
  { tag: 'SettledCash', currency: 'CHF', value: 1000 },
  { tag: 'CashBalance', currency: 'EUR', value: 200 },
  { tag: 'CashBalance', currency: 'USD', value: 50 },
  { tag: 'CashBalance', currency: 'BASE', value: 9999 },
  { tag: 'ExchangeRate', currency: 'EUR', value: 0.95 },
  { tag: 'NetLiquidation', currency: 'CHF', value: 12345 },
];
const byCur = extractCashByCurrency(ledger);
check(byCur.CHF && byCur.CHF.value === 1000, 'CHF cash extracted with preferred tag');
check(byCur.EUR && byCur.EUR.value === 200, 'EUR cash extracted');
check(byCur.USD && byCur.USD.value === 50, 'USD cash extracted');
check(!byCur.BASE, 'BASE pseudo-currency skipped');

// --- reconcileCash: applies FX, computes drift vs legacy CHF-only ---
const recon = reconcileCash({
  ledger,
  fxRates: { CHF: 1, EUR: 0.95, USD: 0.88 },
  brokerCashChf: 1000, // legacy CHF-only path only saw the CHF sleeve
});
// total = 1000 + 200*0.95 + 50*0.88 = 1000 + 190 + 44 = 1234
check(recon.totalChf === 1234, `reconciled total CHF = 1234 (got ${recon.totalChf})`);
check(recon.driftChf === 234, `drift vs CHF-only = 234 (got ${recon.driftChf})`);
check(recon.flags.some((f) => f.startsWith('chf_cash_drift')), 'drift flag raised');
check(recon.flags.some((f) => f.startsWith('non_chf_cash')), 'non-CHF cash flag raised');
check(recon.reconciled === false, 'not reconciled when drift exceeds tolerance');

// --- reconcileCash: missing FX rate flagged, not summed ---
const reconMissing = reconcileCash({
  ledger: [
    { tag: 'CashBalance', currency: 'CHF', value: 500 },
    { tag: 'CashBalance', currency: 'GBP', value: 100 },
  ],
  fxRates: { CHF: 1 },
  brokerCashChf: 500,
});
check(reconMissing.missingFx.includes('GBP'), 'GBP missing FX flagged');
check(reconMissing.totalChf === 500, 'missing-FX currency excluded from total');
check(reconMissing.flags.some((f) => f.startsWith('missing_fx')), 'missing_fx flag raised');

// --- clean case: CHF only, no drift ---
const clean = reconcileCash({
  ledger: [{ tag: 'CashBalance', currency: 'CHF', value: 777 }],
  fxRates: { CHF: 1 },
  brokerCashChf: 777,
});
check(clean.reconciled === true, 'CHF-only with matching legacy figure reconciles clean');
check(formatCashReconciliationSection(clean) === '', 'no section rendered when nothing meaningful');

// --- section rendering when multi-currency present ---
const section = formatCashReconciliationSection(recon);
check(section.includes('## Cash Reconciliation (by currency)'), 'section header present');
check(section.includes('| EUR | 200 | 0.95 | 190 |'), 'EUR reconciliation row present');
check(section.includes('Drift CHF'), 'drift line present');

// --- keyed-object ledger shape ---
const keyedRecon = reconcileCash({
  ledger: { CHF: { cashBalance: 100 }, EUR: { cashBalance: 10 } },
  fxRates: { CHF: 1, EUR: 0.9 },
  brokerCashChf: 100,
});
check(keyedRecon.totalChf === 109, `keyed-object ledger total = 109 (got ${keyedRecon.totalChf})`);

// --- integration: writeHoldingsSnapshot appends the section, totals unchanged ---
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cash-recon-'));
const portfolioDir = path.join(tmp, 'portfolio');
fs.mkdirSync(portfolioDir, { recursive: true });
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# test\n');
const result = writeHoldingsSnapshot({
  portfolioDir,
  holdings: [{ identifier: 'CHF1', ticker: 'CHF1', name: 'CHF ETF', assetClass: 'Swiss equities', quantity: 10, price: 100, currency: 'CHF', fxRateToChf: 1, marketValue: 1000 }],
  cashChf: 1000,
  cashBasis: 'CashBalance',
  cashReconciliation: recon,
  normaliseHolding: (h) => h,
});
// canonical totals must NOT change from the reconciliation wiring
check(Number(result.total.toFixed(2)) === 2000.00, `canonical total unchanged = 2000 (got ${result.total})`);
const text = fs.readFileSync(path.join(portfolioDir, 'holdings.md'), 'utf8');
check(text.includes('## Cash Reconciliation (by currency)'), 'holdings.md includes reconciliation section');
check(text.includes('| Broker account | CHF | 1000 | 1 | 1000 |'), 'legacy CHF cash row preserved');

console.log(JSON.stringify({ ok: true, passed }));
