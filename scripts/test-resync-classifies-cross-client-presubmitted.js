#!/usr/bin/env node
'use strict';

/**
 * Test: resync correctly classifies a PreSubmitted GTC order from another clientId
 * as still-open at broker (mapped to 'submitted'), NOT as 'not_found'.
 *
 * Bug: waitForOpenOrders used reqOpenOrders (own-client only), missing cross-client
 * GTC orders. Fix: use reqAllOpenOrders. This test mocks the broker client layer
 * so we can verify the resync logic without an actual IBKR connection.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// --- Setup temp portfolio dir ---
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-resync-cross-client-'));
const portfolioDir = path.join(tmpDir, 'portfolio', 'test');
fs.mkdirSync(portfolioDir, { recursive: true });

// Minimal portfolio.md
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: test

## Status
- Status: active
- Created: 2026-01-01
- Last reviewed: 2026-05-25
- Base currency: CHF
- Broker: interactive-brokers
- Broker account reference: test
- Execution mode: live
- Asset scope: ETF only

## Strategy Summary
Test

## Investor Profile
- Risk level: medium
- Investment horizon: 10
- Liquidity needs: low
- Maximum acceptable drawdown: 20%
- Income requirement: none
- ESG preference: none
- Currency preference: CHF-first

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 100 | 80 | 100 | Test |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| SPMCHA | Test ETF | Global equities | 100 | 80 | 100 | SIX | CHF | ibkr_conid=99999 |

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|

## Rebalancing Policy
- Check frequency: daily
- Rebalance frequency: monthly or when thresholds are breached
- Rebalance threshold: absolute drift > 5 percentage points or relative drift > 20%
- Minimum trade size: CHF 100
- Avoid unnecessary trades: true
- Prefer using new cash before selling: true

## Market Entry Policy
- Initial deployment mode: staged
- Deployment period: 10 trading days
- Max daily deployment: 10%
- Avoid buying after extreme daily price moves: true
- Use limit orders where supported: true
- Require confirmation before first live trade: true

## Risk Limits
- Max single ETF allocation: 100%
- Max single issuer allocation: 100%
- Max equity allocation: 100%
- Max bond duration: n/a
- Max cash drag after full deployment: 25%
- Stop trading if portfolio value drops by: 20% over 1 week
- Stop trading if broker/API errors occur: true

## Broker Access
- Broker adapter: interactive-brokers
- Credentials source: environment variables or secret store only
- Never store API keys in Markdown: true
- Account matching rule: test
- Read-only mode available: true
- Dry-run mode available: true

## Automation Permissions
- Sync holdings automatically: yes
- Generate trade proposals automatically: yes
- Execute trades automatically: no by default
- Send reports automatically: yes
- Require user approval for new instruments: yes
- Require user approval for first purchase: yes
- Require user approval for sales: yes unless auto_trade_limited is enabled

## Notes / Open Questions
`);

// holdings.md
fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: test

## Holdings

| Ticker / ISIN | Name | Quantity | Avg Cost | Currency | Market Value | Notes |
|---|---|---:|---:|---|---:|---|
| SPMCHA | Test ETF | 0 | 0 | CHF | 0 | |
`);

// trades.md with a submitted row for order 102
fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: test

## Trade Log

| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|
| 2026-05-24 09:00:00 | submitted | buy | SPMCHA | Test ETF | 31 | 131.90 | 4088.90 | 0 | Staged for GTC | submitted_to_broker | 102 |  |  |  |  |
`);

// history.md
fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: test

## History Log

| Date/time | Event | Details |
|---|---|---|
`);

// dashboard.md (minimal)
fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), `# Dashboard: test
`);

// --- Mock the InteractiveBrokersClient ---
// We inject a mock before requiring portfolioExecution so that
// syncPortfolioOrderStatus calls our fake getOrderStatus.

const clientModulePath = require.resolve('../src/brokers/interactive-brokers/client');
const originalClientModule = require(clientModulePath);

// Replace the module in cache with a mock
require.cache[clientModulePath] = {
  id: clientModulePath,
  filename: clientModulePath,
  loaded: true,
  exports: {
    ...originalClientModule,
    InteractiveBrokersClient: class MockInteractiveBrokersClient {
      constructor() {}
      async getOrderStatus(orderId) {
        if (String(orderId) === '102') {
          // Simulate a PreSubmitted GTC order from another client
          return {
            ok: true,
            order: {
              broker: 'interactive-brokers',
              orderId: 102,
              permId: 999888,
              status: 'PreSubmitted',
              action: 'BUY',
              identifier: 'SPMCHA',
              symbol: 'SPMCHA',
              secType: 'STK',
              quantity: 31,
              filled: 0,
              remaining: 31,
              limitPrice: 131.90,
              stopPrice: null,
              avgFillPrice: null,
              lastFillPrice: null,
              estimatedValue: 0,
              currency: 'CHF',
              transmit: true,
              executedAt: null,
              execId: null,
              brokerReason: null,
              brokerErrorCode: null,
              brokerErrorMessage: null,
              raw: {},
            },
            source: 'open_orders',
          };
        }
        return { ok: false, reason: 'not_found', orderId, message: 'Not found' };
      }
    },
  },
};

// Also mock regenerateDashboard to be a no-op (avoid full dependency chain)
const dashGenPath = require.resolve('../src/reporting/dashboardGenerator');
const originalDashGen = require(dashGenPath);
require.cache[dashGenPath] = {
  id: dashGenPath,
  filename: dashGenPath,
  loaded: true,
  exports: {
    ...originalDashGen,
    regenerateDashboard: async () => path.join(portfolioDir, 'dashboard.md'),
  },
};

// Also mock readiness / broker error state to avoid side effects
const readinessPath = require.resolve('../src/brokers/interactive-brokers/readiness');
const originalReadiness = require(readinessPath);
require.cache[readinessPath] = {
  id: readinessPath,
  filename: readinessPath,
  loaded: true,
  exports: {
    ...originalReadiness,
    getInteractiveBrokersReadiness: async () => ({ ok: true, authenticated: true, message: 'mock' }),
  },
};

// Clear portfolioExecution from cache so it picks up our mocks
delete require.cache[require.resolve('../src/execution/portfolioExecution')];
const { resyncPortfolioOrders } = require('../src/execution/portfolioExecution');

async function main() {
  const result = await resyncPortfolioOrders({ portfolioDir, refreshHoldingsOnFill: false });

  // Verify order 102 was found and classified as still-open (not not_found)
  assert.strictEqual(result.scanned, 1, `Expected 1 scanned row, got ${result.scanned}`);
  assert.strictEqual(result.results.length, 1, `Expected 1 result, got ${result.results.length}`);

  const entry = result.results[0];
  assert.strictEqual(entry.row.brokerOrderId, '102', 'Should match order 102');

  // The critical assertion: the order should NOT be classified as not_found
  assert.notStrictEqual(entry.outcome.reason, 'not_found',
    'PreSubmitted cross-client GTC should NOT be classified as not_found');

  // It should be ok (status was found at broker)
  assert.strictEqual(entry.outcome.ok, true,
    'PreSubmitted cross-client order should have ok=true outcome');

  // The status result should have the order
  assert(entry.outcome.statusResult, 'Expected statusResult');
  assert.strictEqual(entry.outcome.statusResult.ok, true, 'Expected statusResult.ok=true');
  assert.strictEqual(entry.outcome.statusResult.order.status, 'PreSubmitted',
    'Raw status should be PreSubmitted');

  // Read the trades.md and verify the row is updated to submitted (not not_found)
  const updatedTrades = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');
  assert(updatedTrades.includes('submitted'), 'Trades should contain submitted status');
  assert(!updatedTrades.includes('not_found'), 'Trades should NOT contain not_found');

  console.log(JSON.stringify({ ok: true, result: { scanned: result.scanned, synced: result.synced, cancelled: result.cancelled } }));

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('FAIL:', err.message || err);
  console.error(err.stack);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
});
