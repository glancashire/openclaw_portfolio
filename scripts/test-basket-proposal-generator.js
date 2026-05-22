'use strict';

/* Phase 195 — basketProposalGenerator unit + integration tests. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateBasketProposal, parseApprovedInstruments, saveProposalEnvelope } = require('../src/execution/basketProposalGenerator');

const PORTFOLIO_MD = `# Portfolio: ETF

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| IE00B5BMR087 | iShares Core S&P 500 | Global equities | 40 | 30 | 50 | Xetra | EUR | ibkr_symbol=SXR8; ibkr_conid=75776072; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| LU0950668870 | UBS MSCI EMU | Global equities | 20 | 10 | 30 | Xetra | EUR | ibkr_symbol=EMUAA; ibkr_conid=243939970; fx_to_chf=0.96 |
| CH0032912732 | UBS SLI | Swiss equities | 12 | 8 | 16 | SIX | CHF | ibkr_symbol=UBSSLI; ibkr_conid=150029461; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| CH0130595124 | UBS SPI Mid | Swiss equities | 8 | 4 | 12 | SIX | CHF | ibkr_symbol=SPMCHA; ibkr_conid=91639399; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| CASH-CHF | CHF cash balance | Bonds / cash-like | 20 | 10 | 30 | IBKR | CHF | n/a |
`;

(async () => {
  // Unit: parser
  const parsed = parseApprovedInstruments(PORTFOLIO_MD);
  assert.strictEqual(parsed.length, 4, `expected 4 non-cash rows, got ${parsed.length}`);
  assert.strictEqual(parsed[0].ibkrSymbol, 'SXR8');
  assert.strictEqual(parsed[0].conid, '75776072');
  assert.strictEqual(parsed[0].fxToChf, 0.96);
  assert.strictEqual(parsed[2].ibkrSymbol, 'UBSSLI');
  assert.strictEqual(parsed[2].primaryExchange, 'EBS');

  // Integration: empty holdings + CHF 30000 cash
  const liveQuoteFn = async (conid) => {
    if (conid === 75776072) return { ask: 691.18, lastClose: 687.28 };
    if (conid === 243939970) return { ask: 40.80, lastClose: 40.43 };
    if (conid === 150029461) return { ask: NaN, lastClose: 161.40 };
    if (conid === 91639399) return { ask: NaN, lastClose: 128.50 };
    return null;
  };

  const result = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: parsed,
    holdingsByIsin: {},
    cashChf: 30000,
    liveQuoteFn,
  });
  assert.strictEqual(result.envelope.legs.length, 4, `expected 4 legs from empty portfolio, got ${result.envelope.legs.length}`);
  assert(result.deploymentChf > 0);
  assert(result.residualChf >= 0);

  // Tick rounding
  const sxr8Leg = result.envelope.legs.find((l) => l.ibkrSymbol === 'SXR8');
  assert(sxr8Leg, 'SXR8 leg missing');
  assert(sxr8Leg.limitPrice > 691.18, `SXR8 limit must exceed ask 691.18, got ${sxr8Leg.limitPrice}`);
  // EUR tick 0.01
  assert.strictEqual(Math.round(sxr8Leg.limitPrice * 100) / 100, sxr8Leg.limitPrice, 'SXR8 limit must be on 0.01 EUR tick');

  const sliLeg = result.envelope.legs.find((l) => l.ibkrSymbol === 'UBSSLI');
  assert(sliLeg, 'UBSSLI leg missing');
  assert(sliLeg.limitPrice > 161.40, 'UBSSLI limit must exceed close 161.40');
  // Swiss tick 0.05
  const sliTickRemainder = Math.round(sliLeg.limitPrice * 100) % 5;
  assert.strictEqual(sliTickRemainder, 0, `UBSSLI limit ${sliLeg.limitPrice} must be on 0.05 CHF tick`);

  // Swiss sleeve split: SLI gets 12%, SPI gets 8%, both must be present
  const swissLegs = result.envelope.legs.filter((l) => l.currency === 'CHF');
  assert.strictEqual(swissLegs.length, 2, 'expected both Swiss legs');

  // Schema fields
  for (const leg of result.envelope.legs) {
    assert(leg.legId, 'leg missing legId');
    assert(leg.instrument, 'leg missing instrument');
    assert(leg.conid, 'leg missing conid');
    assert(['BUY', 'SELL'].includes(leg.action), 'leg missing action');
    assert(Number.isFinite(leg.quantity) && leg.quantity > 0, 'leg quantity must be positive');
    assert(Number.isFinite(leg.limitPrice) && leg.limitPrice > 0, 'leg limit must be positive');
    assert(leg.currency, 'leg missing currency');
  }

  // Integration: partial holdings, smaller cash — should propose fewer legs to fill gaps
  const partialResult = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: parsed,
    holdingsByIsin: {
      'IE00B5BMR087': { quantity: 18, valueChf: 12440 },
      'LU0950668870': { quantity: 151, valueChf: 6148 },
      'CH0032912732': { quantity: 23, valueChf: 3726 },
    },
    cashChf: 9381,
    liveQuoteFn,
  });
  // Only SPMCHA gap should remain (since the other three are already roughly at target)
  const spmchaLeg = partialResult.envelope.legs.find((l) => l.ibkrSymbol === 'SPMCHA');
  assert(spmchaLeg, `expected SPMCHA leg in proposal; got legs: ${partialResult.envelope.legs.map((l) => l.ibkrSymbol).join(',')}`);
  assert(spmchaLeg.quantity > 0);
  assert(partialResult.residualChf >= 0);

  // Min-leg threshold: cash < minLegChf produces no legs
  const tinyResult = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: parsed,
    holdingsByIsin: {},
    cashChf: 100,
    liveQuoteFn,
    options: { minLegChf: 500 },
  });
  assert.strictEqual(tinyResult.envelope.legs.length, 0, 'tiny cash must produce no legs');

  // Save to disk
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bproposal-'));
  const saved = saveProposalEnvelope({ rootDir: tmp, portfolio: 'etf', envelope: result.envelope });
  assert(fs.existsSync(saved), 'proposal file not written');
  assert(saved.endsWith('.json'));
  const reread = JSON.parse(fs.readFileSync(saved, 'utf8'));
  assert.strictEqual(reread.approvalId, result.envelope.approvalId);

  // Quote failure: leg is silently skipped, doesn't crash
  const badQuoteFn = async () => { throw new Error('quote-feed-down'); };
  const failsafeResult = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: parsed.slice(0, 1),
    holdingsByIsin: {},
    cashChf: 30000,
    liveQuoteFn: badQuoteFn,
  });
  assert.strictEqual(failsafeResult.envelope.legs.length, 0, 'should skip legs with no quote');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
