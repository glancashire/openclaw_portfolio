#!/usr/bin/env node
'use strict';

/* Phase Cleanup-1H regression: the IBKR recovery runbook must keep the
 * Step 6 'quote posture remains unknown' operator-gated section so the
 * doc doesn't accidentally lose the only authoritative pointer toward
 * the IBKR client portal flow.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const RUNBOOK = path.resolve(__dirname, '..', 'docs', 'operations', 'ibkr-recovery.md');
const text = fs.readFileSync(RUNBOOK, 'utf8');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

test('runbook contains Step 6 section', () => {
  assert.match(text, /## Step 6 — Quote posture remains `unknown`/);
});

test('Step 6 surfaces the IBKR client portal URL', () => {
  assert.match(text, /interactivebrokers\.com\/sso\/Login/);
});

test('Step 6 mentions Market Data Subscriptions navigation', () => {
  assert.match(text, /Market Data Subscriptions/);
});

test('Step 6 includes the ib_insync cross-check', () => {
  assert.match(text, /from ib_insync import IB/);
  assert.match(text, /reqMktData/);
});

test('Step 6 names the operator-gated nature explicitly', () => {
  assert.match(text, /operator-gated/i);
});

test('runbook keeps tier-1 ibkr-fast-status reference', () => {
  assert.match(text, /node scripts\/ibkr-fast-status\.js/);
});

console.log(JSON.stringify({ ok: true, passed }, null, 2));
