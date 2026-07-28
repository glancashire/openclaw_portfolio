'use strict';

// Phase B: the dashboard generator should surface a "Quote Provider Health"
// block reflecting the configured provider order and per-provider runtime state,
// and show-dashboard.js should render cooling-down providers in the console view.

const assert = require('assert');
const {
  __test__,
} = require('../src/reporting/dashboardGenerator');

function run() {
  assert.ok(__test__, 'dashboardGenerator must export __test__ helpers');
  const { summarizeProviderHealth, formatProviderHealthLines } = __test__;
  assert.strictEqual(typeof summarizeProviderHealth, 'function');
  assert.strictEqual(typeof formatProviderHealthLines, 'function');

  const now = Date.parse('2026-07-28T21:45:00.000Z');
  const order = ['ibkr_web_api', 'ibkr_tws', 'yahoo_last_close'];
  const health = [
    // out-of-order on purpose: configured order must win
    {
      providerId: 'yahoo_last_close',
      lastSuccessAt: '2026-07-28T21:44:00.000Z',
      lastFailureAt: null,
      consecutiveFailures: 0,
      cooldownUntil: null,
      lastError: null,
    },
    {
      providerId: 'ibkr_web_api',
      lastSuccessAt: null,
      lastFailureAt: '2026-07-28T21:44:30.000Z',
      consecutiveFailures: 2,
      cooldownUntil: '2026-07-28T21:46:00.000Z', // still cooling at `now`
      lastError: 'ibkr_web_api_request_failed',
    },
  ];

  const rows = summarizeProviderHealth({ order, health, now });

  // Configured order preserved, and providers with no recorded state still listed.
  assert.deepStrictEqual(rows.map((r) => r.providerId), order);

  const web = rows.find((r) => r.providerId === 'ibkr_web_api');
  assert.strictEqual(web.status, 'cooling_down');
  assert.strictEqual(web.consecutiveFailures, 2);
  assert.strictEqual(web.cooldownUntil, '2026-07-28T21:46:00.000Z');

  const yahoo = rows.find((r) => r.providerId === 'yahoo_last_close');
  assert.strictEqual(yahoo.status, 'ok', 'past-cooldown/successful provider is ok');
  assert.strictEqual(yahoo.cooldownUntil, null);

  const tws = rows.find((r) => r.providerId === 'ibkr_tws');
  assert.strictEqual(tws.status, 'idle', 'provider with no recorded activity is idle');

  const text = formatProviderHealthLines(rows);
  assert.ok(/ibkr_web_api: status: cooling_down/.test(text));
  assert.ok(/cooldownUntil: 2026-07-28T21:46:00.000Z/.test(text));

  // Empty health => explicit placeholder line (never blank).
  assert.strictEqual(
    formatProviderHealthLines(summarizeProviderHealth({ order: [], health: [], now })),
    '- No quote-provider activity recorded this cycle.',
  );

  // Expired cooldown should not read as cooling_down.
  const expired = summarizeProviderHealth({
    order: ['ibkr_web_api'],
    health: [{
      providerId: 'ibkr_web_api',
      lastSuccessAt: null,
      lastFailureAt: '2026-07-28T21:40:00.000Z',
      consecutiveFailures: 2,
      cooldownUntil: '2026-07-28T21:44:00.000Z', // before `now`
      lastError: 'x',
    }],
    now,
  });
  assert.strictEqual(expired[0].status, 'failing');
  assert.strictEqual(expired[0].cooldownUntil, null);

  console.log(JSON.stringify({ ok: true, rows: rows.length }, null, 2));
}

run();
