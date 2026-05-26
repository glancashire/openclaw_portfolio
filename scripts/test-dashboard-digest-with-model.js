#!/usr/bin/env node
'use strict';

/*
 * Integration test: dashboard digest, when a model client is injected,
 * uses the narrated lead in the AI assessment card.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const realRoot = path.resolve(__dirname, '..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'digest-model-'));

  fs.symlinkSync(path.join(realRoot, 'src'), path.join(root, 'src'));
  fs.symlinkSync(path.join(realRoot, 'lib'), path.join(root, 'lib'));
  fs.symlinkSync(path.join(realRoot, 'skills'), path.join(root, 'skills'));
  fs.symlinkSync(path.join(realRoot, 'node_modules'), path.join(root, 'node_modules'));

  const portfolioDir = path.join(root, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 60 | 50 | 70 | broad |
| Swiss equities  | 20 | 10 | 30 | CH |
| Bonds / cash-like | 20 | 10 | 30 | cash |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| IE00B5BMR087 | iShares Core S&P 500 | Global equities | 40 | 30 | 50 | Xetra | EUR | ibkr_symbol=SXR8 |
| LU0950668870 | UBS MSCI EMU | Global equities | 20 | 10 | 30 | Xetra | EUR | ibkr_symbol=EMUAA |
| CH0032912732 | UBS SLI | Swiss equities | 12 | 8 | 16 | SIX | CHF | ibkr_symbol=UBSSLI; ibkr_local_symbol=CHSPI |
| CH0130595124 | UBS SPI Mid | Swiss equities | 8 | 4 | 12 | SIX | CHF | ibkr_symbol=SPMCHA |
| CASH-CHF | Cash sleeve | Bonds / cash-like | 20 | 10 | 30 | IBKR | CHF | cash |
`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: etf

## Last Sync
- Date/time: 2026-05-26 10:17:57
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 45519.32
- Portfolio cash CHF: 0
- Portfolio cash basis: unknown_untrusted
- Broker account cash CHF: 7153.87
- Broker account cash basis: SettledCash

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 91639399  | SPMCHA | Swiss equities  | 64  | 129.10 | CHF |   | 8262.29  | 0 | 0 | 0 |
| 150029461 | CHSPI  | Swiss equities  | 38  | 162.25 | CHF |   | 6165.43  | 0 | 0 | 0 |
| 243939970 | EMUAA  | Global equities | 254 | 40.59  | EUR |   | 10309.10 | 0 | 0 | 0 |
| 75776072  | SXR8   | Global equities | 30  | 692.75 | EUR |   | 20782.50 | 0 | 0 | 0 |
`);

  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.mkdirSync(path.join(root, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'report_delivery_policy.json'), JSON.stringify({
    deliveryMode: 'email_and_repo',
    intendedChannels: ['repo_artifacts', 'email'],
    externalDeliveryEnabled: true,
    emailProvider: 'mailgun',
    emailRecipients: ['digest@example.com'],
    pendingActionThresholds: { staleDashboard: false, failedTrades: 99, inFlightOrders: 99, brokerAutomationPaused: false },
  }, null, 2));
  fs.writeFileSync(path.join(root, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [], acknowledgedBackfilledFills: [] }, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), [
    '# Trades', '', '## Trade Log', '',
    '| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Next action |',
    '|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), [
    '# History', '', '## Daily Valuation History',
    '| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |',
    '|---|---|---:|---:|---:|---:|---:|---|',
    '| 2026-05-26 | end_of_day | 52673 | 45519 | 7154 | 673 | 1.29 | ok |',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');

  const { buildDashboardDigest } = require(path.join(realRoot, 'src/reporting/dashboardDigest'));

  // === Stub model client ===
  let calls = 0;
  let sawSPMCHA = false;
  const stubClient = {
    available: true,
    provider: 'stub',
    complete: async ({ system, user }) => {
      calls += 1;
      if (/SPMCHA/.test(user)) sawSPMCHA = true;
      return { text: 'STUB-NARRATION-MARKER: SPMCHA is 7.7pp over target; consider trimming roughly 4k CHF to compress drift.' };
    },
  };

  const result = await buildDashboardDigest({
    portfolioDir,
    frequency: 'daily',
    generatedAt: '2026-05-26T21:00:00Z',
    cronHealth: { healthy: 5, failing: 0, total: 5, items: [] },
    modelClient: stubClient,
  });

  const html = result.html || '';
  assert.strictEqual(calls, 1, 'model client must be invoked exactly once per digest build');
  assert(sawSPMCHA, 'user payload must mention SPMCHA');
  console.log('  ok — model client invoked with SPMCHA in payload');

  assert(/STUB-NARRATION-MARKER/.test(html), 'narrated lead must reach the HTML body');
  console.log('  ok — narrated lead reaches HTML body');

  assert(/Assessment/.test(html), 'AI assessment card title still present');
  assert(/Drift vs target/.test(html), 'rebalance snapshot still present');
  console.log('  ok — both rebalance + assessment cards present with model narration');

  // === Failing model client — must fall back to rules without crashing ===
  let failCalls = 0;
  const failClient = {
    available: true,
    provider: 'stub-fail',
    complete: async () => { failCalls += 1; throw new Error('simulated 429'); },
  };
  const result2 = await buildDashboardDigest({
    portfolioDir,
    frequency: 'daily',
    generatedAt: '2026-05-26T21:00:00Z',
    cronHealth: { healthy: 5, failing: 0, total: 5, items: [] },
    modelClient: failClient,
  });
  assert.strictEqual(failCalls, 1, 'failing client still attempted exactly once');
  const html2 = result2.html || '';
  assert(/Assessment/.test(html2), 'failing model still leaves AI card present');
  assert(/SPMCHA is \+7\.\d{1,2}pp from target/.test(html2),
    'failing model falls back to rule-based lead in HTML');
  console.log('  ok — model failure → rule-based lead in HTML, no crash');

  console.log(JSON.stringify({ ok: true, asserted: 4 }));
})().catch((err) => { console.error(err.stack || String(err)); process.exit(1); });
