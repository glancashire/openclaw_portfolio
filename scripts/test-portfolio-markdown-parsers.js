#!/usr/bin/env node
'use strict';

/*
 * Unit tests for lib/portfolioMarkdown.js parsers.
 */

const assert = require('assert');
const {
  parseAllocationTargets,
  parseHoldings,
  applyAliases,
} = require('../lib/portfolioMarkdown');

let passed = 0;
function ok(label) { passed += 1; console.log(`  ok — ${label}`); }

// === parseAllocationTargets ===
{
  const md = `# Portfolio: etf

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 60 | 50 | 70 | broad |
| Swiss equities  | 20 | 10 | 30 | CH |
| Bonds / cash-like | 20 | 10 | 30 | cash |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| IE00B5BMR087 | iShares Core S&P 500 | Global equities | 40 | 30 | 50 | Xetra | EUR | ibkr_symbol=SXR8; ibkr_conid=75776072 |
| LU0950668870 | UBS MSCI EMU       | Global equities | 20 | 10 | 30 | Xetra | EUR | ibkr_symbol=EMUAA |
| CH0032912732 | UBS SLI | Swiss equities | 12 | 8 | 16 | SIX | CHF | ibkr_symbol=UBSSLI; ibkr_local_symbol=CHSPI; ibkr_conid=150029461 |
| CH0130595124 | UBS SPI Mid | Swiss equities | 8 | 4 | 12 | SIX | CHF | ibkr_symbol=SPMCHA |
| IE00FUTURE   | Future candidate | Global equities | 0 | 0 | 0 | LSE | GBP | future-use only |
| CASH-CHF | Cash sleeve | Bonds / cash-like | 20 | 10 | 30 | IBKR | CHF | cash |
`;

  const targets = parseAllocationTargets(md);
  const bySym = Object.fromEntries(targets.map((t) => [t.symbol, t]));

  assert(bySym.SXR8 && bySym.SXR8.targetPct === 40);
  assert(bySym.UBSSLI && bySym.UBSSLI.targetPct === 12);
  assert(bySym.SPMCHA && bySym.SPMCHA.targetPct === 8);
  assert(bySym['CASH-CHF'] && bySym['CASH-CHF'].targetPct === 20);
  assert(!('IE00FUTURE' in bySym), '0% candidates must be excluded');
  ok('parseAllocationTargets: targets correct, 0% candidates excluded');

  // Aliases
  assert.deepStrictEqual(targets._aliases, { CHSPI: 'UBSSLI' });
  ok('parseAllocationTargets: ibkr_local_symbol alias captured');

  // Targets must sum to 100
  const sum = targets.reduce((s, t) => s + t.targetPct, 0);
  assert.strictEqual(sum, 100);
  ok('parseAllocationTargets: real targets sum to 100');
}

// === parseHoldings ===
{
  const md = `# Holdings: etf

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
`;

  const { holdings, cashChf, totalValueChf, lastSync } = parseHoldings(md);
  assert.strictEqual(holdings.length, 4);
  assert.strictEqual(cashChf, 7153.87);
  assert.strictEqual(totalValueChf, 45519.32);
  assert(lastSync && lastSync.startsWith('2026-05-26'));

  const bySym = Object.fromEntries(holdings.map((h) => [h.symbol, h]));
  assert.strictEqual(bySym.SPMCHA.qty, 64);
  assert.strictEqual(bySym.SPMCHA.valueChf, 8262.29);
  assert.strictEqual(bySym.SXR8.currency, 'EUR');
  assert.strictEqual(bySym.CHSPI.valueChf, 6165.43);
  ok('parseHoldings: holdings, cash, totals, lastSync all correct');
}

// === applyAliases ===
{
  const aliases = { CHSPI: 'UBSSLI' };
  const before = [
    { symbol: 'SPMCHA', qty: 64, valueChf: 8000, currency: 'CHF' },
    { symbol: 'CHSPI',  qty: 38, valueChf: 6000, currency: 'CHF' },
    { symbol: 'SXR8',   qty: 30, valueChf: 20000, currency: 'EUR' },
  ];
  const after = applyAliases(before, aliases);
  assert.strictEqual(after.length, 3);
  const ubssli = after.find((h) => h.symbol === 'UBSSLI');
  assert(ubssli, 'CHSPI should be rebound to UBSSLI');
  assert.strictEqual(ubssli.localSymbol, 'CHSPI');
  // Non-aliased holdings unchanged.
  assert.strictEqual(after.find((h) => h.symbol === 'SXR8').qty, 30);
  ok('applyAliases: local_symbol holdings rebind to canonical');
}

// === Empty aliases ===
{
  const before = [{ symbol: 'X', qty: 1, valueChf: 100, currency: 'CHF' }];
  assert.deepStrictEqual(applyAliases(before, {}), before);
  assert.deepStrictEqual(applyAliases(before, null), before);
  ok('applyAliases: no aliases = no-op');
}

console.log(JSON.stringify({ ok: true, asserted: passed }));
