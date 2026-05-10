'use strict';

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const assert = require('assert');

const cli = path.join(process.cwd(), 'scripts', 'trade.js');

function run(args) {
  return execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: process.cwd() });
}

function runAllowFailure(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: process.cwd() });
}

const help = run(['help']);
assert(help.includes('preflight'), 'Expected help to mention preflight');
assert(help.includes('arm-open'), 'Expected help to mention arm-open');
assert(help.includes('disarm-open'), 'Expected help to mention disarm-open');

const preflight = runAllowFailure(['preflight', '--json']);
assert([0, 2].includes(preflight.status), `Expected preflight exit 0 or 2, got ${preflight.status}`);
const parsed = JSON.parse(preflight.stdout);
assert(typeof parsed.ok === 'boolean', 'Expected preflight JSON result');
assert(Array.isArray(parsed.blockers), 'Expected blockers array');

console.log(JSON.stringify({ ok: true }, null, 2));
