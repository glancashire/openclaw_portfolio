#!/usr/bin/env node
'use strict';

/*
 * Integration test: dashboard digest renders rebalance snapshot + AI
 * assessment cards from portfolio fixtures.
 *
 * Also asserts the failure-mode contract: if the analyzer throws, the
 * digest still renders other sections (try/catch wrap).
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const realRoot = path.resolve(__dirname, '..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'digest-int-'));

  // Mirror src/lib so internal requires resolve.
  fs.symlinkSync(path.join(realRoot, 'src'), path.join(root, 'src'));
  fs.symlinkSync(path.join(realRoot, 'lib'), path.join(root, 'lib'));
  fs.symlinkSync(path.join(realRoot, 'skills'), path.join(root, 'skills'));
  fs.symlinkSync(path.join(realRoot, 'node_modules'), path.join(root, 'node_modules'));

  const portfolioDir = path.join(root, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });

  // Seed a minimal portfolio.md with targets.
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

  // Seed a holdings.md mirroring today's actual state (SPMCHA 2x).
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: etf

## Last Sync
- Date/time: 2026-05-26 10:17:57
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 45519.32
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
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

  // Other fixtures required by collectPortfolioSummary.
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
    '| 2026-05-20 | end_of_day | 51000 | 43000 | 8000 | 0 | 0 | ok |',
    '| 2026-05-23 | end_of_day | 52000 | 44000 | 8000 | 1000 | 1.96 | ok |',
    '| 2026-05-26 | end_of_day | 52673 | 45519 | 7154 | 673 | 1.29 | ok |',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), [
    '# Dashboard', '', '## Execution Plan', '', '- Total value: CHF 52673', '- Cash: CHF 7154', '',
  ].join('\n'));
  // Seed minimal summary/health artifacts to satisfy collectPortfolioSummary.
  // Easiest: just call the actual digest builder and verify the cards landed in HTML.
  const { buildDashboardDigest } = require(path.join(realRoot, 'src/reporting/dashboardDigest'));

  const result = await buildDashboardDigest({
    portfolioDir,
    frequency: 'daily',
    generatedAt: '2026-05-26T17:35:00Z',
    cronHealth: { healthy: 5, failing: 0, total: 5, items: [] },
  });

  const html = result.html || '';
  // Rebalance snapshot card visible: legends present, SPMCHA row.
  assert(/Drift vs target/.test(html), 'rebalance snapshot card title must be present');
  assert(/SPMCHA/.test(html), 'SPMCHA row must be in drift table');
  assert(/SXR8/.test(html), 'SXR8 row must be in drift table');
  assert(/Sell-overshoot scenario/.test(html), 'overshoot scenario summary line must be present');
  console.log('  ok — rebalance snapshot card rendered with all legs');

  // AI assessment card visible: card title + lead text with SPMCHA drift.
  assert(/Assessment/.test(html), 'AI assessment card title must be present');
  assert(/SPMCHA is \+7\.\d{1,2}pp from target/.test(html),
    `lead must call out SPMCHA drift; got: ${html.match(/[A-Z]+ is [+-]?\d+\.\d+pp from target/) || 'no match'}`);
  assert(/drift alert/.test(html), 'drift_alert tag chip must be present');
  console.log('  ok — AI assessment card rendered with drift_alert lead');

  // Plaintext path still includes the digest sections that existed before.
  assert(/Portfolio value/.test(result.text));
  console.log('  ok — text fallback unchanged structure');

  // Failure-mode: corrupt portfolio.md so parseAllocationTargets returns empty targets.
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: ETF\n\nintentionally empty\n');
  const result2 = await buildDashboardDigest({
    portfolioDir,
    frequency: 'daily',
    generatedAt: '2026-05-26T17:35:00Z',
    cronHealth: { healthy: 5, failing: 0, total: 5, items: [] },
  });
  // Should NOT crash; should still render other cards.
  assert(/Portfolio performance/.test(result2.html), 'portfolio performance headline must remain when analyzer input is corrupt');
  // Rebalance/assessment cards should be absent or commented-out.
  const hasErrorComment = /digest-section error/.test(result2.html);
  const noRebalanceCard = !/Drift vs target/.test(result2.html);
  assert(hasErrorComment || noRebalanceCard,
    'corrupt input must produce a silent skip or an error comment, never a crash');
  console.log('  ok — failure mode: corrupt analyzer input does not break digest');

  console.log(JSON.stringify({ ok: true, asserted: 4 }));
})().catch((err) => { console.error(err.stack || String(err)); process.exit(1); });
