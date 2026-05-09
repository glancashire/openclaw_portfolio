'use strict';

/**
 * Format a trade proposal as Markdown.
 */

function formatProposalMarkdown({ trades, summary, drift, date }) {
  const d = date || new Date().toISOString().slice(0, 10);
  let md = `# Trade Proposal — ${d}\n\n`;

  if (summary.reason === 'skip' || summary.reason === 'balanced' || summary.reason === 'quality_fail') {
    md += `## Status: No Trades\n\n`;
    md += `${summary.message}\n`;
    return md;
  }

  md += `## Summary\n\n`;
  md += `- Trades: ${trades.length}\n`;
  md += `- Total deployed: CHF ${summary.totalDeployed.toFixed(2)}\n`;
  md += `- Remaining cash: CHF ${summary.remainingCash.toFixed(2)}\n`;
  md += `- Cash reserve OK: ${summary.cashReserveOk ? 'Yes' : '⚠️ No'}\n\n`;

  md += `## Proposed Trades\n\n`;
  md += `| # | Action | Symbol | Qty | Price | Currency | Cost (CHF) | Alloc After |\n`;
  md += `|---|--------|--------|-----|-------|----------|-----------|-------------|\n`;
  trades.forEach((t, i) => {
    md += `| ${i + 1} | ${t.action} | ${t.symbol} | ${t.qty} | ${t.price.toFixed(2)} | ${t.currency} | ${t.costChf.toFixed(2)} | ${t.allocAfter.toFixed(1)}% |\n`;
  });

  md += `\n## Portfolio Drift (Before)\n\n`;
  if (drift) {
    md += `| Symbol | Target | Actual | Drift |\n`;
    md += `|--------|--------|--------|-------|\n`;
    for (const a of drift.allocations) {
      md += `| ${a.symbol} | ${a.targetPct}% | ${a.actualPct.toFixed(1)}% | ${a.driftPct > 0 ? '+' : ''}${a.driftPct.toFixed(1)}% |\n`;
    }
  }

  md += `\n## Approval\n\n`;
  md += `To approve these trades, confirm with the operator.\n`;
  md += `Orders will be placed at market open with real-time pricing.\n`;

  return md;
}

module.exports = { formatProposalMarkdown };
