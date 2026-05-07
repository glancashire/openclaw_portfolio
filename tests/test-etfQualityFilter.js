'use strict';

const { validateInstrumentQuality, filterByReplication, rankByTer, validateTradeList, ETF_METADATA, loadPolicy } = require('../lib/etfQualityFilter');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log('=== lib/etfQualityFilter.js ===\n');

// --- loadPolicy ---
console.log('-- loadPolicy --');
const policy = loadPolicy();
assert(policy.replicationMethod === 'physical', 'Policy requires physical replication');
assert(policy.maxTerPct === 0.25, 'Policy max TER is 0.25%');
assert(policy.allowExplicitOverride === true, 'Policy allows explicit override');

// --- validateInstrumentQuality ---
console.log('\n-- validateInstrumentQuality --');

// Known physical ETFs pass
const r1 = validateInstrumentQuality('SLICHA');
assert(r1.pass === true, 'SLICHA (physical, 0.20%) passes');
assert(r1.meta.terPct === 0.20, 'SLICHA TER is 0.20%');

const r2 = validateInstrumentQuality('EMUAA');
assert(r2.pass === true, 'EMUAA (physical, 0.09%) passes');

const r3 = validateInstrumentQuality('VUSA');
assert(r3.pass === true, 'VUSA (physical, 0.07%) passes');

// Unknown symbol fails
const r4 = validateInstrumentQuality('FAKE_SYNTH');
assert(r4.pass === false, 'Unknown symbol fails');
assert(r4.reasons[0].includes('Unknown'), 'Reason mentions unknown');

// High TER fails (mock by passing custom policy)
const strictPolicy = { replicationMethod: 'physical', maxTerPct: 0.08 };
const r5 = validateInstrumentQuality('SLICHA', strictPolicy);
assert(r5.pass === false, 'SLICHA fails with strict 0.08% TER policy');
assert(r5.reasons.some(r => r.includes('TER')), 'Reason mentions TER');

// --- filterByReplication ---
console.log('\n-- filterByReplication --');
const allSymbols = Object.keys(ETF_METADATA);
const physical = filterByReplication(allSymbols);
assert(physical.length === allSymbols.length, 'All known ETFs are physical');
assert(filterByReplication(['FAKE']).length === 0, 'Unknown symbols filtered out');

// --- rankByTer ---
console.log('\n-- rankByTer --');
const ranked = rankByTer(['SLICHA', 'EMUAA', 'VUSA', 'SPY5']);
assert(ranked[0].symbol === 'VUSA', 'VUSA ranked first (0.07%)');
assert(ranked[ranked.length - 1].symbol === 'SLICHA', 'SLICHA ranked last (0.20%)');
assert(ranked.every((r, i) => i === 0 || r.terPct >= ranked[i-1].terPct), 'Sorted ascending by TER');

// --- validateTradeList ---
console.log('\n-- validateTradeList --');
const valid = validateTradeList([{symbol:'SLICHA'},{symbol:'EMUAA'},{symbol:'VUSA'}]);
assert(valid.allPass === true, 'All valid instruments pass');

const mixed = validateTradeList([{symbol:'VUSA'},{symbol:'UNKNOWN_X'}]);
assert(mixed.allPass === false, 'Mixed list with unknown fails');
assert(mixed.results[0].pass === true, 'VUSA still passes individually');
assert(mixed.results[1].pass === false, 'UNKNOWN_X fails');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
