#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// --- Test: evaluateMarketWindowFromCalendar ---

// We test indirectly via evaluateMarketWindow since the calendar function is module-private.
// Instead, test getCalendarCoverageSummary which is exported.
const { getCalendarCoverageSummary } = require('../src/execution/executionDiagnostics');
const { writeMarketCalendarArtifact, buildMarketCalendarArtifact, normalizeInstrumentCalendarRow } = require('../src/execution/marketCalendarStore');

test('getCalendarCoverageSummary returns available:false when no artifact exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-cov-'));
  const portfolioDir = path.join(tmpDir, 'portfolio', 'test');
  fs.mkdirSync(portfolioDir, { recursive: true });
  // repoRoot = tmpDir, runtimeRoot = tmpDir/runtime (doesn't exist)
  const result = getCalendarCoverageSummary({ portfolioDir, now: new Date() });
  assert.strictEqual(result.available, false);
  assert.strictEqual(result.reason, 'no_artifact');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('getCalendarCoverageSummary returns available:true when fresh artifact exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-cov-'));
  const portfolioDir = path.join(tmpDir, 'portfolio', 'test');
  fs.mkdirSync(portfolioDir, { recursive: true });
  const runtimeRoot = path.join(tmpDir, 'runtime');

  const now = new Date('2026-05-24T12:00:00Z');
  const row = normalizeInstrumentCalendarRow({
    tickerOrIsin: 'IE00B5BMR087',
    ibkrConid: 12345,
    ibkrSymbol: 'SXR8',
    ibkrPrimaryExchange: 'IBIS',
    exchange: 'IBIS',
    currency: 'EUR',
    tradingHoursRaw: '20260524:0900-1730;20260525:CLOSED',
    liquidHoursRaw: '20260524:0900-1730;20260525:CLOSED',
    syncStatus: 'ok',
    sourceKind: 'ibkr_contract',
  }, now);

  const artifact = buildMarketCalendarArtifact({
    portfolioDir,
    generatedAt: now.toISOString(),
    brokerReady: true,
    instruments: [row],
    now,
    preNormalized: true,
  });
  writeMarketCalendarArtifact({ portfolioDir, runtimeRoot, artifact });

  const result = getCalendarCoverageSummary({ portfolioDir, now });
  assert.strictEqual(result.available, true);
  assert.strictEqual(result.reason, 'ok');
  assert.strictEqual(result.brokerReady, true);
  assert(result.coverage, 'expected coverage object');
  assert.strictEqual(result.coverage.synced, 1);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('getCalendarCoverageSummary returns available:false when artifact is stale', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-cov-'));
  const portfolioDir = path.join(tmpDir, 'portfolio', 'test');
  fs.mkdirSync(portfolioDir, { recursive: true });
  const runtimeRoot = path.join(tmpDir, 'runtime');

  const staleDate = new Date('2026-05-10T12:00:00Z'); // 14 days ago
  const now = new Date('2026-05-24T12:00:00Z');
  const row = normalizeInstrumentCalendarRow({
    tickerOrIsin: 'IE00B5BMR087',
    syncStatus: 'ok',
    tradingHoursRaw: '20260510:0900-1730',
    liquidHoursRaw: '20260510:0900-1730',
  }, staleDate);

  const artifact = buildMarketCalendarArtifact({
    portfolioDir,
    generatedAt: staleDate.toISOString(),
    brokerReady: true,
    instruments: [row],
    now: staleDate,
    preNormalized: true,
  });
  writeMarketCalendarArtifact({ portfolioDir, runtimeRoot, artifact });

  const result = getCalendarCoverageSummary({ portfolioDir, now });
  assert.strictEqual(result.available, false);
  assert.strictEqual(result.reason, 'stale');
  assert(result.ageHours > 300, 'expected stale age');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Test the liveReadinessPreflight evaluateMarketWindowFromCalendar integration ---
// We test this by checking that evaluateMarketWindow includes 'source' field

test('evaluateMarketWindow includes source field (heuristic when no calendar)', () => {
  // Use the real portfolio which has no runtime calendar artifact yet
  const portfolioDir = path.resolve(__dirname, '..', 'portfolio', 'etf');
  // Clear any existing calendar artifact if present
  const runtimeRoot = path.resolve(__dirname, '..', 'runtime');
  const calPath = path.join(runtimeRoot, 'market-calendar', 'etf-market-calendar.json');
  const hadCal = fs.existsSync(calPath);
  let backup = null;
  if (hadCal) {
    backup = fs.readFileSync(calPath, 'utf8');
    fs.unlinkSync(calPath);
  }

  try {
    const { evaluateMarketWindow } = require('../src/execution/liveReadinessPreflight');
    const result = evaluateMarketWindow(portfolioDir, { now: new Date() });
    assert(result.source, 'expected source field');
    assert.strictEqual(result.source, 'heuristic');
    assert(typeof result.openNow === 'boolean', 'expected openNow boolean');
  } finally {
    if (hadCal && backup) {
      fs.mkdirSync(path.dirname(calPath), { recursive: true });
      fs.writeFileSync(calPath, backup);
    }
  }
});

test('evaluateMarketWindow uses calendar when fresh artifact is present', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-mw-'));
  const portfolioDir = path.join(tmpDir, 'portfolio', 'test');
  const runtimeRoot = path.join(tmpDir, 'runtime');
  fs.mkdirSync(portfolioDir, { recursive: true });

  // Create minimal portfolio.md and trades.md so evaluateMarketWindow can run
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: test

## Status
- Status: active
- Created: 2026-01-01
- Last reviewed: 2026-05-24
- Base currency: CHF
- Broker: interactive-brokers
- Broker account reference: test
- Execution mode: propose_only
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
| IE00B5BMR087 | iShares S&P 500 | Global equities | 100 | 80 | 100 | EBS | CHF | ibkr_conid=12345; ibkr_symbol=SXR8; ibkr_primary_exchange=IBIS |

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

  // Trades.md with an executable row
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades

## Trade Log
| Date/Time | Ticker / ISIN | Name | Action | Qty | Limit | Status | Notes |
|---|---|---|---|---:|---|---|---|
| 2026-05-24 08:00 | IE00B5BMR087 | iShares S&P 500 | BUY | 10 | 50.00 | approved | |
`);

  // Write a calendar artifact that says market is open at 12:00
  const now = new Date('2026-05-24T12:00:00Z');
  const row = normalizeInstrumentCalendarRow({
    tickerOrIsin: 'IE00B5BMR087',
    ibkrConid: 12345,
    ibkrSymbol: 'SXR8',
    ibkrPrimaryExchange: 'IBIS',
    exchange: 'IBIS',
    currency: 'EUR',
    tradingHoursRaw: '20260524:0800-1730;20260525:CLOSED',
    liquidHoursRaw: '20260524:0900-1700;20260525:CLOSED',
    syncStatus: 'ok',
    sourceKind: 'ibkr_contract',
  }, now);

  const artifact = buildMarketCalendarArtifact({
    portfolioDir,
    generatedAt: now.toISOString(),
    brokerReady: true,
    instruments: [row],
    now,
    preNormalized: true,
  });
  writeMarketCalendarArtifact({ portfolioDir, runtimeRoot, artifact });

  // Re-require to avoid caching issues
  delete require.cache[require.resolve('../src/execution/liveReadinessPreflight')];
  const { evaluateMarketWindow } = require('../src/execution/liveReadinessPreflight');
  const result = evaluateMarketWindow(portfolioDir, { now });

  assert.strictEqual(result.source, 'calendar_artifact');
  assert.strictEqual(result.openNow, true);
  assert(result.reason.includes('open'), `expected calendar:open reason, got ${result.reason}`);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

console.log(JSON.stringify({ ok: true, passed }));
