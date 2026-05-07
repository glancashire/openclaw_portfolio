'use strict';

/**
 * Daily rebalance check.
 * Loads portfolio state, runs drift analysis, alerts if rebalancing needed.
 */

const { loadState, appendNavHistory } = require('../lib/portfolioState');
const { analyzeDrift } = require('../lib/portfolioDrift');
const { generateProposal } = require('../lib/tradeProposalGenerator');
const { formatProposalMarkdown } = require('../lib/tradeProposalFormatter');
const fs = require('fs');
const path = require('path');

const JSON_OUT = process.argv.includes('--json');

function main() {
  const state = loadState();
  if (!state) {
    console.log('No portfolio state found. Run a trade first or initialize state.');
    process.exit(0);
  }

  // Append NAV history
  appendNavHistory(state);

  // Run drift analysis
  const positions = state.holdings.map(h => ({
    symbol: h.symbol,
    marketValue: h.marketValue || 0,
  }));

  const drift = analyzeDrift({
    totalValue: state.totalValueChf,
    cashChf: state.cashChf,
    positions,
  });

  if (JSON_OUT) {
    console.log(JSON.stringify({ drift, needsRebalance: drift.needsRebalance.length > 0 }, null, 2));
    return;
  }

  console.log(`Portfolio Check — ${new Date().toISOString().slice(0, 10)}`);
  console.log(`  Total value: CHF ${state.totalValueChf.toFixed(2)}`);
  console.log(`  Cash: CHF ${state.cashChf.toFixed(2)}`);
  console.log(`  Holdings: ${state.holdings.length}`);
  console.log(`  Max drift: ${drift.maxDrift.toFixed(1)}%`);
  console.log('');

  if (drift.needsRebalance.length === 0) {
    console.log('✓ Portfolio is balanced. No rebalancing needed.');
    return;
  }

  console.log(`⚠️  ${drift.needsRebalance.length} instrument(s) exceed drift threshold:`);
  for (const r of drift.needsRebalance) {
    console.log(`  ${r.symbol}: ${r.driftPct > 0 ? '+' : ''}${r.driftPct.toFixed(1)}% (target: ${r.targetPct}%, actual: ${r.actualPct.toFixed(1)}%)`);
  }

  // Generate proposal
  const prices = {
    VUSA: { price: 109.50, currency: 'CHF', exchange: 'EBS' },
    SLICHA: { price: 222.00, currency: 'CHF', exchange: 'EBS' },
    EMUAA: { price: 40.00, currency: 'EUR', exchange: 'EBS' },
  };

  const proposal = generateProposal({ drift, prices });
  if (proposal.trades.length > 0) {
    console.log(`\nProposed ${proposal.trades.length} trade(s) to rebalance.`);
    const date = new Date().toISOString().slice(0, 10);
    const md = formatProposalMarkdown({ trades: proposal.trades, summary: proposal.summary, drift, date });
    const outPath = path.join(__dirname, '..', 'runtime', `trade-proposal-${date}.md`);
    fs.writeFileSync(outPath, md);
    console.log(`Proposal written to: ${outPath}`);
  }
}

main();
