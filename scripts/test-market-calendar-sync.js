#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { hasIbkrIdentity, normalizeContractCalendarRow, syncMarketCalendar } = require('../src/execution/marketCalendarSync');
const { readMarketCalendarArtifact, marketCalendarArtifactPath } = require('../src/execution/marketCalendarStore');

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

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// --- Unit: hasIbkrIdentity ---

test('hasIbkrIdentity returns true when conid is present', () => {
  assert.strictEqual(hasIbkrIdentity({ ibkrConid: '12345' }), true);
});

test('hasIbkrIdentity returns false when only symbol is present (conid-only lookup path)', () => {
  // Updated 2026-05-25: the sync path only uses conid, so symbol-only identity
  // is now classified missing_identity to avoid noisy broker errors.
  assert.strictEqual(hasIbkrIdentity({ ibkrSymbol: 'SXR8' }), false);
});

test('hasIbkrIdentity returns false when no IBKR fields present', () => {
  assert.strictEqual(hasIbkrIdentity({ tickerOrIsin: 'IE00B5BMR087', name: 'iShares Core S&P 500' }), false);
});

test('hasIbkrIdentity returns false for empty object', () => {
  assert.strictEqual(hasIbkrIdentity({}), false);
});

// --- Unit: normalizeContractCalendarRow ---

test('normalizeContractCalendarRow with missing identity marks missing_identity', () => {
  const row = normalizeContractCalendarRow({ tickerOrIsin: 'AAA', name: 'Test' }, null, new Date());
  assert.strictEqual(row.syncStatus, 'missing_identity');
  assert.strictEqual(row.sourceKind, 'approved_instrument');
});

test('normalizeContractCalendarRow with identity but no details marks ibkr_unavailable', () => {
  const row = normalizeContractCalendarRow({ tickerOrIsin: 'AAA', ibkrConid: '12345' }, null, new Date());
  assert.strictEqual(row.syncStatus, 'ibkr_unavailable');
  assert.strictEqual(row.error, 'contract_details_unavailable');
});

test('normalizeContractCalendarRow with identity and details marks ok', () => {
  const details = {
    conid: 12345,
    symbol: 'SXR8',
    localSymbol: 'SXR8',
    primaryExchange: 'IBIS',
    exchange: 'IBIS',
    currency: 'EUR',
    tradingHours: '20260524:0900-1730;20260525:CLOSED',
    liquidHours: '20260524:0900-1730;20260525:CLOSED',
  };
  const row = normalizeContractCalendarRow({ tickerOrIsin: 'IE00B5BMR087', ibkrConid: '12345' }, details, new Date());
  assert.strictEqual(row.syncStatus, 'ok');
  assert.strictEqual(row.sourceKind, 'ibkr_contract');
  assert.strictEqual(row.tradingHoursRaw, '20260524:0900-1730;20260525:CLOSED');
  assert.strictEqual(row.liquidHoursRaw, '20260524:0900-1730;20260525:CLOSED');
  assert.strictEqual(row.error, null);
});

test('normalizeContractCalendarRow prefers contract details fields over instrument fields', () => {
  const details = {
    conid: 99999,
    symbol: 'XDWD',
    primaryExchange: 'XETRA',
    tradingHours: '20260524:0800-1630',
    liquidHours: '20260524:0900-1530',
  };
  const row = normalizeContractCalendarRow({ tickerOrIsin: 'XX', ibkrConid: '12345', ibkrSymbol: 'OLD' }, details, new Date());
  assert.strictEqual(row.ibkrConid, 99999);
  assert.strictEqual(row.ibkrSymbol, 'XDWD');
  assert.strictEqual(row.ibkrPrimaryExchange, 'XETRA');
});

// --- Integration: syncMarketCalendar with mock broker ---

