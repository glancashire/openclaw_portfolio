'use strict';

const { isMarketOpen, nextOpenTime, EXCHANGE_HOURS } = require('../lib/marketHours');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log('=== lib/marketHours.js ===\n');
console.log('-- isMarketOpen --');

// May 2026: CEST (UTC+2). EBS open 09:00-17:30 CET = 07:00-15:30 UTC
// Wed May 6 2026
assert(isMarketOpen('EBS', new Date('2026-05-06T08:00:00Z')).open === true, 'EBS Wed 10:00 CET (08:00 UTC) → open');
assert(isMarketOpen('EBS', new Date('2026-05-06T07:00:00Z')).open === true, 'EBS Wed 09:00 CET (07:00 UTC, exactly at open) → open');
assert(isMarketOpen('EBS', new Date('2026-05-06T15:29:00Z')).open === true, 'EBS Wed 17:29 CET (15:29 UTC, 1 min before close) → open');
assert(isMarketOpen('EBS', new Date('2026-05-06T15:30:00Z')).open === false, 'EBS Wed 17:30 CET (15:30 UTC, exactly at close) → closed');
assert(isMarketOpen('EBS', new Date('2026-05-06T06:59:00Z')).open === false, 'EBS Wed 08:59 CET (06:59 UTC, 1 min before open) → closed');
assert(isMarketOpen('EBS', new Date('2026-05-06T16:00:00Z')).open === false, 'EBS Wed 18:00 CET (16:00 UTC) → closed');
assert(isMarketOpen('EBS', new Date('2026-05-06T03:00:00Z')).open === false, 'EBS Wed 05:00 CET (03:00 UTC) → closed');

// Weekend: Sat May 9, Sun May 10 2026
assert(isMarketOpen('EBS', new Date('2026-05-09T10:00:00Z')).open === false, 'EBS Saturday → closed');
assert(isMarketOpen('EBS', new Date('2026-05-10T10:00:00Z')).open === false, 'EBS Sunday → closed');

// Monday May 4 2026
assert(isMarketOpen('EBS', new Date('2026-05-04T08:00:00Z')).open === true, 'EBS Monday 10:00 CET → open');

// Friday May 8 2026
assert(isMarketOpen('EBS', new Date('2026-05-08T14:00:00Z')).open === true, 'EBS Friday 16:00 CET → open');

// All exchanges at midday CET (10:00 UTC)
for (const ex of ['EBS', 'IBIS2', 'LSEETF', 'SMART']) {
  const r = isMarketOpen(ex, new Date('2026-05-06T10:00:00Z'));
  assert(r.open === true, `${ex} midday → open`);
}

// Unknown exchange falls back to SMART
const unknown = isMarketOpen('UNKNOWN_EX', new Date('2026-05-06T10:00:00Z'));
assert(unknown.open === true, 'Unknown exchange falls back to SMART');

// Reason strings
assert(isMarketOpen('EBS', new Date('2026-05-10T10:00:00Z')).reason.includes('Weekend'), 'Weekend reason');
assert(isMarketOpen('EBS', new Date('2026-05-06T05:00:00Z')).reason.includes('Before open'), 'Before open reason');
assert(isMarketOpen('EBS', new Date('2026-05-06T16:00:00Z')).reason.includes('After close'), 'After close reason');
assert(isMarketOpen('EBS', new Date('2026-05-06T10:00:00Z')).reason.includes('open'), 'Open reason');

console.log('\n-- nextOpenTime --');
const next = nextOpenTime('EBS');
assert(typeof next === 'string', 'Returns string');
assert(next.includes('T'), 'ISO format');
const nextDate = new Date(next);
assert(nextDate > new Date('2026-01-01'), 'Next open is in the future');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
