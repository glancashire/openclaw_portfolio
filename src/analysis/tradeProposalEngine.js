const fs = require('fs');
const { analyzeAllocation } = require('./allocationAnalysis');

function parseTotalValueChf(holdingsPath) {
  const text = fs.readFileSync(holdingsPath, 'utf8');
  const match = text.match(/- Total value CHF:\s*(.+)/);
  if (!match) return 0;
  const value = Number(String(match[1] || '0').replace(/[ ,]/g, '').trim());
  return Number.isFinite(value) ? value : 0;
}

function parseCashChf(holdingsPath) {
  const text = fs.readFileSync(holdingsPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const cashRow = lines.find((line) => /^\|\s*CHF\s*\|/.test(line));
  if (!cashRow) return 0;
  const cells = cashRow.split('|').slice(1, -1).map((cell) => cell.trim());
  const value = Number(String(cells[3] || cells[1] || '0').replace(/[ ,]/g, '').trim());
  return Number.isFinite(value) ? value : 0;
}

function parseMinimumTradeSize(portfolioPath) {
  const text = fs.readFileSync(portfolioPath, 'utf8');
  const match = text.match(/- Minimum trade size:\s*CHF\s*(.+)/);
  if (!match) return 0;
  const raw = match[1].trim();
  if (raw.includes('<')) return 0;
  const value = Number(raw.replace(/[ ,]/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function proposeTrades({ portfolioPath, holdingsPath }) {
  const cashChf = parseCashChf(holdingsPath);
  const totalValueChf = parseTotalValueChf(holdingsPath);
  const minTradeSize = parseMinimumTradeSize(portfolioPath);
  const allocations = analyzeAllocation({ portfolioPath, holdingsPath });

  if (cashChf <= 0) {
    return {
      cashChf,
      minTradeSize,
      proposals: [],
      notes: ['No CHF cash available for deployment.'],
    };
  }

  const underweight = allocations.filter((row) => row.drift < 0);
  const totalTargetGap = underweight.reduce((sum, row) => sum + Math.abs(row.drift), 0);
  if (totalTargetGap <= 0) {
    return {
      cashChf,
      minTradeSize,
      proposals: [],
      notes: ['No underweight asset classes found.'],
    };
  }

  const proposals = underweight.map((row) => {
    const share = Math.abs(row.drift) / totalTargetGap;
    const estimatedChf = Number((cashChf * share).toFixed(2));
    const allocationAfter = totalValueChf > 0 ? Number((((row.current / 100) * totalValueChf + estimatedChf) / totalValueChf * 100).toFixed(2)) : row.current;
    const driftAfter = Number((allocationAfter - row.target).toFixed(2));
    return {
      status: 'proposed',
      action: 'buy',
      assetClass: row.assetClass,
      totalValueChf,
      estimatedChf,
      driftBefore: row.drift,
      allocationBeforePct: row.current,
      allocationTargetPct: row.target,
      allocationAfterPct: allocationAfter,
      driftAfter,
      driftCorrected: Number((row.drift - driftAfter).toFixed(2)),
      fundingSource: estimatedChf > 0 ? 'cash' : 'sell_required',
      rationale: `Deploy available cash toward underweight ${row.assetClass}.`,
      blocked: minTradeSize > 0 && estimatedChf < minTradeSize,
      riskNote: 'Asset-class proposal only; instrument selection required before order generation.',
    };
  }).filter((proposal) => proposal.estimatedChf > 0);

  return {
    cashChf,
    totalValueChf,
    minTradeSize,
    proposals,
    notes: proposals.some((p) => p.blocked)
      ? ['Some proposals are below the configured minimum trade size.']
      : [],
  };
}

module.exports = { proposeTrades };
