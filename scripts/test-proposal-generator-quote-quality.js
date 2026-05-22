'use strict';

/* Phase 201 — Regression: proposal generator stamps quoteQuality correctly. */

const assert = require('assert');
const path = require('path');
const realRoot = path.resolve(__dirname, '..');
const { generateBasketProposal, parseApprovedInstruments } = require(path.join(realRoot, 'src/execution/basketProposalGenerator'));

(async () => {
  // Single instrument fixture, plenty of cash. We control quoteFn shapes per test.
  const portfolioMd = `# Portfolio: ETF

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| CH0130595124 | UBS SPI Mid | Swiss equities | 8 | 4 | 12 | SIX | CHF | ibkr_symbol=SPMCHA; ibkr_conid=91639399; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| CASH-CHF | CHF cash balance | Bonds / cash-like | 92 | 80 | 100 | IBKR | CHF | n/a |
`;
  const approved = parseApprovedInstruments(portfolioMd);
  assert.strictEqual(approved.length, 1);

  // ── Case 1: live snapshot (ask + lastTimestamp + last + close) ──
  let result = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: approved,
    holdingsByIsin: {},
    cashChf: 30000,
    liveQuoteFn: async () => ({ '31': 128.5, '86': 128.7, '7295': 128.5, close: 128.5, ask: 128.7, lastClose: 128.5, lastTimestamp: '1779000000' }),
  });
  assert.strictEqual(result.envelope.legs.length, 1);
  assert(result.envelope.legs[0].quoteQuality, 'quoteQuality stamped');
  assert.strictEqual(result.envelope.legs[0].quoteQuality.tier, 'live');
  assert.strictEqual(result.envelope.requiresOperatorAttention, false);
  assert.strictEqual(result.envelope.quoteQualitySummary.tiers.live, 1);

  // ── Case 2: stale_only (only close — today's SPMCHA case) ──
  result = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: approved,
    holdingsByIsin: {},
    cashChf: 30000,
    liveQuoteFn: async () => ({ '31': 128.5, '7295': 128.5, close: 128.5, lastClose: 128.5 }),
  });
  assert.strictEqual(result.envelope.legs.length, 1);
  assert.strictEqual(result.envelope.legs[0].quoteQuality.tier, 'stale_only');
  assert.strictEqual(result.envelope.requiresOperatorAttention, true);
  assert.deepStrictEqual(result.envelope.quoteQualitySummary.attentionLegIds, [result.envelope.legs[0].legId]);
  assert.strictEqual(result.envelope.quoteQualitySummary.tiers.stale_only, 1);

  // ── Case 3: one_sided (ask only, no lastTimestamp) ──
  result = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: approved,
    holdingsByIsin: {},
    cashChf: 30000,
    liveQuoteFn: async () => ({ '86': 128.7, '7295': 128.5, close: 128.5, ask: 128.7, lastClose: 128.5 }),
  });
  assert.strictEqual(result.envelope.legs[0].quoteQuality.tier, 'one_sided');
  assert.strictEqual(result.envelope.requiresOperatorAttention, false, 'one_sided alone does not require attention');
  assert.strictEqual(result.envelope.quoteQualitySummary.tiers.one_sided, 1);

  // ── Case 4: quoteFn throws → quoteQuality null, leg may still be created from previously fetched fields (which it can't) — assert no crash ──
  result = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: approved,
    holdingsByIsin: {},
    cashChf: 30000,
    liveQuoteFn: async () => { throw new Error('boom'); },
  });
  assert.strictEqual(result.envelope.legs.length, 0, 'no leg when quote unavailable');

  console.log(JSON.stringify({ ok: true, testsPassed: 4 }));
})().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
