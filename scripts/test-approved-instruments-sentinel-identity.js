#!/usr/bin/env node
'use strict';

/* Regression: readApprovedInstruments must treat the sentinel placeholders
 * "missing", "unknown", "n/a" (and casing variants) as absent IBKR identity,
 * not as actual values.
 *
 * The original bug: portfolio.md notes like
 *   ibkr_symbol=missing; ibkr_conid=missing
 * caused hasIbkrIdentity() to return true (because the truthy string
 * "missing" was assigned to ibkrSymbol), which in turn caused the
 * market-calendar sync to call fetchContractDetailsByConid("missing"),
 * which crashed with "Unable to parse field: 'Con Id' for input string: 'NaN'".
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function writePortfolio(dir, approvedTableRow) {
  fs.mkdirSync(dir, { recursive: true });
  const portfolioPath = path.join(dir, 'portfolio.md');
  fs.writeFileSync(portfolioPath, `# Portfolio: test

## Status
- Status: active

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
${approvedTableRow}

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|
`);
  return portfolioPath;
}

test('sentinel "missing" is treated as null for ibkrConid/ibkrSymbol/ibkrPrimaryExchange', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approved-sentinel-'));
  const portfolioPath = writePortfolio(tmpDir,
    '| LU0950670850 | UBS UK | Global equities | 0 | 0 | 0 | LSE | GBP | ibkr_symbol=missing; ibkr_conid=missing; ibkr_primary_exchange=missing |');
  const rows = readApprovedInstruments(portfolioPath);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].ibkrConid, null, `expected ibkrConid=null, got ${rows[0].ibkrConid}`);
  assert.strictEqual(rows[0].ibkrSymbol, null, `expected ibkrSymbol=null, got ${rows[0].ibkrSymbol}`);
  assert.strictEqual(rows[0].ibkrPrimaryExchange, null, `expected ibkrPrimaryExchange=null, got ${rows[0].ibkrPrimaryExchange}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('case variants and other sentinels are also treated as null', () => {
  const cases = [
    'ibkr_conid=MISSING',
    'ibkr_conid=Unknown',
    'ibkr_conid=n/a',
    'ibkr_conid=N/A',
    'ibkr_conid= unknown ',
  ];
  for (const note of cases) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approved-case-'));
    const portfolioPath = writePortfolio(tmpDir,
      `| LU0950670850 | UBS UK | Global equities | 0 | 0 | 0 | LSE | GBP | ${note} |`);
    const rows = readApprovedInstruments(portfolioPath);
    assert.strictEqual(rows[0].ibkrConid, null, `note=${note} expected null, got ${JSON.stringify(rows[0].ibkrConid)}`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('real conid/symbol values still pass through', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approved-real-'));
  const portfolioPath = writePortfolio(tmpDir,
    '| IE00B5BMR087 | iShares S&P 500 | Global equities | 10 | 5 | 15 | IBIS | EUR | ibkr_symbol=SXR8; ibkr_conid=75776072; ibkr_primary_exchange=IBIS |');
  const rows = readApprovedInstruments(portfolioPath);
  assert.strictEqual(rows[0].ibkrSymbol, 'SXR8');
  assert.strictEqual(rows[0].ibkrConid, '75776072');
  assert.strictEqual(rows[0].ibkrPrimaryExchange, 'IBIS');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('empty notes leave identity null', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approved-empty-'));
  const portfolioPath = writePortfolio(tmpDir,
    '| CASH-CHF | CHF cash | Cash | 5 | 0 | 25 | n/a | CHF |  |');
  const rows = readApprovedInstruments(portfolioPath);
  assert.strictEqual(rows[0].ibkrConid, null);
  assert.strictEqual(rows[0].ibkrSymbol, null);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

console.log(JSON.stringify({ ok: true, passed }));
