#!/usr/bin/env node
'use strict';

/* Regression test for Phase F6: the basket-lifecycle path must continue to
 * defer investor email rendering and surface the deferral with a stable,
 * machine-readable reason string. Future refactors can move the comment
 * around freely as long as this contract holds.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.resolve(__dirname, '..', 'src', 'execution', 'basketLifecycle.js');
const src = fs.readFileSync(SOURCE_PATH, 'utf8');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

test('basketLifecycle defers email with the canonical reason string', () => {
  assert(
    src.includes("reason: 'deferred_to_monitor_fills_cron'"),
    "expected reason string 'deferred_to_monitor_fills_cron' in basketLifecycle.js",
  );
});

test('basketLifecycle does NOT send email itself (no notifyTradeFill direct call from this block)', () => {
  // The reproposal hook is allowed to call other things; the per-fill block
  // must explicitly push a result with attempted:false rather than dispatching
  // an email synchronously.
  const block = src.match(/notifyResults\.push\(\{[^}]*attempted: false[^}]*sent: false[^}]*\}/);
  assert(block, 'expected the per-fill push with attempted:false + sent:false');
});

test('basketLifecycle log line points at monitor-fills, not "post-resync path"', () => {
  assert(
    src.includes('investor email handed off to monitor-fills cron'),
    'expected log line referring to monitor-fills cron',
  );
  assert(
    !src.includes('deferred to post-resync path'),
    'old "post-resync path" wording should be retired',
  );
});

test('basketLifecycle no longer references the legacy "Phase 1 fix" comment', () => {
  assert(
    !src.includes('Phase 1 fix:'),
    'legacy "Phase 1 fix:" comment should be retired in favour of the architectural note',
  );
});

test('basketLifecycle architectural comment names the responsible runner explicitly', () => {
  assert(
    src.includes('scripts/monitor-fills.js'),
    'comment should name scripts/monitor-fills.js as the runner',
  );
  assert(
    /portfolio-etf-monitor-fills/.test(src),
    'comment should name the cron job id portfolio-etf-monitor-fills',
  );
  assert(
    src.includes('lib/tradeNotificationEmail.js'),
    'comment should reference lib/tradeNotificationEmail.js as the renderer',
  );
});

console.log(JSON.stringify({ ok: true, passed }, null, 2));
