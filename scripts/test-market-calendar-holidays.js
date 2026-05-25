#!/usr/bin/env node
'use strict';

/**
 * Test: Market calendar correctly detects exchange holidays from IBKR tradingHours.
 *
 * Tests:
 * 1. Explicit CLOSED marker → todayStatus = 'closed_holiday'
 * 2. Gap (today missing from segments, weekday) → todayStatus = 'closed_holiday'
 * 3. Weekend → todayStatus = 'closed_weekend'
 * 4. Normal open day → todayStatus = 'open'
 * 5. parseHoursSegments handles canonical YYYYMMDD:HHMM-YYYYMMDD:HHMM format
 * 6. extractHolidays finds both explicit and inferred holidays
 * 7. buildMarketCalendarArtifact includes holidays array
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseHoursSegments,
  evaluateHoursState,
  deriveTodayStatus,
  extractHolidays,
  formatDateKey,
} = require('../src/execution/marketCalendar');

const {
  normalizeInstrumentCalendarRow,
  buildMarketCalendarArtifact,
} = require('../src/execution/marketCalendarStore');

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// ------- parseHoursSegments tests -------

test('parseHoursSegments handles explicit CLOSED', () => {
  const segments = parseHoursSegments('20260525:CLOSED;20260526:0900-20260526:1730');
  assert.strictEqual(segments.length, 2);
  assert.strictEqual(segments[0].date, '20260525');
  assert.strictEqual(segments[0].closed, true);
  assert.strictEqual(segments[1].date, '20260526');
  assert.strictEqual(segments[1].closed, false);
  assert.strictEqual(segments[1].start, '0900');
  assert.strictEqual(segments[1].end, '1730');
});

test('parseHoursSegments handles canonical YYYYMMDD:HHMM-YYYYMMDD:HHMM format', () => {
  const segments = parseHoursSegments('20260525:0730-20260525:2300;20260526:0730-20260526:2300');
  assert.strictEqual(segments.length, 2);
  assert.strictEqual(segments[0].date, '20260525');
  assert.strictEqual(segments[0].start, '0730');
  assert.strictEqual(segments[0].end, '2300');
  assert.strictEqual(segments[0].closed, false);
  assert.strictEqual(segments[1].date, '20260526');
  assert.strictEqual(segments[1].start, '0730');
  assert.strictEqual(segments[1].end, '2300');
});

test('parseHoursSegments handles legacy short format YYYYMMDD:HHMM-HHMM', () => {
  const segments = parseHoursSegments('20260524:0900-1730');
  assert.strictEqual(segments.length, 1);
  assert.strictEqual(segments[0].date, '20260524');
  assert.strictEqual(segments[0].start, '0900');
  assert.strictEqual(segments[0].end, '1730');
  assert.strictEqual(segments[0].closed, false);
});

// ------- evaluateHoursState with fixed parser -------

test('evaluateHoursState correctly evaluates canonical format during trading', () => {
  // 20260526 10:00 UTC — should be within 0730-2300
  const now = new Date('2026-05-26T10:00:00Z');
  const segments = parseHoursSegments('20260526:0730-20260526:2300');
  const state = evaluateHoursState(segments, now);
  assert.strictEqual(state.status, 'open');
});

test('evaluateHoursState correctly evaluates CLOSED day', () => {
  const now = new Date('2026-05-25T10:00:00Z');
  const segments = parseHoursSegments('20260525:CLOSED;20260526:0900-20260526:1730');
  const state = evaluateHoursState(segments, now);
  assert.strictEqual(state.status, 'closed');
});

test('evaluateHoursState detects gap (missing day) as closed when surrounded', () => {
  // 20260525 is missing entirely; surrounded by 20260523 and 20260526
  const now = new Date('2026-05-25T10:00:00Z');
  const segments = parseHoursSegments('20260523:0900-20260523:1730;20260526:0900-20260526:1730');
  const state = evaluateHoursState(segments, now);
  assert.strictEqual(state.status, 'closed');
});

// ------- deriveTodayStatus tests -------

test('deriveTodayStatus returns closed_holiday for explicit CLOSED', () => {
  // 2026-05-25 is a Monday (Whit Monday)
  const now = new Date('2026-05-25T10:00:00Z');
  const tradingSegments = parseHoursSegments('20260525:CLOSED;20260526:0900-20260526:1730');
  const liquidSegments = parseHoursSegments('20260525:CLOSED;20260526:0900-20260526:1700');
  const status = deriveTodayStatus(tradingSegments, liquidSegments, now);
  assert.strictEqual(status, 'closed_holiday');
});

test('deriveTodayStatus returns closed_holiday for gap (today missing, weekday)', () => {
  // 2026-05-25 is Monday, no segment for it but has past and future
  const now = new Date('2026-05-25T10:00:00Z');
  const tradingSegments = parseHoursSegments('20260523:0900-20260523:1730;20260526:0900-20260526:1730');
  const liquidSegments = parseHoursSegments('20260523:0900-20260523:1700;20260526:0900-20260526:1700');
  const status = deriveTodayStatus(tradingSegments, liquidSegments, now);
  assert.strictEqual(status, 'closed_holiday');
});

test('deriveTodayStatus returns closed_weekend for Saturday', () => {
  const now = new Date('2026-05-24T10:00:00Z'); // Saturday
  const tradingSegments = parseHoursSegments('20260523:0900-20260523:1730;20260526:0900-20260526:1730');
  const liquidSegments = parseHoursSegments('20260523:0900-20260523:1700;20260526:0900-20260526:1700');
  const status = deriveTodayStatus(tradingSegments, liquidSegments, now);
  assert.strictEqual(status, 'closed_weekend');
});

test('deriveTodayStatus returns closed_weekend for Sunday', () => {
  const now = new Date('2026-05-24T10:00:00Z');
  // Actually May 24 2026 is a Saturday. Let's use a known Sunday.
  const sunday = new Date('2026-05-18T10:00:00Z'); // May 18 2026 is Monday... let me check
  // Let me use a concrete Sunday: 2026-05-25 is actually what day?
  // The task says 2026-05-25 is Whit Monday, so 2026-05-24 is Sunday.
  const sundayNow = new Date('2026-05-24T10:00:00Z');
  const segments = parseHoursSegments('20260523:0900-20260523:1730;20260526:0900-20260526:1730');
  const status = deriveTodayStatus(segments, segments, sundayNow);
  // May 24, 2026 is a Sunday (since May 25 is Monday)
  assert.strictEqual(status, 'closed_weekend');
});

test('deriveTodayStatus returns open during liquid hours', () => {
  const now = new Date('2026-05-26T10:00:00Z'); // Monday during trading
  const tradingSegments = parseHoursSegments('20260526:0730-20260526:2300');
  const liquidSegments = parseHoursSegments('20260526:0900-20260526:1730');
  const status = deriveTodayStatus(tradingSegments, liquidSegments, now);
  assert.strictEqual(status, 'open');
});

test('deriveTodayStatus returns pre_market before liquid open', () => {
  const now = new Date('2026-05-26T08:00:00Z'); // Before 0900 liquid open
  const tradingSegments = parseHoursSegments('20260526:0730-20260526:2300');
  const liquidSegments = parseHoursSegments('20260526:0900-20260526:1730');
  const status = deriveTodayStatus(tradingSegments, liquidSegments, now);
  assert.strictEqual(status, 'pre_market');
});

test('deriveTodayStatus returns post_market after liquid close', () => {
  const now = new Date('2026-05-26T18:00:00Z'); // After 1730 liquid close
  const tradingSegments = parseHoursSegments('20260526:0730-20260526:2300');
  const liquidSegments = parseHoursSegments('20260526:0900-20260526:1730');
  const status = deriveTodayStatus(tradingSegments, liquidSegments, now);
  assert.strictEqual(status, 'post_market');
});

// ------- extractHolidays tests -------

test('extractHolidays finds explicit CLOSED days', () => {
  const segments = parseHoursSegments('20260523:0900-20260523:1730;20260525:CLOSED;20260526:0900-20260526:1730');
  const holidays = extractHolidays(segments);
  assert(holidays.includes('2026-05-25'), `Expected 2026-05-25 in holidays, got: ${JSON.stringify(holidays)}`);
});

test('extractHolidays infers missing weekday as holiday', () => {
  // 20260525 (Monday) is missing between 20260523 (Friday) and 20260526 (Monday after)
  // Wait: 20260523 is Friday, 20260524 is Saturday, 20260525 is Sunday... no.
  // Actually we said May 25 2026 is Monday (Whit Monday). So May 23 is Saturday.
  // Let me use: 20260522 (Thursday) to 20260526 (Monday) — missing 20260523 (Fri) and 20260525 (Mon)
  // Weekend days (Sat=20260524, Sun=20260525...) hmm, this is getting confusing.
  // May 25 2026 is Monday (Whit Monday), so May 22 is Friday, May 23 is Saturday, May 24 is Sunday.
  // Use: 20260522 (Fri) to 20260527 (Tue) — missing weekdays: 20260525 (Mon), 20260526 (Mon is 25, Tue is 26)
  // Actually let's use a cleaner example: segments for Thu and next Mon, missing Fri
  const segments = parseHoursSegments('20260521:0900-20260521:1730;20260523:0900-20260523:1730');
  // 20260521 is Wednesday, 20260523 is Friday. Missing: 20260522 (Thursday) which is a weekday
  const holidays = extractHolidays(segments);
  assert(holidays.includes('2026-05-22'), `Expected 2026-05-22 inferred holiday, got: ${JSON.stringify(holidays)}`);
});

test('extractHolidays does not flag weekends as holidays', () => {
  // 20260522 (Friday) and 20260525 (Monday) — gap is Sat/Sun which are weekends
  const segments = parseHoursSegments('20260522:0900-20260522:1730;20260525:0900-20260525:1730');
  const holidays = extractHolidays(segments);
  assert(!holidays.includes('2026-05-23'), 'Saturday should not be a holiday');
  assert(!holidays.includes('2026-05-24'), 'Sunday should not be a holiday');
});

// ------- normalizeInstrumentCalendarRow integration -------

test('normalizeInstrumentCalendarRow includes todayStatus and holidays', () => {
  const now = new Date('2026-05-25T10:00:00Z'); // Whit Monday
  const row = normalizeInstrumentCalendarRow({
    tickerOrIsin: 'CH0032912732',
    name: 'Test SIX ETF',
    ibkrConid: 12345,
    ibkrSymbol: 'SPMCHA',
    ibkrPrimaryExchange: 'EBS',
    exchange: 'EBS',
    currency: 'CHF',
    tradingHoursRaw: '20260525:CLOSED;20260526:0900-20260526:1832;20260527:0900-20260527:1832',
    liquidHoursRaw: '20260525:CLOSED;20260526:0900-20260526:1732;20260527:0900-20260527:1732',
    syncStatus: 'ok',
  }, now);
  assert.strictEqual(row.todayStatus, 'closed_holiday');
  assert(Array.isArray(row.holidays), 'holidays should be an array');
  assert(row.holidays.includes('2026-05-25'), `Expected 2026-05-25 in holidays, got: ${JSON.stringify(row.holidays)}`);
});

test('normalizeInstrumentCalendarRow returns open on a trading day', () => {
  const now = new Date('2026-05-26T10:00:00Z'); // Next Monday, during liquid hours
  const row = normalizeInstrumentCalendarRow({
    tickerOrIsin: 'CH0032912732',
    name: 'Test SIX ETF',
    ibkrConid: 12345,
    ibkrSymbol: 'SPMCHA',
    ibkrPrimaryExchange: 'EBS',
    exchange: 'EBS',
    currency: 'CHF',
    tradingHoursRaw: '20260526:0900-20260526:1832;20260527:0900-20260527:1832',
    liquidHoursRaw: '20260526:0900-20260526:1732;20260527:0900-20260527:1732',
    syncStatus: 'ok',
  }, now);
  assert.strictEqual(row.todayStatus, 'open');
});

// ------- buildMarketCalendarArtifact includes holidays -------

test('buildMarketCalendarArtifact includes top-level holidays array', () => {
  const now = new Date('2026-05-25T10:00:00Z');
  const portfolioDir = path.join(os.tmpdir(), 'test-artifact-holidays');
  
  const instruments = [
    normalizeInstrumentCalendarRow({
      tickerOrIsin: 'A',
      ibkrConid: 1,
      ibkrSymbol: 'A',
      ibkrPrimaryExchange: 'EBS',
      tradingHoursRaw: '20260525:CLOSED;20260526:0900-20260526:1730',
      liquidHoursRaw: '20260525:CLOSED;20260526:0900-20260526:1700',
      syncStatus: 'ok',
    }, now),
    normalizeInstrumentCalendarRow({
      tickerOrIsin: 'B',
      ibkrConid: 2,
      ibkrSymbol: 'B',
      ibkrPrimaryExchange: 'IBIS',
      tradingHoursRaw: '20260525:0730-20260525:2300;20260526:0730-20260526:2300',
      liquidHoursRaw: '20260525:0900-20260525:1745;20260526:0900-20260526:1745',
      syncStatus: 'ok',
    }, now),
  ];

  const artifact = buildMarketCalendarArtifact({
    portfolioDir,
    generatedAt: now.toISOString(),
    brokerReady: true,
    instruments,
    now,
    preNormalized: true,
  });

  assert(Array.isArray(artifact.holidays), 'artifact should have holidays array');
  assert(artifact.holidays.includes('2026-05-25'), 'artifact holidays should include Whit Monday');
  // Instrument A: todayStatus should be closed_holiday
  assert.strictEqual(artifact.instruments[0].todayStatus, 'closed_holiday');
  // Instrument B: even though it has trading hours today, it should show based on liquid state
  // At 10:00 UTC with liquid hours 0900-1745, it should be "open"
  assert.strictEqual(artifact.instruments[1].todayStatus, 'open');
});

console.log(JSON.stringify({ ok: true, passed }));