asyncTest('syncMarketCalendar with mock broker produces artifact and coverage', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-sync-'));
  const portfolioDir = path.join(tmpDir, 'test-portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  // Write a minimal portfolio.md with approved instruments
  const portfolioMd = `# Portfolio: test

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
Test portfolio

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
| IE00B5BMR087 | iShares Core S&P 500 | Global equities | 50 | 30 | 70 | EBS | CHF | ibkr_conid=12345; ibkr_symbol=SXR8; ibkr_local_symbol=SXR8; ibkr_primary_exchange=IBIS |
| NOIDENT | No Identity ETF | Global equities | 50 | 30 | 70 | UNKNOWN | CHF | |

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
- Max single ETF allocation: 70%
- Max single issuer allocation: 70%
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
`;
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), portfolioMd);

  // Mock broker that returns details for the known conid and errors for unknown
  const mockBroker = {
    async fetchContractDetailsByConid(conid) {
      if (String(conid) === '12345') {
        return {
          conid: 12345,
          symbol: 'SXR8',
          localSymbol: 'SXR8',
          primaryExchange: 'IBIS',
          exchange: 'IBIS',
          currency: 'EUR',
          tradingHours: '20260524:0900-1730;20260525:CLOSED',
          liquidHours: '20260524:0900-1730;20260525:CLOSED',
        };
      }
      throw new Error('contract_not_found');
    },
  };

  const runtimeRoot = path.join(tmpDir, 'runtime');
  const result = await syncMarketCalendar({
    portfolioDir,
    brokerClient: mockBroker,
    now: new Date('2026-05-24T12:00:00Z'),
    runtimeRoot,
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.portfolio, 'test-portfolio');
  assert.strictEqual(result.brokerReady, true); // NOIDENT has no identity so it never hits broker
  assert(result.artifactPath, 'expected artifact path');
  assert(fs.existsSync(result.artifactPath), 'expected artifact file to exist');

  // Check coverage
  assert.strictEqual(result.coverage.totalApprovedInstruments, 2);
  assert.strictEqual(result.coverage.synced, 1);
  assert.strictEqual(result.coverage.missingIdentity, 1);

  // Check individual rows
  const okRow = result.instruments.find((r) => r.tickerOrIsin === 'IE00B5BMR087');
  assert(okRow, 'expected synced row');
  assert.strictEqual(okRow.syncStatus, 'ok');
  assert.strictEqual(okRow.tradingHoursRaw, '20260524:0900-1730;20260525:CLOSED');

  const missingRow = result.instruments.find((r) => r.tickerOrIsin === 'NOIDENT');
  assert(missingRow, 'expected missing identity row');
  assert.strictEqual(missingRow.syncStatus, 'missing_identity');

  // Verify the artifact can be read back
  const readBack = readMarketCalendarArtifact({ portfolioDir, runtimeRoot });
  assert(readBack, 'expected read-back artifact');
  assert.strictEqual(readBack.portfolio, 'test-portfolio');
  assert.strictEqual(readBack.instruments.length, 2);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
}).then(() => {

  // --- Integration: syncMarketCalendar with broker errors ---
  return asyncTest('syncMarketCalendar marks brokerReady=false when broker throws', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-sync-err-'));
    const portfolioDir = path.join(tmpDir, 'err-portfolio');
    fs.mkdirSync(portfolioDir, { recursive: true });

    const portfolioMd = `# Portfolio: err

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
| IE00B5BMR087 | iShares Core S&P 500 | Global equities | 100 | 80 | 100 | EBS | CHF | ibkr_conid=12345; ibkr_symbol=SXR8; ibkr_local_symbol=SXR8; ibkr_primary_exchange=IBIS |

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
`;
    fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), portfolioMd);

    const errorBroker = {
      async fetchContractDetailsByConid() {
        throw new Error('connection_refused');
      },
    };

    const runtimeRoot = path.join(tmpDir, 'runtime');
    const result = await syncMarketCalendar({
      portfolioDir,
      brokerClient: errorBroker,
      now: new Date('2026-05-24T12:00:00Z'),
      runtimeRoot,
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.brokerReady, false);
    assert.strictEqual(result.coverage.syncFailed, 1);

    const errRow = result.instruments[0];
    assert.strictEqual(errRow.syncStatus, 'ibkr_error');
    assert(errRow.error.includes('connection_refused'), 'expected error message');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

}).then(() => {
  console.log(`\n${JSON.stringify({ ok: true, passed })}`);
});
