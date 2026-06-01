#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  shouldPreservePreviousAccountingSnapshot,
  preservePreviousAccountingSnapshotIfNeeded,
} = require('../src/brokers/interactive-brokers/accountingSnapshot');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ibkr-accounting-preserve-'));
const outDir = path.join(tmpRoot, 'runtime', 'ibkr-accounting', 'etf');
fs.mkdirSync(outDir, { recursive: true });
const latestPath = path.join(outDir, 'latest.json');
fs.writeFileSync(latestPath, JSON.stringify({ ok: true, accountId: 'U1', positions: [{ symbol: 'VT' }], ledger: [{ tag: 'SettledCash', value: '100', currency: 'CHF' }] }, null, 2));

assert.strictEqual(shouldPreservePreviousAccountingSnapshot({ authOk: true, accountId: 'U1', positions: [], ledger: [] }), true);
assert.strictEqual(shouldPreservePreviousAccountingSnapshot({ authOk: true, accountId: 'U1', positions: [{}], ledger: [] }), false);

const preserved = preservePreviousAccountingSnapshotIfNeeded({ outDir, authOk: true, accountId: 'U1', positions: [], ledger: [] });
assert.strictEqual(preserved.ok, false);
assert.strictEqual(preserved.reason, 'preserved_last_known_good');
assert.strictEqual(preserved.preservedPath, latestPath);

console.log(JSON.stringify({ ok: true }, null, 2));
