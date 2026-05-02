const fs = require('fs');

function buildReason(proposal) {
  return [
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
}

function proposalRow(proposal, timestamp) {
  const approval = proposal.blocked ? 'blocked_by_min_trade_size' : 'pending_user_approval';
  const tickerOrIsin = proposal.instrument || proposal.assetClass;
  const name = proposal.instrumentName || `${proposal.assetClass} basket`;
  const quantity = proposal.quantity || 0;
  const limitPrice = proposal.limitPrice || 0;
  const status = proposal.status || 'proposed';
  const estimatedOrderChf = proposal.estimatedOrderChf || proposal.estimatedChf;
  const reason = buildReason(proposal);
  return `| ${timestamp} | ${status} | ${proposal.action} | ${tickerOrIsin} | ${name} | ${quantity} | ${limitPrice} | ${estimatedOrderChf} | 0 | ${reason} | ${approval} | |`;
}

function stripLatestPendingPlanRows(text) {
  const lines = text.split(/\r?\n/);
  const tradeRows = lines.filter((line) => line.startsWith('| ') && !line.includes('|---|'));
  if (!tradeRows.length) return { text, removed: 0 };

  const lastRow = tradeRows[tradeRows.length - 1];
  const cells = lastRow.split('|').slice(1, -1).map((cell) => cell.trim());
  const latestDate = cells[0] || '';
  const latestApproval = cells[10] || '';
  if (!latestDate || latestApproval !== 'pending_user_approval') return { text, removed: 0 };

  let removed = 0;
  const nextLines = lines.filter((line) => {
    if (!line.startsWith('| ') || line.includes('|---|')) return true;
    const rowCells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const rowDate = rowCells[0] || '';
    const rowApproval = rowCells[10] || '';
    const rowStatus = rowCells[1] || '';
    if (rowDate === latestDate && rowApproval === 'pending_user_approval' && ['proposed', 'planned'].includes(rowStatus)) {
      removed += 1;
      return false;
    }
    return true;
  });

  return { text: nextLines.join('\n'), removed };
}

function appendTradeProposals(tradesPath, proposals, timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)) {
  if (!proposals || proposals.length === 0) return { appended: 0, superseded: 0 };

  const original = fs.readFileSync(tradesPath, 'utf8');
  const stripped = stripLatestPendingPlanRows(original);
  const rows = proposals.map((proposal) => proposalRow(proposal, timestamp)).join('\n');
  const text = stripped.text.trimEnd() + '\n' + rows + '\n';
  fs.writeFileSync(tradesPath, text);
  return { appended: proposals.length, superseded: stripped.removed };
}

module.exports = { appendTradeProposals };
