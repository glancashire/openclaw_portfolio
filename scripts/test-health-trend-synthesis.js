#!/usr/bin/env node
'use strict';

/* Phase W3: regression test for summarizeHealthTrends().
 *
 * Verifies that the direction classifier accurately reflects the mix of
 * recent health-check events, especially the `degraded` state that was
 * previously falling through to a misleading "stable" summary.
 */

const assert = require('assert');
const { summarizeHealthTrends } = require('../src/reporting/healthReport');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function mkEvent(health) {
  return { kind: 'health_check', health, ts: new Date().toISOString() };
}

test('empty events → direction=unknown', () => {
  const r = summarizeHealthTrends([]);
  assert.strictEqual(r.direction, 'unknown');
  assert.match(r.summary, /no recent/i);
});

test('all healthy → direction=stable', () => {
  const events = Array(5).fill(null).map(() => mkEvent('healthy'));
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'stable');
  assert.match(r.summary, /stable/i);
  assert(!r.summary.includes('degraded'), 'should not mention degraded');
});

test('all degraded → direction=watching', () => {
  const events = Array(7).fill(null).map(() => mkEvent('degraded'));
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'watching');
  assert.match(r.summary, /watching/i);
  assert.match(r.summary, /degraded/i);
});

test('all blocked → direction=worsening', () => {
  const events = Array(4).fill(null).map(() => mkEvent('blocked'));
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'worsening');
  assert.match(r.summary, /worsening/i);
});

test('majority blocked → direction=worsening', () => {
  const events = [mkEvent('healthy'), mkEvent('blocked'), mkEvent('blocked'), mkEvent('blocked')];
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'worsening');
});

test('latest healthy, prior blocked minority → direction=improving', () => {
  const events = [mkEvent('degraded'), mkEvent('blocked'), mkEvent('healthy'), mkEvent('healthy'), mkEvent('healthy')];
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'improving');
  assert.match(r.summary, /improving/i);
});

test('latest healthy, prior degraded → direction=improving', () => {
  const events = [mkEvent('degraded'), mkEvent('degraded'), mkEvent('healthy')];
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'improving');
});

test('mix of degraded + healthy with latest degraded → direction=watching', () => {
  const events = [mkEvent('healthy'), mkEvent('degraded'), mkEvent('healthy'), mkEvent('degraded')];
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'watching');
});

test('paused treated as blocked for worsening', () => {
  const events = [mkEvent('healthy'), mkEvent('paused'), mkEvent('paused'), mkEvent('paused')];
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'worsening');
});

test('attention_needed treated as degraded for watching', () => {
  const events = Array(5).fill(null).map(() => mkEvent('attention_needed'));
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'watching');
});

test('limit parameter respected', () => {
  const old = Array(10).fill(null).map(() => mkEvent('blocked'));
  const recent = Array(3).fill(null).map(() => mkEvent('healthy'));
  const r = summarizeHealthTrends([...old, ...recent], { limit: 3 });
  assert.strictEqual(r.direction, 'stable');
});

test('non-health_check events are filtered out', () => {
  const events = [
    { kind: 'other_event', health: 'blocked' },
    mkEvent('healthy'),
    mkEvent('healthy'),
  ];
  const r = summarizeHealthTrends(events);
  assert.strictEqual(r.direction, 'stable');
});

console.log(JSON.stringify({ ok: true, passed }));
