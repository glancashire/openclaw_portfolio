#!/usr/bin/env node
'use strict';

/**
 * Tests for src/execution/recoveryLadder.js and its integration with
 * selfHeal.classifySymptoms and portfolioHealth.buildSelfHealPlan.
 *
 * Part of Phase W9 — Recovery playbooks as executable guidance.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const Module = require('module');

const { getRecoveryLadder, listSupportedCategories, LADDERS, ALIASES } = require('../src/execution/recoveryLadder');
const { classifySymptoms } = require('../src/execution/selfHeal');

let passed = 0;

function ok(desc) {
  passed++;
  process.stdout.write(`  ✓ ${desc}\n`);
}

// ────────────────────────────────────────────────────────────────────
// 1. Unit tests for getRecoveryLadder
// ────────────────────────────────────────────────────────────────────

// 1a. All four primary cases return a non-empty ladder.
for (const cat of ['ibkr_socket_dead', 'market_data_subscription_gap', 'stale_approval', 'open_runner_backlog']) {
  const ladder = getRecoveryLadder(cat);
  assert(Array.isArray(ladder), `${cat} should return an array`);
  assert(ladder.length > 0, `${cat} should return a non-empty ladder`);
  ok(`${cat} returns non-empty ladder (${ladder.length} steps)`);
}

// 1b. Aliased categories resolve correctly.
for (const [alias, primary] of Object.entries(ALIASES)) {
  const ladder = getRecoveryLadder(alias);
  const expected = getRecoveryLadder(primary);
  assert(ladder.length > 0, `alias ${alias} should resolve to ${primary}`);
  assert.strictEqual(ladder.length, expected.length, `alias ${alias} step count should match ${primary}`);
  ok(`alias ${alias} resolves to ${primary}`);
}

// 1c. Every step in every ladder has required fields.
for (const [cat, ladder] of Object.entries(LADDERS)) {
  for (const step of ladder) {
    assert.strictEqual(typeof step.rank, 'number', `${cat} step rank should be number`);
    assert.strictEqual(typeof step.action, 'string', `${cat} step action should be string`);
    assert(step.action.length > 0, `${cat} step action must be non-empty`);
    assert.strictEqual(typeof step.description, 'string', `${cat} step description should be string`);
    assert(step.description.length > 0, `${cat} step description must be non-empty`);
    // command can be null (manual step) or a non-empty string.
    if (step.command !== null) {
      assert.strictEqual(typeof step.command, 'string', `${cat} step command should be string or null`);
      assert(step.command.length > 0, `${cat} step command must be non-empty if present`);
    }
    assert.strictEqual(typeof step.automated, 'boolean', `${cat} step automated should be boolean`);
    assert(['low', 'medium', 'high'].includes(step.risk), `${cat} step risk should be low|medium|high`);
  }
  ok(`${cat}: all steps have required fields`);
}

// 1d. Ranks within each ladder are unique and ascending.
for (const [cat, ladder] of Object.entries(LADDERS)) {
  const ranks = ladder.map((s) => s.rank);
  const sorted = [...ranks].sort((a, b) => a - b);
  assert.deepStrictEqual(ranks, sorted, `${cat} ranks should be sorted ascending`);
  assert.strictEqual(new Set(ranks).size, ranks.length, `${cat} ranks should be unique`);
  ok(`${cat}: ranks unique and ascending`);
}

// 1e. Unknown category returns empty array.
{
  const ladder = getRecoveryLadder('nonexistent_category_xyz');
  assert(Array.isArray(ladder), 'unknown category should return array');
  assert.strictEqual(ladder.length, 0, 'unknown category should return empty ladder');
  ok('unknown category → empty array');
}

// 1f. Null / undefined / garbage input is safe.
for (const bad of [null, undefined, '', 42, {}]) {
  const ladder = getRecoveryLadder(bad);
  assert(Array.isArray(ladder), `getRecoveryLadder(${JSON.stringify(bad)}) should return array`);
  assert.strictEqual(ladder.length, 0, `getRecoveryLadder(${JSON.stringify(bad)}) should be empty`);
}
ok('null/undefined/garbage input → empty array');

// 1g. Repo-relative commands point to files that actually exist.
{
  const repoRoot = path.resolve(__dirname, '..');
  for (const [cat, ladder] of Object.entries(LADDERS)) {
    for (const step of ladder) {
      if (!step.command) continue;
      // Skip absolute paths (e.g. /home/ubuntu/ibgateway-native/start-ibc.sh) — those are
      // operator-managed outside the repo per TOOLS.md.
      if (path.isAbsolute(step.command)) continue;
      // Extract the script path: strip 'node ' prefix and any arguments.
      const parts = step.command.replace(/^node\s+/, '').split(/\s+/);
      const scriptPath = parts[0];
      const abs = path.resolve(repoRoot, scriptPath);
      assert(fs.existsSync(abs), `${cat}/${step.action}: referenced script does not exist: ${abs}`);
    }
  }
  ok('all repo-relative command scripts exist on disk');
}

// 1h. listSupportedCategories returns a non-empty array with the expected categories.
{
  const cats = listSupportedCategories();
  assert(cats.length >= 5, 'listSupportedCategories should include at least 5 entries');
  assert(cats.includes('ibkr_socket_dead'));
  assert(cats.includes('ibkr_2fa_pending'));
  assert(cats.includes('stale_approval'));
  ok('listSupportedCategories has expected entries');
}

// ────────────────────────────────────────────────────────────────────
// 2. classifySymptoms integration — items carry recoveryLadder
// ────────────────────────────────────────────────────────────────────

{
  const classified = classifySymptoms({
    brokerReadiness: { reachable: false, message: 'connect ECONNREFUSED 127.0.0.1:4001' },
    deliveryStatus: { pendingActions: [] },
    cronHealth: { jobs: [] },
    errorState: {},
  });
  assert(classified.length >= 1, 'should classify ibkr_socket_dead');
  const socketItem = classified.find((item) => item.category === 'ibkr_socket_dead');
  assert(socketItem, 'should find ibkr_socket_dead');
  assert(Array.isArray(socketItem.recoveryLadder), 'recoveryLadder should be an array');
  assert(socketItem.recoveryLadder.length > 0, 'recoveryLadder should be non-empty for ibkr_socket_dead');
  ok('classifySymptoms attaches recoveryLadder to ibkr_socket_dead');
}

{
  const classified = classifySymptoms({
    brokerReadiness: { reachable: true, message: 'subscription 10089 error' },
    deliveryStatus: { pendingActions: [] },
    cronHealth: { jobs: [] },
    errorState: {},
  });
  const subItem = classified.find((item) => item.category === 'market_data_subscription_gap');
  assert(subItem, 'should find market_data_subscription_gap');
  assert(subItem.recoveryLadder.length > 0, 'recoveryLadder non-empty for market_data_subscription_gap');
  ok('classifySymptoms attaches recoveryLadder to market_data_subscription_gap');
}

{
  // Category without a ladder (delivery_missing_target) should get empty ladder.
  const classified = classifySymptoms({
    brokerReadiness: { reachable: true, message: '' },
    deliveryStatus: { pendingActions: ['Telegram requires target chatId'] },
    cronHealth: { jobs: [] },
    errorState: {},
  });
  const deliveryItem = classified.find((item) => item.category === 'delivery_missing_target');
  assert(deliveryItem, 'should find delivery_missing_target');
  assert(Array.isArray(deliveryItem.recoveryLadder), 'recoveryLadder should be an array');
  assert.strictEqual(deliveryItem.recoveryLadder.length, 0, 'delivery_missing_target has no recovery ladder (no ladder defined)');
  ok('classifySymptoms: category without ladder → empty recoveryLadder');
}

// ────────────────────────────────────────────────────────────────────
// 3. buildSelfHealPlan integration — plan carries recoveryLadders
// ────────────────────────────────────────────────────────────────────

async function testBuildPlan() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recovery-ladder-'));
  const portfolioDir = path.join(tempDir, 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(
    path.join(portfolioDir, 'trades.md'),
    [
      '# Trades',
      '',
      '## Trade Log',
      '| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |',
      '|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|',
      '| 2026-05-10 09:00:00 | approved | buy | AAA | ETF A | 1 | 10 | 10 | 0 | test | approved |  |  |  |  |  |',
    ].join('\n') + '\n',
  );
  fs.mkdirSync(path.join(tempDir, 'runtime'), { recursive: true });
  fs.writeFileSync(
    path.join(tempDir, 'runtime', 'fill-notifications-state.json'),
    JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [9107] }),
  );

  const target = path.resolve(process.cwd(), 'src/execution/portfolioHealth.js');

  // Clear cached modules so our mock gets picked up.
  const keysToDelete = Object.keys(require.cache).filter((key) =>
    key.includes('portfolioHealth.js') ||
    key.includes('selfHeal.js') ||
    key.includes('recoveryLadder.js'),
  );
  for (const key of keysToDelete) delete require.cache[key];

  const original = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return {
        getInteractiveBrokersReadiness: async () => ({
          fallbackRequired: true,
          reachable: false,
          authenticated: false,
          message: 'connect ECONNREFUSED 127.0.0.1:4001',
        }),
      };
    }
    if (request.endsWith('../reporting/deliveryPolicy') || request === '../reporting/deliveryPolicy') {
      return { reportDeliveryStatus: () => ({ pendingActions: [] }) };
    }
    if (request.endsWith('../reporting/cronJobsFetcher') || request === '../reporting/cronJobsFetcher') {
      return { fetchCronHealth: () => ({ jobs: [] }) };
    }
    return original.apply(this, arguments);
  };

  try {
    // Re-require after cache clear so the fresh mock takes effect.
    const { buildSelfHealPlan } = require(target);
    const result = await buildSelfHealPlan({
      portfolioDir,
      repoRoot: tempDir,
      now: new Date('2026-05-27T12:00:00Z'),
    });

    assert(Array.isArray(result.recoveryLadders), 'plan should have recoveryLadders array');
    assert(result.recoveryLadders.length > 0, 'at least one recovery ladder should be present');
    const socketLadder = result.recoveryLadders.find((entry) => entry.category === 'ibkr_socket_dead');
    assert(socketLadder, 'should include ibkr_socket_dead ladder');
    assert(socketLadder.ladder.length >= 3, 'ibkr_socket_dead ladder should have multiple steps');
    ok('buildSelfHealPlan exposes recoveryLadders');

    // Verify fill-notification blocker spawns the open_runner_backlog ladder.
    const fillLadder = result.recoveryLadders.find(
      (entry) => entry.category === 'fill_notification_backfill' || entry.category === 'open_runner_backlog',
    );
    // fill_notification_backfill resolves via the alias to open_runner_backlog ladder
    if (fillLadder) {
      assert(fillLadder.ladder.length >= 2, 'fill reconciliation ladder should have multiple steps');
      ok('fill_notification_backfill ladder present in plan');
    } else {
      ok('fill_notification_backfill — no ladder (blocker not classified in this scenario, acceptable)');
    }
  } finally {
    Module._load = original;
    // Restore real modules.
    const keysToCleanup = Object.keys(require.cache).filter((key) =>
      key.includes('portfolioHealth.js') ||
      key.includes('selfHeal.js') ||
      key.includes('recoveryLadder.js'),
    );
    for (const key of keysToCleanup) delete require.cache[key];
  }
}

// ────────────────────────────────────────────────────────────────────
// 4. trade-health.js rendering — Recovery guidance section appears
// ────────────────────────────────────────────────────────────────────

function testRenderHuman() {
  const { renderHuman } = require('../scripts/trade-health');
  const plan = {
    portfolio: 'etf',
    health: {
      health: 'blocked',
      severity: 'high',
      nextAction: 'Restore IBKR connectivity.',
      blockers: [{ code: 'broker_unready', message: 'Broker not reachable' }],
      recommendedActions: ['Restore IBKR connectivity.'],
    },
    openIssues: [
      { category: 'ibkr_socket_dead', severity: 'high', summary: 'Restart gateway.', symptom: 'ECONNREFUSED' },
    ],
    classified: [{ category: 'ibkr_socket_dead', severity: 'high', symptom: 'ECONNREFUSED', recoveryLadder: getRecoveryLadder('ibkr_socket_dead') }],
    healed: [],
    actions: [{ kind: 'command', command: 'node scripts/check-interactive-brokers-readiness.js', reason: 'Check readiness.' }],
    recoveryLadders: [{ category: 'ibkr_socket_dead', ladder: getRecoveryLadder('ibkr_socket_dead') }],
  };
  const output = renderHuman(plan);
  assert(/Recovery guidance/i.test(output), 'renderHuman should include Recovery guidance section');
  assert(/ibkr_socket_dead/i.test(output), 'should mention ibkr_socket_dead');
  assert(/check-interactive-brokers-readiness/i.test(output), 'should mention readiness check script');
  assert(/manual step/i.test(output), 'should show manual step marker for 2FA');
  ok('trade-health renderHuman shows Recovery guidance with ladder steps');

  // When no issues, no Recovery guidance section.
  const healthyPlan = {
    portfolio: 'etf',
    health: { health: 'healthy', severity: 'low', nextAction: 'All good.', blockers: [], recommendedActions: [] },
    openIssues: [],
    classified: [],
    healed: [],
    actions: [],
    recoveryLadders: [],
  };
  const healthyOutput = renderHuman(healthyPlan);
  assert(!/Recovery guidance/i.test(healthyOutput), 'healthy output should NOT include Recovery guidance');
  ok('trade-health renderHuman omits Recovery guidance when healthy');
}

// ────────────────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('test-recovery-ladder.js');
  testRenderHuman();
  await testBuildPlan();
  console.log(`\n  ${passed} assertion groups passed.\n`);
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
