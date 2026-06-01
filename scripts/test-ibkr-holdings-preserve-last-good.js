#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeHoldingsSnapshot } = require('../src/brokers/shared/holdingsSnapshot');
const {
  shouldPreservePreviousHoldingsSnapshot,
  preservePreviousHoldingsSnapshotIfNeeded,
} = require('../src/brokers/interactive-brokers/holdingsSync');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ibkr-holdings-preserve-'));
const portfolioDir = path.join(tmpRoot, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio\n');

writeHoldingsSnapshot({
  portfolioDir,
  holdings: [{ ticker: 'VT', name: 'VT', quantity: 10, price: 100, currency: 'CHF', marketValue: 1000 }],
  cashChf: 500,
  cashBasis: 'SettledCash',
  source: 'broker_api',
  broker: 'interactive-brokers',
});

assert.strictEqual(shouldPreservePreviousHoldingsSnapshot({ authOk: true, accountId: 'U1', holdings: [], cashChf: 0, positionsRaw: [], ledgerRaw: [] }), true);
assert.strictEqual(shouldPreservePreviousHoldingsSnapshot({ authOk: true, accountId: 'U1', holdings: [{ ticker: 'VT' }], cashChf: 0, positionsRaw: [{}], ledgerRaw: [] }), false);

const preserved = preservePreviousHoldingsSnapshotIfNeeded({
  portfolioDir,
  authOk: true,
  accountId: 'U1',
  holdings: [],
  cashChf: 0,
  positionsRaw: [],
  ledgerRaw: [],
});
assert.strictEqual(preserved.ok, false);
assert.strictEqual(preserved.reason, 'preserved_last_known_good');
assert.match(preserved.message, /preserved last-known-good holdings/i);

const holdingsText = fs.readFileSync(path.join(portfolioDir, 'holdings.md'), 'utf8');
assert.match(holdingsText, /Total value CHF: 1500/);

console.log(JSON.stringify({ ok: true }, null, 2));
