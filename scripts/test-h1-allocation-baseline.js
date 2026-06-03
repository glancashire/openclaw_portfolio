#!/usr/bin/env node
'use strict';

/**
 * Regression test for Phase H1-baseline: the baseline JSON must exist,
 * contain the 6 expected instruments, and carry the required per-row
 * and metadata fields.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASELINE_PATH = path.resolve(__dirname, '..', 'docs', 'research', 'h1-baseline-2026-06-03.json');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

test('baseline JSON file exists', () => {
  assert(fs.existsSync(BASELINE_PATH), `expected file at ${BASELINE_PATH}`);
});

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));

test('schema version is h1-allocation-baseline.v1', () => {
  assert.strictEqual(baseline.schema, 'h1-allocation-baseline.v1');
});

test('capturedAt is a valid ISO timestamp', () => {
  assert(baseline.capturedAt, 'expected capturedAt field');
  const d = new Date(baseline.capturedAt);
  assert(!isNaN(d.getTime()), 'capturedAt should be a valid date');
});

test('totalPortfolioValueChf is positive', () => {
  assert(baseline.totalPortfolioValueChf > 0, 'expected positive portfolio value');
});

test('reviewDate is set to 2026-06-17', () => {
  assert.strictEqual(baseline.reviewDate, '2026-06-17');
});

test('decisionOptions array has exactly 3 paths (A, B, C)', () => {
  assert(Array.isArray(baseline.decisionOptions), 'expected decisionOptions array');
  assert.strictEqual(baseline.decisionOptions.length, 3);
});

const EXPECTED_ISINS = [
  'IE00B5BMR087', // SXR8
  'LU0950668870', // EMUAA
  'IE00BLNMYC90', // XDEW
  'IE000OEF25S1', // MWEQ
  'IE00BCLWRD08', // IS3H
  'LU0322248146', // DXS0
];

test('instruments array contains exactly 6 rows', () => {
  assert(Array.isArray(baseline.instruments), 'expected instruments array');
  assert.strictEqual(baseline.instruments.length, 6);
});

test('all 6 expected ISINs are present', () => {
  const found = baseline.instruments.map(i => i.isin);
  for (const isin of EXPECTED_ISINS) {
    assert(found.includes(isin), `expected ISIN ${isin} in instruments`);
  }
});

test('each instrument has required fields', () => {
  const REQUIRED = ['isin', 'ibkrSymbol', 'conid', 'name', 'role', 'thesis',
    'quantity', 'price', 'currency', 'fxToChf', 'valueChf',
    'totalPortfolioValueChf', 'currentAllocationPct', 'targetPct',
    'minPct', 'maxPct', 'driftPct'];
  for (const inst of baseline.instruments) {
    for (const field of REQUIRED) {
      assert(field in inst, `instrument ${inst.isin || '?'} missing field ${field}`);
    }
  }
});

test('new deconcentration ETFs have role=deconcentration_new', () => {
  const newOnes = baseline.instruments.filter(i => ['IE00BLNMYC90', 'IE000OEF25S1', 'IE00BCLWRD08', 'LU0322248146'].includes(i.isin));
  assert.strictEqual(newOnes.length, 4);
  for (const n of newOnes) {
    assert.strictEqual(n.role, 'deconcentration_new', `${n.ibkrSymbol} should have role deconcentration_new`);
  }
});

test('legacy ETFs have role=legacy_mega_cap', () => {
  const legacy = baseline.instruments.filter(i => ['IE00B5BMR087', 'LU0950668870'].includes(i.isin));
  assert.strictEqual(legacy.length, 2);
  for (const l of legacy) {
    assert.strictEqual(l.role, 'legacy_mega_cap', `${l.ibkrSymbol} should have role legacy_mega_cap`);
  }
});

test('allocation percentages sum to less than 100 (sanity check)', () => {
  const sum = baseline.instruments.reduce((s, i) => s + i.currentAllocationPct, 0);
  assert(sum > 0 && sum < 100, `sum of tracked instruments should be between 0 and 100, got ${sum}`);
});

console.log(JSON.stringify({ ok: true, passed }, null, 2));
