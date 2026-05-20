const assert = require('assert');
const { proposalDistribution } = require('../src/analysis/instrumentProposalEngine');

const assetClassProposals = {
  proposals: [
    { assetClass: 'Global equities', estimatedChf: 2400, rationale: 'test' },
  ],
};
const instruments = [
  { tickerOrIsin: 'IE00BD4TXW66', name: 'UBSPX ETF', assetClass: 'Global equities', target: 40 },
  { tickerOrIsin: 'LU0950668870', name: 'EMUAA ETF', assetClass: 'Global equities', target: 20 },
];
const allocationByInstrument = new Map([
  ['IE00BD4TXW66', 0],
  ['LU0950668870', 50.13],
]);
const distributed = proposalDistribution(assetClassProposals, instruments, allocationByInstrument);
assert.strictEqual(distributed.length, 1);
assert.strictEqual(distributed[0].instrument.tickerOrIsin, 'IE00BD4TXW66');
assert.strictEqual(distributed[0].estimatedChf, 2400);
console.log(JSON.stringify({ ok: true, distributed }, null, 2));
