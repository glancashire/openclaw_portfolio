const fs = require('fs');
const { analyzeAllocation } = require('./allocationAnalysis');

function parseCashChf(holdingsPath) {
  const text = fs.readFileSync(holdingsPath, 'utf8');
  const match = text.match(/\|\s*CHF\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
  if (!match) return 0;
  const value = Number(String(match[3]).replace(/[ ,]/g, '').trim());
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
    return {
      status: 'proposed',
      action: 'buy',
      assetClass: row.assetClass,
      estimatedChf,
      driftBefore: row.drift,
      rationale: `Deploy available cash toward underweight ${row.assetClass}.`,
      blocked: minTradeSize > 0 && estimatedChf < minTradeSize,
      riskNote: 'Asset-class proposal only; instrument selection required before order generation.',
    };
  }).filter((proposal) => proposal.estimatedChf > 0);

  return {
    cashChf,
    minTradeSize,
    proposals,
    notes: proposals.some((p) => p.blocked)
      ? ['Some proposals are below the configured minimum trade size.']
      : [],
  };
}

module.exports = { proposeTrades };
