#!/usr/bin/env node
'use strict';

/**
 * test-deposits-ledger
 *
 * Verifies lib/depositsLedger.js parses portfolio/<name>/deposits.md
 * correctly:
 *   - 8 entries from the IBKR-imported ledger
 *   - cumulative deposits = 120000.00 CHF
 *   - withdrawals = 0
 *   - net deposited = 120000.00 CHF
 *   - missing-file path returns sane zero-valued totals
 *
 * Domain: reporting
 * Lane: safe
 */
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { parseDepositsLedger, loadDepositsLedger } = require('../lib/depositsLedger');

function main() {
  const portfolioDir = path.join(__dirname, '..', 'portfolio', 'etf');
  const ledgerPath = path.join(portfolioDir, 'deposits.md');
  assert(fs.existsSync(ledgerPath), 'expected portfolio/etf/deposits.md to exist');

  const md = fs.readFileSync(ledgerPath, 'utf8');
  const parsed = parseDepositsLedger(md);

  assert.strictEqual(parsed.entries.length, 8, 'expected 8 deposit entries');
  for (const e of parsed.entries) {
    assert.strictEqual(e.direction, 'deposit', `entry ${e.reference} should be a deposit`);
    assert.strictEqual(e.currency, 'CHF', `entry ${e.reference} currency`);
    assert(Number.isFinite(e.amountChf), `entry ${e.reference} amountChf finite`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(e.date), `entry ${e.reference} date ISO-like`);
    assert(e.reference, `entry has a reference`);
  }

  assert.strictEqual(parsed.totals.cumulativeDepositsChf, 120000, 'cumulative deposits = 120000');
  assert.strictEqual(parsed.totals.cumulativeWithdrawalsChf, 0, 'no withdrawals');
  assert.strictEqual(parsed.totals.netDepositedChf, 120000, 'net deposited = 120000');
  assert.strictEqual(parsed.totals.lastDate, '2026-06-02', 'last deposit date');

  // Sorted chronologically
  for (let i = 1; i < parsed.entries.length; i += 1) {
    assert(parsed.entries[i - 1].date <= parsed.entries[i].date, 'entries sorted by date');
  }

  // loadDepositsLedger wrapper works
  const loaded = loadDepositsLedger(portfolioDir);
  assert.strictEqual(loaded.missing, false);
  assert.strictEqual(loaded.totals.netDepositedChf, 120000);

  // Missing file path returns sane zeros
  const empty = loadDepositsLedger(path.join(__dirname, '..', 'portfolio', '__nonexistent__'));
  assert.strictEqual(empty.missing, true);
  assert.strictEqual(empty.totals.netDepositedChf, 0);
  assert.strictEqual(empty.entries.length, 0);

  // Withdrawal handling
  const withdrawalMd = `## Ledger
| Date | Direction | Currency | Amount native | FX to CHF | Amount CHF | Method | Reference | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| 2026-01-01 | deposit | CHF | 1000 | 1 | 1000.00 | bank_transfer | A | |
| 2026-02-01 | withdrawal | CHF | 200 | 1 | 200.00 | bank_transfer | B | partial withdraw |
`;
  const wp = parseDepositsLedger(withdrawalMd);
  assert.strictEqual(wp.totals.cumulativeDepositsChf, 1000);
  assert.strictEqual(wp.totals.cumulativeWithdrawalsChf, 200);
  assert.strictEqual(wp.totals.netDepositedChf, 800);

  console.log(JSON.stringify({ ok: true, entries: parsed.entries.length, netDepositedChf: parsed.totals.netDepositedChf }));
}

main();
