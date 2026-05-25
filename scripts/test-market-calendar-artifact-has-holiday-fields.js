#!/usr/bin/env node
'use strict';

/* Regression test: persisted market-calendar artifact carries semantic
 * todayStatus per instrument and a top-level holidays array (added 2026-05-25
 * as part of the bugfix that detected Whit Monday closure of SIX/Xetra).
 *
 * This test does NOT hit the broker. It builds an artifact in-memory from a
 * known-good tradingHours string and verifies the persistence layer keeps the
 * new fields.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  buildMarketCalendarArtifact,
  normalizeInstrumentCalendarRow,
  writeMarketCalendarArtifact,
  readMarketCalendarArtifact,
} = require('../src/execution/marketCalendarStore');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

test('persisted artifact carries todayStatus per instrument and top-level holidays', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-holiday-art-'));
  const portfolioDir = path.join(tmpDir, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  const runtimeRoot = path.join(tmpDir, 'runtime');

  // Pin "now" to Whit Monday 2026 so the holiday detector has deterministic input.
  const now = new Date('2026-05-25T10:00:00Z');

  // Trading hours: open last Fri (2026-05-22), CLOSED today (Whit Monday), open tomorrow.
  const tradingHours = '20260522:0900-20260522:1730;20260525:CLOSED;20260526:0900-20260526:1730';

  const six = normalizeInstrumentCalendarRow({
    tickerOrIsin: 'CH0130595124',
    ibkrConid: 91639399,
    ibkrSymbol: 'SPMCHA',
    ibkrPrimaryExchange: 'EBS',
    exchange: 'EBS',
    currency: 'CHF',
    tradingHoursRaw: tradingHours,
    liquidHoursRaw: tradingHours,
    syncStatus: 'ok',
    sourceKind: 'ibkr_contract',
  }, now);

  // A non-Swiss instrument that is OPEN today should report todayStatus=open.
  const tradingHoursOpen = '20260522:0900-20260522:1730;20260525:0900-20260525:1730;20260526:0900-20260526:1730';
  const xetra = normalizeInstrumentCalendarRow({
    tickerOrIsin: 'IE00B5BMR087',
    ibkrConid: 75776072,
    ibkrSymbol: 'SXR8',
    ibkrPrimaryExchange: 'IBIS',
    exchange: 'IBIS',
    currency: 'EUR',
    tradingHoursRaw: tradingHoursOpen,
    liquidHoursRaw: tradingHoursOpen,
    syncStatus: 'ok',
    sourceKind: 'ibkr_contract',
  }, now);

  const artifact = buildMarketCalendarArtifact({
    portfolioDir,
    generatedAt: now.toISOString(),
    brokerReady: true,
    instruments: [six, xetra],
    now,
    preNormalized: true,
  });

  writeMarketCalendarArtifact({ portfolioDir, runtimeRoot, artifact });
  const persisted = readMarketCalendarArtifact({ portfolioDir, runtimeRoot });
  assert(persisted, 'expected persisted artifact to be readable');

  // Top-level holidays union
  assert(Array.isArray(persisted.holidays), 'expected top-level holidays array');
  assert(persisted.holidays.includes('2026-05-25'), `expected 2026-05-25 in holidays, got ${JSON.stringify(persisted.holidays)}`);

  // Per-instrument todayStatus
  const byTicker = Object.fromEntries((persisted.instruments || []).map((i) => [i.tickerOrIsin, i]));
  assert(byTicker['CH0130595124'], 'expected SIX instrument to be persisted');
  assert.strictEqual(
    byTicker['CH0130595124'].todayStatus,
    'closed_holiday',
    `expected SPMCHA todayStatus=closed_holiday, got ${byTicker['CH0130595124'].todayStatus}`,
  );
  assert(
    Array.isArray(byTicker['CH0130595124'].holidays) && byTicker['CH0130595124'].holidays.includes('2026-05-25'),
    `expected SPMCHA.holidays to include 2026-05-25, got ${JSON.stringify(byTicker['CH0130595124'].holidays)}`,
  );

  assert(byTicker['IE00B5BMR087'], 'expected Xetra instrument to be persisted');
  assert.strictEqual(
    byTicker['IE00B5BMR087'].todayStatus,
    'open',
    `expected SXR8 todayStatus=open, got ${byTicker['IE00B5BMR087'].todayStatus}`,
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

console.log(JSON.stringify({ ok: true, passed }));
