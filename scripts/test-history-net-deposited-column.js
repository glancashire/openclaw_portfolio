#!/usr/bin/env node
'use strict';

/**
 * test-history-net-deposited-column
 *
 * Verifies the additive `Net deposited CHF` column on history.md works end-to-end:
 *
 *   - lib/depositsLedger.js#netDepositedAsOf walks deposits/withdrawals on or before a date
 *   - src/markdown/fileContracts.js header includes the new column
 *   - src/analysis/historyWriter.js#appendHistorySnapshot emits the new column
 *   - src/reporting/historyDigest.js#parseHistoryRow reads both legacy 8-col and new 9-col rows
 *   - portfolio/etf/history.md is fully migrated and reconciles with the ledger
 *
 * Domain: reporting
 * Lane: safe
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

const { netDepositedAsOf, parseDepositsLedger } = require('../lib/depositsLedger');
const { CONTRACTS } = require('../src/markdown/fileContracts');
const { appendHistorySnapshot } = require('../src/analysis/historyWriter');
const { readNetLiqHistory } = require('../src/reporting/historyDigest');

function main() {
  // --- 1. netDepositedAsOf helper ---
  const sample = parseDepositsLedger(`## Ledger
| Date | Direction | Currency | Amount native | FX to CHF | Amount CHF | Method | Reference | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| 2026-01-15 | deposit | CHF | 5000 | 1 | 5000.00 | bank_transfer | A | first |
| 2026-02-01 | deposit | CHF | 3000 | 1 | 3000.00 | bank_transfer | B | second |
| 2026-02-15 | withdrawal | CHF | 1000 | 1 | 1000.00 | bank_transfer | C | partial out |
`).entries;
  assert.strictEqual(netDepositedAsOf(sample, '2026-01-01'), 0, 'before any deposit');
  assert.strictEqual(netDepositedAsOf(sample, '2026-01-15'), 5000, 'inclusive on deposit day');
  assert.strictEqual(netDepositedAsOf(sample, '2026-02-01'), 8000, 'after second deposit');
  assert.strictEqual(netDepositedAsOf(sample, '2026-02-15'), 7000, 'after withdrawal');
  assert.strictEqual(netDepositedAsOf(sample, '2030-01-01'), 7000, 'far future is still net');
  assert.strictEqual(netDepositedAsOf([], '2026-01-01'), 0, 'empty ledger');
  assert.strictEqual(netDepositedAsOf(sample, ''), 0, 'no asOfDate');

  // --- 2. file contract header includes new column ---
  const historyContract = CONTRACTS['history.md'];
  const headerLine = historyContract.requiredStrings.find((s) => s.startsWith('| Date | Snapshot'));
  assert(headerLine && headerLine.includes('Net deposited CHF'), 'history header has Net deposited CHF column');
  assert(headerLine.split('|').length === 11, 'history header has 9 columns + leading/trailing pipes');

  // --- 3. appendHistorySnapshot writes new column ---
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-netdep-'));
  try {
    const portfolioDir = tmpDir;
    fs.writeFileSync(path.join(portfolioDir, 'deposits.md'), `## Ledger
| Date | Direction | Currency | Amount native | FX to CHF | Amount CHF | Method | Reference | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| 2020-01-01 | deposit | CHF | 1000 | 1 | 1000.00 | bank_transfer | TEST-A | |
| 2020-02-01 | deposit | CHF | 2000 | 1 | 2000.00 | bank_transfer | TEST-B | |
`);

    const holdingsPath = path.join(portfolioDir, 'holdings.md');
    fs.writeFileSync(holdingsPath, `# Holdings: tmp
- Total value CHF: 3500
- Invested value CHF: 3200
- Cash CHF: 300
`);
    const historyPath = path.join(portfolioDir, 'history.md');
    fs.writeFileSync(historyPath, `# History: tmp

## Daily Valuation History

| Date | Snapshot | Total value CHF | Invested CHF | Net deposited CHF | Cash CHF | Daily change CHF | Daily change % | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|
`);
    const result = appendHistorySnapshot(historyPath, holdingsPath, 'end_of_day', 'unit-test row');
    assert.strictEqual(result.appended, true, 'row appended');

    const written = fs.readFileSync(historyPath, 'utf8');
    // 9-cell row with cumulative as-of today (3000, since both fixture deposits are before today).
    assert(written.includes('| 3500 | 3200 | 3000 | 300 |'), 'new row contains net-deposited cell');

    // historyDigest parses the new column
    const series = readNetLiqHistory(portfolioDir);
    assert.strictEqual(series.length, 1, 'one row parsed');
    assert.strictEqual(series[0].netDepositedChf, 3000, 'new-layout row parsed correctly');

    // --- 4. legacy 8-column row still parses, netDepositedChf=null ---
    fs.writeFileSync(historyPath, `# History: tmp

## Daily Valuation History

| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| 2025-12-31 | end_of_day | 1000 | 800 | 200 | 0 | 0 | legacy row |
`);
    const legacy = readNetLiqHistory(portfolioDir);
    assert.strictEqual(legacy.length, 1, 'legacy row parsed');
    assert.strictEqual(legacy[0].netDepositedChf, null, 'legacy row reports null for new column');
    assert.strictEqual(legacy[0].cashChf, 200, 'legacy cash still correct');
    assert.strictEqual(legacy[0].notes, 'legacy row', 'legacy notes still correct');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // --- 5. real ETF history.md is fully migrated and reconciles ---
  const etfHistoryPath = path.join(__dirname, '..', 'portfolio', 'etf', 'history.md');
  const etfHistoryText = fs.readFileSync(etfHistoryPath, 'utf8');
  assert(etfHistoryText.includes('| Date | Snapshot | Total value CHF | Invested CHF | Net deposited CHF | Cash CHF |'),
    'etf history.md uses 9-column header');

  const etfSeries = readNetLiqHistory(path.join(__dirname, '..', 'portfolio', 'etf'));
  // Last row should reflect 120,000 net deposited (full ledger sum)
  const last = etfSeries[etfSeries.length - 1];
  assert.strictEqual(last.netDepositedChf, 120000, `latest etf row reflects full ledger; got ${last.netDepositedChf}`);
  // Earliest etf row is on 2026-04-28; only the 2026-04-27 deposit is in by then (5000)
  const earliest = etfSeries[0];
  assert.strictEqual(earliest.date, '2026-04-28');
  assert.strictEqual(earliest.netDepositedChf, 5000, '2026-04-28 has 5000 net deposited');

  console.log(JSON.stringify({ ok: true, etfRows: etfSeries.length, latestNetDeposited: last.netDepositedChf }));
}

main();
