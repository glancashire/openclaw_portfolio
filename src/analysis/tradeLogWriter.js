const fs = require('fs');

function appendTradeProposals(tradesPath, proposals, timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)) {
  if (!proposals || proposals.length === 0) return { appended: 0 };

  let text = fs.readFileSync(tradesPath, 'utf8');
  const rows = proposals.map((proposal) => {
    const reason = `${proposal.rationale} Drift before: ${proposal.driftBefore}%. ${proposal.riskNote}`;
    const approval = proposal.blocked ? 'blocked_by_min_trade_size' : 'pending_user_approval';
    return `| ${timestamp} | proposed | ${proposal.action} | ${proposal.assetClass} | ${proposal.assetClass} basket | 0 | 0 | ${proposal.estimatedChf} | 0 | ${reason} | ${approval} | |`;
  }).join('\n');

  text = text.trimEnd() + '\n' + rows + '\n';
  fs.writeFileSync(tradesPath, text);
  return { appended: proposals.length };
}

module.exports = { appendTradeProposals };
