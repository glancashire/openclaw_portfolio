'use strict';

const { isMarketOpen, nextOpenTime } = require('../lib/marketHours');
const { validateTradeList } = require('../lib/etfQualityFilter');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

// --- Market Hours Tests ---
console.log('=== Market Hours Guard ===');

// Simulate a Wednesday at 10:00 CET
const wedMorning = new Date('2026-05-06T08:00:00Z'); // 10:00 CET
const result1 = isMarketOpen('EBS', wedMorning);
assert(result1.open === true, 'Wednesday 10:00 CET → market open');

// Simulate a Wednesday at 18:00 CET (after close)
const wedEvening = new Date('2026-05-06T16:00:00Z'); // 18:00 CET
const result2 = isMarketOpen('EBS', wedEvening);
assert(result2.open === false, 'Wednesday 18:00 CET → market closed');

// Simulate a Saturday
const saturday = new Date('2026-05-09T10:00:00Z'); // Saturday
const result3 = isMarketOpen('EBS', saturday);
assert(result3.open === false, 'Saturday 12:00 → market closed (weekend)');

// Simulate before open
const earlyMorning = new Date('2026-05-06T05:30:00Z'); // 07:30 CET = 05:30 UTC
const result4 = isMarketOpen('EBS', earlyMorning);
assert(result4.open === false, 'Wednesday 07:30 CET → before open');

// Next open time
const next = nextOpenTime('EBS');
assert(typeof next === 'string' && next.includes('T'), 'nextOpenTime returns ISO string');

// --- ETF Quality Filter Tests ---
console.log('\n=== ETF Quality Filter ===');

// All valid instruments
const validTrades = [{ symbol: 'SLICHA' }, { symbol: 'EMUAA' }, { symbol: 'VUSA' }];
const r1 = validateTradeList(validTrades);
assert(r1.allPass === true, 'Physical ETFs with low TER pass');

// Unknown instrument
const unknownTrades = [{ symbol: 'FAKE_ETF' }];
const r2 = validateTradeList(unknownTrades);
assert(r2.allPass === false, 'Unknown instrument fails');
assert(r2.results[0].reasons[0].includes('Unknown'), 'Reason mentions unknown');

// --- Execute-trades market guard ---
console.log('\n=== Execute-trades market closed guard ===');
const { execSync } = require('child_process');
try {
  execSync('node scripts/execute-trades.js 2>&1', { encoding: 'utf8', cwd: '/home/ubuntu/.openclaw/workspace' });
  assert(false, 'execute-trades should fail when market closed');
} catch (e) {
  assert(e.stdout.includes('Market is closed') || e.stderr.includes('Market is closed') || e.status === 1, 'execute-trades rejects when market closed');
}

// --- Submit-orders market guard ---
console.log('\n=== Submit-orders market closed guard ===');
try {
  execSync('node scripts/submit-orders-at-open.js 2>&1', { encoding: 'utf8', cwd: '/home/ubuntu/.openclaw/workspace' });
  assert(false, 'submit-orders should fail when market closed');
} catch (e) {
  assert(e.stdout.includes('Market is closed') || e.stderr.includes('Market is closed') || e.status === 1, 'submit-orders rejects when market closed');
}

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
