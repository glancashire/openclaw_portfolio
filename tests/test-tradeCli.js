'use strict';

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0, failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

function run(cmd) {
  try {
    return { out: execSync(cmd, { encoding: 'utf8', cwd: ROOT, timeout: 30000 }), code: 0 };
  } catch (e) {
    return { out: (e.stdout || '') + (e.stderr || ''), code: e.status || 1 };
  }
}

console.log('=== scripts/trade.js CLI ===\n');

// Help
console.log('-- help --');
const help = run('node scripts/trade.js --help');
assert(help.code === 0, 'help exits 0');
assert(help.out.includes('Trading CLI'), 'help shows title');
assert(help.out.includes('validate'), 'help lists validate');
assert(help.out.includes('submit'), 'help lists submit');
assert(help.out.includes('status'), 'help lists status');
assert(help.out.includes('cancel'), 'help lists cancel');
assert(help.out.includes('history'), 'help lists history');

// Validate
console.log('\n-- validate --');
const val = run('node scripts/trade.js validate');
assert(val.code === 0, 'validate exits 0');
assert(val.out.includes('ALL PASS'), 'validate shows ALL PASS');

// Validate JSON
const valJson = run('node scripts/trade.js validate --json');
assert(valJson.code === 0, 'validate --json exits 0');
const parsed = JSON.parse(valJson.out);
assert(parsed.allPass === true, 'validate --json allPass is true');

// Status
console.log('\n-- status --');
const status = run('node scripts/trade.js status');
assert(status.code === 0, 'status exits 0 (graceful degradation when IB offline)');
assert(status.out.includes('Open Orders') || status.out.includes('open'), 'status shows orders section');

// Submit (market closed)
console.log('\n-- submit (market closed) --');
const submit = run('node scripts/trade.js submit');
assert(submit.code === 1, 'submit exits 1 when market closed');
assert(submit.out.includes('Market is closed'), 'submit shows market closed message');

// Unknown command
console.log('\n-- unknown command --');
const unk = run('node scripts/trade.js foobar');
assert(unk.code === 1, 'unknown command exits 1');
assert(unk.out.includes('Unknown command'), 'shows unknown command error');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
