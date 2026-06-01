#!/usr/bin/env node
'use strict';

/* Phase Cleanup-1E regression: dashboard surfaces 'unknown' for daily /
 * since-last-report deltas under degraded broker posture instead of
 * silently emitting +0.00.
 */

const assert = require('assert');
const { quotePostureUnknown, generateDashboard } = require('../src/reporting/dashboardGenerator');

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const HOLDINGS_TEXT = `# Holdings: etf

## Last Sync
- Date/time: 2026-06-01 21:00:00
- Source: broker_api
- Broker: interactive-brokers
- Total value CHF: 100000
- Portfolio cash CHF: 0
- Broker account cash CHF: 14000
- Broker account cash basis: CashBalance
- Invested value CHF: 86000

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| SXR8 | Test ETF | Equity | 100 | 100 | CHF | 1 | 10000 | 11.6 | 12 | -0.4 |
`;

(async () => {
  await test('quotePostureUnknown true for posture_detection_timeout', () => {
    assert.strictEqual(quotePostureUnknown({
      fallbackRequired: true,
      reason: 'posture_detection_timeout',
      marketDataMode: 'unknown',
    }), true);
  });

  await test('quotePostureUnknown true for marketDataMode unknown', () => {
    assert.strictEqual(quotePostureUnknown({
      fallbackRequired: true,
      marketDataMode: 'unknown',
    }), true);
  });

  await test('quotePostureUnknown false for healthy live', () => {
    assert.strictEqual(quotePostureUnknown({
      fallbackRequired: false,
      marketDataMode: 'live_or_realtime',
    }), false);
  });

  await test('quotePostureUnknown false for delayed (still computable)', () => {
    assert.strictEqual(quotePostureUnknown({
      fallbackRequired: true,
      marketDataMode: 'delayed_bid_ask_only',
    }), false);
  });

  await test('dashboard emits "unknown" deltas under degraded posture (no snapshot)', async () => {
    const md = await generateDashboard({
      portfolioName: 'etf',
      tradesPath: '',
      holdingsText: HOLDINGS_TEXT,
      allocations: [],
      approvedInstruments: [],
      existingTrades: [],
      latestProposals: [],
      executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
      latestSnapshot: null,
      brokerReadiness: {
        fallbackRequired: true,
        marketDataMode: 'unknown',
        reason: 'posture_detection_timeout',
        message: 'reachable; posture undetermined',
      },
      lifecycleSummary: {},
    });
    assert.match(md, /- Daily move CHF: unknown/);
    assert.match(md, /- Daily move %: unknown/);
    assert.match(md, /- Since last report CHF: unknown/);
    assert.match(md, /- Since last report %: unknown/);
  });

  await test('dashboard preserves numeric deltas under live posture', async () => {
    const md = await generateDashboard({
      portfolioName: 'etf',
      tradesPath: '',
      holdingsText: HOLDINGS_TEXT,
      allocations: [],
      approvedInstruments: [],
      existingTrades: [],
      latestProposals: [],
      executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
      latestSnapshot: { dailyChange: 123.45, dailyChangePct: 1.23, date: '2026-06-01' },
      brokerReadiness: { fallbackRequired: false, marketDataMode: 'live_or_realtime' },
      lifecycleSummary: {},
    });
    assert.match(md, /- Daily move CHF: 123\.45/);
    assert.match(md, /- Daily move %: 1\.23/);
  });

  await test('dashboard preserves "0" delta under healthy posture without snapshot (regression)', async () => {
    const md = await generateDashboard({
      portfolioName: 'etf',
      tradesPath: '',
      holdingsText: HOLDINGS_TEXT,
      allocations: [],
      approvedInstruments: [],
      existingTrades: [],
      latestProposals: [],
      executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
      latestSnapshot: null,
      brokerReadiness: { fallbackRequired: false, marketDataMode: 'live_or_realtime' },
      lifecycleSummary: {},
    });
    assert.match(md, /- Daily move CHF: 0/);
    assert.match(md, /- Daily move %: 0/);
    // Must NOT have flipped to "unknown" under healthy posture.
    assert(!/- Daily move CHF: unknown/.test(md));
  });

  await test('dashboard emits "unknown" when posture degraded and snapshot delta is zero', async () => {
    const md = await generateDashboard({
      portfolioName: 'etf',
      tradesPath: '',
      holdingsText: HOLDINGS_TEXT,
      allocations: [],
      approvedInstruments: [],
      existingTrades: [],
      latestProposals: [],
      executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
      latestSnapshot: { dailyChange: 0, dailyChangePct: 0, date: '2026-06-01' },
      brokerReadiness: { fallbackRequired: true, marketDataMode: 'unknown', reason: 'posture_detection_timeout', message: 'reachable; posture undetermined' },
      lifecycleSummary: {},
    });
    assert.match(md, /- Daily move CHF: unknown/);
    assert.match(md, /- Daily move %: unknown/);
  });

  await test('dashboard preserves nonzero delta even under degraded posture', async () => {
    const md = await generateDashboard({
      portfolioName: 'etf',
      tradesPath: '',
      holdingsText: HOLDINGS_TEXT,
      allocations: [],
      approvedInstruments: [],
      existingTrades: [],
      latestProposals: [],
      executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
      latestSnapshot: { dailyChange: 50.0, dailyChangePct: 0.5, date: '2026-06-01' },
      brokerReadiness: { fallbackRequired: true, marketDataMode: 'unknown', reason: 'posture_detection_timeout', message: 'reachable; posture undetermined' },
      lifecycleSummary: {},
    });
    assert.match(md, /- Daily move CHF: 50/);
    assert.match(md, /- Daily move %: 0\.5/);
  });

  console.log(JSON.stringify({ ok: true, passed }, null, 2));
})().catch((err) => { console.error(err); process.exit(1); });
