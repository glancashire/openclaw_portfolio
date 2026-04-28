const fs = require('fs');

function appendTradeProposals(tradesPath, proposals, timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)) {
  if (!proposals || proposals.length === 0) return { appended: 0 };

  let text = fs.readFileSync(tradesPath, 'utf8');
  const rows = proposals.map((proposal) => {
    const reason = [
      proposal.rationale,
      `allocation before ${proposal.allocationBeforePct ?? 'n/a'}%`,
      `target ${proposal.allocationTargetPct ?? 'n/a'}%`,
      `allocation after ${proposal.allocationAfterPct ?? 'n/a'}%`,
      `drift before ${proposal.driftBefore ?? 'n/a'}%`,
      `drift after ${proposal.driftAfter ?? 'n/a'}%`,
      `drift corrected ${proposal.driftCorrected ?? 'n/a'}%`,
      `expected cost CHF ${proposal.estimatedOrderChf || proposal.estimatedChf || 0}`,
      `funding source ${proposal.fundingSource || 'unknown'}`,
      proposal.riskNote,
    ].join('; ');
    const approval = proposal.blocked ? 'blocked_by_min_trade_size' : 'pending_user_approval';
    const tickerOrIsin = proposal.instrument || proposal.assetClass;
    const name = proposal.instrumentName || `${proposal.assetClass} basket`;
    const quantity = proposal.quantity || 0;
    const limitPrice = proposal.limitPrice || 0;
    const status = proposal.status || 'proposed';
    const estimatedOrderChf = proposal.estimatedOrderChf || proposal.estimatedChf;
    return `| ${timestamp} | ${status} | ${proposal.action} | ${tickerOrIsin} | ${name} | ${quantity} | ${limitPrice} | ${estimatedOrderChf} | 0 | ${reason} | ${approval} | |`;
  }).join('\n');

  text = text.trimEnd() + '\n' + rows + '\n';
  fs.writeFileSync(tradesPath, text);
  return { appended: proposals.length };
}

module.exports = { appendTradeProposals };
