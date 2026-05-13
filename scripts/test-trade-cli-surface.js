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
assert(help.includes('authority'), 'Expected help to mention authority');
assert(help.includes('arm-open'), 'Expected help to mention arm-open');
assert(help.includes('disarm-open'), 'Expected help to mention disarm-open');
assert(help.includes('reconcile-live'), 'Expected help to mention reconcile-live');

const preflight = runAllowFailure(['preflight', '--json']);
assert([0, 2].includes(preflight.status), `Expected preflight exit 0 or 2, got ${preflight.status}`);
const parsed = JSON.parse(preflight.stdout);
assert(typeof parsed.ok === 'boolean', 'Expected preflight JSON result');
assert(Array.isArray(parsed.blockers), 'Expected blockers array');

const authority = run(['authority', '--json']);
const authorityParsed = JSON.parse(authority);
assert(authorityParsed.executionMode, 'Expected authority execution mode');
assert(authorityParsed.brokerReadiness && typeof authorityParsed.brokerReadiness === 'object', 'Expected authority broker readiness');
assert(authorityParsed.liveArm && typeof authorityParsed.liveArm === 'object', 'Expected authority live arm state');
assert(authorityParsed.effectiveAuthority && typeof authorityParsed.effectiveAuthority.liveExecutionPossibleNow === 'boolean', 'Expected authority effective block');

console.log(JSON.stringify({ ok: true }, null, 2));
