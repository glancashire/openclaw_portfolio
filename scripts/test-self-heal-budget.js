#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const {
  applyHealRecipes,
  evaluateRecipeBudget,
  readObservabilityEvents,
  appendObservabilityEvent,
  RETRY_BUDGET,
  COOLDOWN_MINUTES,
} = require('../src/execution/selfHeal');

function freshRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'self-heal-budget-'));
}

const RESTART = 'restart_ibkr_gateway_if_socket_dead';
const DISABLE_CRON = 'disable_cron_after_N_consecutive_errors';

const restartItem = {
  category: 'ibkr_socket_dead',
  severity: 'high',
  symptom: 'connect ECONNREFUSED 127.0.0.1:4001',
  recommendedAction: 'Restart the native IBKR gateway',
  healable: true,
  recipe: RESTART,
};

const cronItem = {
  category: 'cron_excessive_errors',
  severity: 'high',
  symptom: 'job has 12 consecutive errors',
  recommendedAction: 'Disable the cron job',
  healable: true,
  recipe: DISABLE_CRON,
  jobId: 'job-1',
  jobName: 'daily-sync',
};

function recordAttempts(repoRoot, recipe, isoTimestamps) {
  for (const at of isoTimestamps) {
    appendObservabilityEvent(
      { kind: 'self_heal_recipe_attempt', recipe, applied: false, blocked: 'operator_present_restart_only', at },
      { repoRoot },
    );
  }
}

function testBudgetAndCooldownConfigured() {
  // Sanity: the constants exposed for the documented recipes.
  assert.ok(RETRY_BUDGET[RESTART], 'budget configured for restart recipe');
  assert.ok(RETRY_BUDGET[DISABLE_CRON], 'budget configured for disable_cron recipe');
  assert.ok(COOLDOWN_MINUTES[RESTART], 'cooldown configured for restart recipe');
  assert.ok(COOLDOWN_MINUTES[DISABLE_CRON], 'cooldown configured for disable_cron recipe');
}

function testBudgetExhaustion() {
  const repoRoot = freshRepo();
  const day = '2026-05-23T';
  // Pre-record budget worth of attempts within the last 24h, all OUTSIDE
  // the cooldown window (>>30 minutes ago).
  recordAttempts(repoRoot, RESTART, [
    `${day}05:00:00.000Z`,
    `${day}06:00:00.000Z`,
  ]);

  const now = new Date(`${day}10:00:00.000Z`);
  const evalResult = evaluateRecipeBudget(RESTART, { repoRoot, now });
  assert.strictEqual(evalResult.blocked, 'retry_budget_exhausted', `expected retry_budget_exhausted, got ${evalResult.blocked}`);
  assert.strictEqual(evalResult.attempts, 2);

  // Apply pipeline must propagate the budget block (not call the underlying recipe).
  const healed = applyHealRecipes([restartItem], { now, repoRoot, dryRun: true });
  assert.strictEqual(healed.length, 1);
  assert.strictEqual(healed[0].applied, false);
  assert.strictEqual(healed[0].blocked, 'retry_budget_exhausted');
  assert.strictEqual(healed[0].kind, RESTART);
}

function testCooldownActive() {
  const repoRoot = freshRepo();
  // Single attempt 5 minutes ago — well inside the 30-minute cooldown.
  const now = new Date('2026-05-23T10:00:00.000Z');
  const recent = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  recordAttempts(repoRoot, RESTART, [recent]);

  const evalResult = evaluateRecipeBudget(RESTART, { repoRoot, now });
  assert.strictEqual(evalResult.blocked, 'cooldown_active', `expected cooldown_active, got ${evalResult.blocked}`);
  assert.ok(evalResult.cooldownRemainingMs > 0);

  const healed = applyHealRecipes([restartItem], { now, repoRoot, dryRun: true });
  assert.strictEqual(healed[0].blocked, 'cooldown_active');
}

function testWindowsClear() {
  const repoRoot = freshRepo();
  // Old attempts >24h ago — budget window has rolled off.
  const now = new Date('2026-05-23T10:00:00.000Z');
  const old = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
  recordAttempts(repoRoot, RESTART, [old, old]);

  const evalResult = evaluateRecipeBudget(RESTART, { repoRoot, now });
  assert.strictEqual(evalResult.blocked, null, `expected no block after window expiry, got ${evalResult.blocked}`);
  assert.strictEqual(evalResult.attempts, 0);

  const healed = applyHealRecipes([restartItem], { now, repoRoot, dryRun: true });
  // Recipe is still blocked, but for the operator-presence reason — NOT the budget.
  assert.notStrictEqual(healed[0].blocked, 'retry_budget_exhausted');
  assert.notStrictEqual(healed[0].blocked, 'cooldown_active');
}

function testDryRunDoesNotWriteEvents() {
  const repoRoot = freshRepo();
  const now = new Date('2026-05-23T10:00:00.000Z');
  applyHealRecipes([restartItem], { now, repoRoot, dryRun: true });
  const events = readObservabilityEvents({ repoRoot });
  assert.strictEqual(events.length, 0, 'dry-run must not write observability events');
}

function testApplyWritesEvents() {
  const repoRoot = freshRepo();
  const now = new Date('2026-05-23T10:00:00.000Z');
  applyHealRecipes([restartItem], { now, repoRoot, dryRun: false });
  const events = readObservabilityEvents({ repoRoot });
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].kind, 'self_heal_recipe_attempt');
  assert.strictEqual(events[0].recipe, RESTART);
  // Recipe is still operator-blocked — that's fine. Attempt was logged
  // so future runs see budget pressure.
  assert.strictEqual(events[0].applied, false);
}

function testApplyAccumulatesBudget() {
  const repoRoot = freshRepo();
  const t0 = new Date('2026-05-23T05:00:00.000Z');
  const t1 = new Date('2026-05-23T06:00:00.000Z');
  const t2 = new Date('2026-05-23T07:00:00.000Z');

  applyHealRecipes([restartItem], { now: t0, repoRoot, dryRun: false });
  applyHealRecipes([restartItem], { now: t1, repoRoot, dryRun: false });

  // Budget for restart is 2/day — third attempt MUST block.
  const healed = applyHealRecipes([restartItem], { now: t2, repoRoot, dryRun: false });
  assert.strictEqual(healed[0].blocked, 'retry_budget_exhausted');

  // And we did NOT record the 3rd budget-blocked attempt.
  const events = readObservabilityEvents({ repoRoot });
  assert.strictEqual(events.length, 2, `expected 2 events (only successful gate-passes), got ${events.length}`);
}

function testNonHealableUnaffected() {
  const repoRoot = freshRepo();
  const now = new Date('2026-05-23T10:00:00.000Z');
  const result = applyHealRecipes([{ ...restartItem, healable: false }], { now, repoRoot, dryRun: true });
  assert.strictEqual(result.length, 0, 'non-healable items are not surfaced by applyHealRecipes');
}

function main() {
  testBudgetAndCooldownConfigured();
  testBudgetExhaustion();
  testCooldownActive();
  testWindowsClear();
  testDryRunDoesNotWriteEvents();
  testApplyWritesEvents();
  testApplyAccumulatesBudget();
  testNonHealableUnaffected();
  console.log(JSON.stringify({ ok: true, tests: 8 }, null, 2));
}

main();
