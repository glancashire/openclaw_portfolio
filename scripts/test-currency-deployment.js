'use strict';

/* Phase 202 — Proposal envelope native-currency annotation tests. */

const assert = require('assert');
const path = require('path');
const realRoot = path.resolve(__dirname, '..');
const { generateBasketProposal, parseApprovedInstruments } = require(path.join(realRoot, 'src/execution/basketProposalGenerator'));

(async () => {
  // Multi-currency fixture: CHF SPMCHA + EUR SXR8.
  const portfolioMd = `# Portfolio: ETF

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| CH0130595124 | UBS SPI Mid | Swiss equities | 50 | 40 | 60 | SIX | CHF | ibkr_symbol=SPMCHA; ibkr_conid=91639399; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| IE00B5BMR087 | iShares Core S&P 500 | Global equities | 40 | 30 | 50 | XETR | EUR | ibkr_symbol=SXR8; ibkr_conid=75776072; ibkr_primary_exchange=IBIS; fx_to_chf=0.92 |
| CASH-CHF | CHF cash balance | Bonds / cash-like | 10 | 0 | 20 | IBKR | CHF | n/a |
`;
  const approved = parseApprovedInstruments(portfolioMd);
  assert.strictEqual(approved.length, 2);

  const liveQuoteFn = async (conid) => {
    if (Number(conid) === 91639399) return { ask: 128.7, lastClose: 128.5, lastTimestamp: '1779000000' };
    if (Number(conid) === 75776072) return { ask: 691, lastClose: 689, lastTimestamp: '1779000000' };
    return null;
  };

  const result = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: approved,
    holdingsByIsin: {},
    cashChf: 30000,
    liveQuoteFn,
  });

  assert(result.envelope.legs.length >= 2, 'multi-currency basket has multiple legs');

  // ── Each leg has nativeAmount ──
  for (const leg of result.envelope.legs) {
    assert(Number.isFinite(leg.nativeAmount), `leg ${leg.legId} has nativeAmount`);
    assert.strictEqual(leg.nativeAmount, Number((leg.quantity * leg.limitPrice).toFixed(2)));
  }

  // ── currencyDeployment aggregates correctly ──
  const deployment = result.envelope.currencyDeployment;
  assert(deployment, 'currencyDeployment present');
  const currencies = Object.keys(deployment);
  assert(currencies.includes('CHF'), 'CHF in deployment');
  assert(currencies.includes('EUR'), 'EUR in deployment');

  // Verify aggregate matches per-leg sum
  const sumByCcy = {};
  for (const leg of result.envelope.legs) {
    sumByCcy[leg.currency] = Number(((sumByCcy[leg.currency] || 0) + leg.nativeAmount).toFixed(2));
  }
  for (const ccy of currencies) {
    assert.strictEqual(deployment[ccy], sumByCcy[ccy], `${ccy} matches per-leg sum`);
  }

  // ── Single-currency case ──
  const singleResult = await generateBasketProposal({
    portfolio: 'etf',
    approvedInstruments: [approved[0]], // CHF SPMCHA only
    holdingsByIsin: {},
    cashChf: 30000,
    liveQuoteFn,
  });
  assert.strictEqual(Object.keys(singleResult.envelope.currencyDeployment).length, 1);
  assert('CHF' in singleResult.envelope.currencyDeployment);

  console.log(JSON.stringify({ ok: true, testsPassed: 4 }));
})().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
