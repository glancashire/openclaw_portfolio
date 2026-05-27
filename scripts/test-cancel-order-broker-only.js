#!/usr/bin/env node
'use strict';

/* Phase W5: regression test for cancelPortfolioOrder({ selector: { brokerOnly: true }})
 *
 * Verifies the broker-only fallback path that lets us cancel an IBKR order
 * which isn't in our local trades.md (the order-102 case, 2026-05-26).
 *
 * Uses require.cache injection to mock both the IBKR client and the readiness
 * helper, so the test never touches a live broker.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Isolate runtime state writes so the test does not pollute the real
// runtime/execution-state.json.
const TMP_REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'w5-cancel-broker-only-'));
fs.mkdirSync(path.join(TMP_REPO, 'runtime'), { recursive: true });
process.chdir(TMP_REPO);

// Seed a minimal portfolio dir.
const portfolioDir = path.join(TMP_REPO, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio\n\n- status: active\n');
fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n');

const REPO_ROOT = path.resolve(__dirname, '..');
const CLIENT_PATH = require.resolve(path.join(REPO_ROOT, 'src/brokers/interactive-brokers/client.js'));
const READINESS_PATH = require.resolve(path.join(REPO_ROOT, 'src/brokers/interactive-brokers/readiness.js'));

let mockClient;
let mockReadiness = { authenticated: true, reachable: true, message: 'ready', fallbackRequired: false };

function installMocks() {
  // Wipe and inject mock client module.
  delete require.cache[CLIENT_PATH];
  require.cache[CLIENT_PATH] = {
    id: CLIENT_PATH,
    filename: CLIENT_PATH,
    loaded: true,
    exports: {
      InteractiveBrokersClient: function MockClient(opts) {
        this.portfolio = opts.portfolio;
        this.getOrderStatus = (orderId) => mockClient.getOrderStatus(orderId);
        this.cancelOrder = (orderId) => mockClient.cancelOrder(orderId);
      },
    },
  };
  // Wipe and inject mock readiness module.
  delete require.cache[READINESS_PATH];
  require.cache[READINESS_PATH] = {
    id: READINESS_PATH,
    filename: READINESS_PATH,
    loaded: true,
    exports: {
      getInteractiveBrokersReadiness: async () => mockReadiness,
    },
  };
}

installMocks();

// Now load the SUT after the mocks are in place.
const { cancelPortfolioOrder } = require(path.join(REPO_ROOT, 'src/execution/portfolioExecution.js'));
const { readExecutionState } = require(path.join(REPO_ROOT, 'src/execution/runtimeState.js'));

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

(async () => {
  await test('userApproved=false → policy_blocked', async () => {
    const r = await cancelPortfolioOrder({ portfolioDir, orderId: '9001', selector: { brokerOnly: true }, userApproved: false });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'policy_blocked');
  });

  await test('broker not authenticated → policy_blocked', async () => {
    mockReadiness = { authenticated: false, reachable: false, message: 'gateway down', fallbackRequired: true };
    const r = await cancelPortfolioOrder({ portfolioDir, orderId: '9002', selector: { brokerOnly: true }, userApproved: true });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'policy_blocked');
    assert(r.blockers && r.blockers.length > 0);
  });

  await test('order not open at broker → broker_order_not_open', async () => {
    mockReadiness = { authenticated: true, reachable: true, message: 'ready', fallbackRequired: false };
    mockClient = {
      getOrderStatus: async (_id) => ({ ok: true, source: 'executions', order: { status: 'Filled' } }),
      cancelOrder: async (_id) => { throw new Error('should not be called'); },
    };
    const r = await cancelPortfolioOrder({ portfolioDir, orderId: '9003', selector: { brokerOnly: true }, userApproved: true });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'broker_order_not_open');
  });

  await test('order open + cancel succeeds → ok=true, audit logged', async () => {
    mockClient = {
      getOrderStatus: async (id) => ({ ok: true, source: 'open_orders', order: { orderId: id, status: 'PreSubmitted', symbol: 'SPMCHA' } }),
      cancelOrder: async (id) => ({ ok: true, cancel: { status: 'cancelled', message: `Order ${id} cancelled.` } }),
    };
    const r = await cancelPortfolioOrder({ portfolioDir, orderId: '102', selector: { brokerOnly: true }, userApproved: true });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.brokerOnly, true);
    assert(r.audit, 'expected audit entry');
    assert.strictEqual(r.audit.orderId, '102');
    assert.strictEqual(r.audit.status, 'cancelled');

    // Verify execution-state.json contains the audit entry
    const state = readExecutionState();
    assert(Array.isArray(state.brokerOnlyCancels?.etf), 'expected brokerOnlyCancels.etf array');
    const found = state.brokerOnlyCancels.etf.find((e) => e.orderId === '102');
    assert(found, 'expected order 102 in audit log');
    assert.strictEqual(found.status, 'cancelled');
  });

  await test('order open + cancel rejected → ok=false, error surfaced', async () => {
    mockClient = {
      getOrderStatus: async (id) => ({ ok: true, source: 'open_orders', order: { orderId: id, status: 'PreSubmitted' } }),
      cancelOrder: async (_id) => ({ ok: false, reason: 'broker_rejected', error: 'Cancel denied by exchange' }),
    };
    const r = await cancelPortfolioOrder({ portfolioDir, orderId: '9005', selector: { brokerOnly: true }, userApproved: true });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'broker_rejected');
    assert.match(r.error || '', /Cancel denied/);
  });

  await test('broker lookup throws → broker_lookup_error', async () => {
    mockClient = {
      getOrderStatus: async (_id) => { throw new Error('socket disconnected'); },
      cancelOrder: async () => { throw new Error('unreachable'); },
    };
    const r = await cancelPortfolioOrder({ portfolioDir, orderId: '9006', selector: { brokerOnly: true }, userApproved: true });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'broker_lookup_error');
    assert.match(r.error || '', /socket disconnected/);
  });

  await test('script parses --broker-only flag', () => {
    const scriptSrc = fs.readFileSync(path.join(REPO_ROOT, 'scripts/cancel-portfolio-order.js'), 'utf8');
    assert.match(scriptSrc, /--broker-only/);
    assert.match(scriptSrc, /brokerOnly\s*=\s*true/);
  });

  console.log(JSON.stringify({ ok: true, passed }));
})();
