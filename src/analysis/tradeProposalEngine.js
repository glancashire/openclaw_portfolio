const fs = require('fs');
const { analyzeAllocation } = require('./allocationAnalysis');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseNumber(value) {
  const cleaned = String(value || '').replace(/[,% ]/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function extractLineValue(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`- ${escaped}:\\s*(.+)`));
  return match ? match[1].trim() : null;
}

function parseTotalValueChf(holdingsPath) {
  const text = readText(holdingsPath);
  const match = text.match(/- Total value CHF:\s*(.+)/);
  if (!match) return 0;
  return parseNumber(match[1]);
}

function parseCashChf(holdingsPath) {
  const text = readText(holdingsPath);
  const lines = text.split(/\r?\n/);
  const cashRow = lines.find((line) => /^\|\s*CHF\s*\|/.test(line) && /\|\s*cash\s*\|?\s*$/i.test(line));
  if (!cashRow) return 0;
  const cells = cashRow.split('|').slice(1, -1).map((cell) => cell.trim());
  return parseNumber(cells[6] || cells[3] || cells[1] || '0');
}

function parseMinimumTradeSize(portfolioText) {
  const raw = extractLineValue(portfolioText, 'Minimum trade size');
  if (!raw || raw.includes('<')) return 0;
  return parseNumber(raw.replace(/^CHF\s*/i, ''));
}

function parseRebalancingPolicy(portfolioPath) {
  const text = readText(portfolioPath);
  const thresholdRaw = extractLineValue(text, 'Rebalance threshold') || '';
  const absoluteMatch = thresholdRaw.match(/absolute drift\s*>\s*([\d.]+)\s*percentage points/i);
  const relativeMatch = thresholdRaw.match(/relative drift\s*>\s*([\d.]+)\s*%/i);
  const avoidUnnecessaryTrades = /^true$/i.test(extractLineValue(text, 'Avoid unnecessary trades') || '');
  const preferCashBeforeSelling = /^true$/i.test(extractLineValue(text, 'Prefer using new cash before selling') || '');

  return {
    minimumTradeSizeChf: parseMinimumTradeSize(text),
    rebalanceThreshold: {
      raw: thresholdRaw,
      absoluteDriftPct: absoluteMatch ? parseNumber(absoluteMatch[1]) : 0,
      relativeDriftPct: relativeMatch ? parseNumber(relativeMatch[1]) : 0,
    },
    avoidUnnecessaryTrades,
    preferCashBeforeSelling,
  };
}

function exceedsRebalanceThreshold(row, threshold) {
  const absDrift = Math.abs(Number(row.drift || 0));
  const target = Math.abs(Number(row.target || 0));
  const relativeDrift = target > 0 ? (absDrift / target) * 100 : 0;
  const absHit = threshold.absoluteDriftPct > 0 && absDrift > threshold.absoluteDriftPct;
  const relativeHit = threshold.relativeDriftPct > 0 && relativeDrift > threshold.relativeDriftPct;
  if (threshold.absoluteDriftPct <= 0 && threshold.relativeDriftPct <= 0) return absDrift > 0;
  return absHit || relativeHit;
}

function buildProposal({ row, estimatedChf, totalValueChf, minimumTradeSizeChf, preferCashBeforeSelling }) {
  const currentValueChf = Number((((row.current || 0) / 100) * totalValueChf).toFixed(2));
  const allocationAfter = totalValueChf > 0
    ? Number((((currentValueChf + estimatedChf) / totalValueChf) * 100).toFixed(2))
    : Number(row.current || 0);
  const driftAfter = Number((allocationAfter - Number(row.target || 0)).toFixed(2));
  const belowMinimum = minimumTradeSizeChf > 0 && estimatedChf < minimumTradeSizeChf;
  const rationaleBits = [`Underweight ${row.assetClass} exceeds configured rebalance threshold.`];
  if (preferCashBeforeSelling) rationaleBits.push('Using available cash before considering sells.');
  if (belowMinimum) rationaleBits.push(`Suggested size remains below the configured CHF ${minimumTradeSizeChf} minimum trade size.`);

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
    driftCorrected: Number((Number(row.drift || 0) - driftAfter).toFixed(2)),
    fundingSource: estimatedChf > 0 ? 'cash' : 'sell_required',
    rationale: rationaleBits.join(' '),
    blocked: belowMinimum,
    blockedReason: belowMinimum ? `Below minimum trade size of CHF ${minimumTradeSizeChf}.` : null,
    thresholdTriggered: true,
    riskNote: 'Asset-class proposal only; instrument selection required before order generation.',
  };
}

function proposeTrades({ portfolioPath, holdingsPath }) {
  const cashChf = parseCashChf(holdingsPath);
  const totalValueChf = parseTotalValueChf(holdingsPath);
  const policy = parseRebalancingPolicy(portfolioPath);
  const allocations = analyzeAllocation({ portfolioPath, holdingsPath });

  if (cashChf <= 0) {
    return {
      cashChf,
      totalValueChf,
      minTradeSize: policy.minimumTradeSizeChf,
      rebalancingPolicy: policy,
      proposals: [],
      notes: ['No CHF cash available for deployment.'],
    };
  }

  const thresholdEligible = allocations
    .filter((row) => Number(row.drift) < 0)
    .filter((row) => exceedsRebalanceThreshold(row, policy.rebalanceThreshold));

  if (!thresholdEligible.length) {
    return {
      cashChf,
      totalValueChf,
      minTradeSize: policy.minimumTradeSizeChf,
      rebalancingPolicy: policy,
      proposals: [],
      notes: ['All underweight asset classes are within the configured rebalance threshold.'],
    };
  }

  const totalTargetGap = thresholdEligible.reduce((sum, row) => sum + Math.abs(Number(row.drift || 0)), 0);
  const proposals = thresholdEligible
    .map((row) => {
      const share = totalTargetGap > 0 ? Math.abs(Number(row.drift || 0)) / totalTargetGap : 0;
      const estimatedChf = Number((cashChf * share).toFixed(2));
      return buildProposal({
        row,
        estimatedChf,
        totalValueChf,
        minimumTradeSizeChf: policy.minimumTradeSizeChf,
        preferCashBeforeSelling: policy.preferCashBeforeSelling,
      });
    })
    .filter((proposal) => proposal.estimatedChf > 0);

  const blockedCount = proposals.filter((proposal) => proposal.blocked).length;
  const notes = [];
  if (policy.preferCashBeforeSelling) notes.push('Used available CHF cash before considering any sell-driven rebalance moves.');
  if (blockedCount > 0) notes.push(`${blockedCount} proposal(s) remain below the configured minimum trade size.`);
  if (!blockedCount && policy.avoidUnnecessaryTrades) notes.push('Only threshold-breaching underweights were proposed to avoid unnecessary trades.');

  return {
    cashChf,
    totalValueChf,
    minTradeSize: policy.minimumTradeSizeChf,
    rebalancingPolicy: policy,
    proposals,
    notes,
  };
}

module.exports = { proposeTrades, parseRebalancingPolicy, exceedsRebalanceThreshold };
