#!/usr/bin/env node
'use strict';

/**
 * test-import-ibkr-deposits
 *
 * Regression test for the IBKR XLS deposit auto-import CLI.
 *
 * The XLS reader itself is exercised separately (it requires Python xlrd).
 * Here we verify the dedup + ledger rewrite logic by stubbing the parser,
 * which keeps the safe lane portable across environments without Python.
 *
 * Domain: reporting / migration
 * Lane: safe
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

// Stub the XLS reader BEFORE requiring the importer.
const xlsModulePath = require.resolve('../lib/ibkrDepositXls');
require.cache[xlsModulePath] = {
  id: xlsModulePath,
  filename: xlsModulePath,
  loaded: true,
  exports: {
    parseDepositXls: () => [
      // 1 known reference (already in fixture ledger)
      {
        date: '2026-04-27',
        direction: 'deposit',
        currency: 'CHF',
        amountChf: 5000,
        amountNative: 5000,
        fxToChf: 1,
        method: 'bank_transfer',
        reference: 'EXISTING-REF',
        notes: '',
      },
      // 1 new
      {
        date: '2026-06-15',
        direction: 'deposit',
        currency: 'CHF',
        amountChf: 25000,
        amountNative: 25000,
        fxToChf: 1,
        method: 'bank_transfer',
        reference: 'NEW-REF-001',
        notes: '',
      },
    ],
  },
};

const { importDeposits, rebuildLedgerFile } = require('../scripts/import-ibkr-deposits');

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'import-ibkr-'));
  try {
    const portfolioDir = path.join(tmp, 'portfolio', 'sample');
    fs.mkdirSync(portfolioDir, { recursive: true });

    fs.writeFileSync(path.join(portfolioDir, 'deposits.md'), `# Deposits: sample

## Ledger

| Date | Direction | Currency | Amount native | FX to CHF | Amount CHF | Method | Reference | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| 2026-04-27 | deposit | CHF | 5000.00 | 1 | 5000.00 | bank_transfer | EXISTING-REF | seed |

## Totals (computed)

- Cumulative deposits CHF: **5000.00**
- Cumulative withdrawals CHF: **0.00**
- **Net deposited CHF: 5000.00**
- Last update: 2026-04-27
`);

    // 1) dry run: report 1 added, 1 skipped, no file changes.
    const beforeText = fs.readFileSync(path.join(portfolioDir, 'deposits.md'), 'utf8');
    const dryResult = importDeposits({ portfolioDir, xlsPath: '/dev/null', dryRun: true });
    assert.strictEqual(dryResult.added, 1, 'dryRun reports 1 added');
    assert.strictEqual(dryResult.skipped, 1, 'dryRun reports 1 skipped');
    assert.deepStrictEqual(dryResult.addedReferences, ['NEW-REF-001'], 'dryRun reports the new reference');
    assert.strictEqual(fs.readFileSync(path.join(portfolioDir, 'deposits.md'), 'utf8'), beforeText, 'dry run does not mutate file');

    // 2) real run: appends, sorted by date, totals refreshed.
    const result = importDeposits({ portfolioDir, xlsPath: '/dev/null', dryRun: false });
    assert.strictEqual(result.added, 1, 'real run added=1');
    assert.strictEqual(result.skipped, 1, 'real run skipped=1');

    const afterText = fs.readFileSync(path.join(portfolioDir, 'deposits.md'), 'utf8');
    assert(afterText.includes('| 2026-04-27 | deposit | CHF | 5000.00 | 1 | 5000.00 | bank_transfer | EXISTING-REF |'),
      'existing entry preserved');
    assert(afterText.includes('| 2026-06-15 | deposit | CHF | 25000.00 | 1 | 25000.00 | bank_transfer | NEW-REF-001 |'),
      'new entry appended');
    assert(afterText.includes('Cumulative deposits CHF: **30000.00**'), 'totals deposits refreshed');
    assert(afterText.includes('**Net deposited CHF: 30000.00**'), 'net deposited refreshed');
    assert(/Last update: \d{4}-\d{2}-\d{2}/.test(afterText), 'last update timestamp present');

    // 3) Idempotent re-import: nothing should change.
    const result2 = importDeposits({ portfolioDir, xlsPath: '/dev/null', dryRun: false });
    assert.strictEqual(result2.added, 0, 're-import adds nothing');
    assert.strictEqual(result2.skipped, 2, 're-import skips both rows now');

    // 4) rebuildLedgerFile preserves the leading "# Deposits:" heading and any prefix sections.
    const sampleOriginal = `# Deposits: foo

intro paragraph

## Ledger

old garbage to be replaced

## Totals (computed)

old totals garbage
`;
    const rebuilt = rebuildLedgerFile(sampleOriginal, [
      { date: '2026-01-01', direction: 'deposit', currency: 'CHF', amountChf: 1000, amountNative: 1000, fxToChf: 1, method: 'bank_transfer', reference: 'A', notes: '' },
    ]);
    assert(rebuilt.startsWith('# Deposits: foo'), 'preserves leading heading');
    assert(rebuilt.includes('intro paragraph'), 'preserves intro');
    assert(rebuilt.includes('## Ledger'), 'has Ledger heading');
    assert(rebuilt.includes('| 2026-01-01 | deposit | CHF | 1000.00 | 1 | 1000.00 | bank_transfer | A |'), 'has new row');
    assert(rebuilt.includes('Cumulative deposits CHF: **1000.00**'), 'has refreshed totals');
    assert(!rebuilt.includes('old garbage to be replaced'), 'replaces old ledger contents');
    assert(!rebuilt.includes('old totals garbage'), 'replaces old totals');

    console.log(JSON.stringify({ ok: true }));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
