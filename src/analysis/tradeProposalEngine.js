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
  const summaryMatch = text.match(/- Cash CHF:\s*(.+)/);
  if (summaryMatch) {
    return parseNumber(summaryMatch[1]);
  }

  const lines = text.split(/\r?\n/);
  const cashTableStart = lines.findIndex((line) => line.trim() === '## Cash');
  if (cashTableStart !== -1) {
    for (let i = cashTableStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('## ')) break;
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if ((cells[0] || '').toUpperCase() === 'CHF') {
        return parseNumber(cells[3] || cells[1] || '0');
      }
    }
  }

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

function parseStopTurnoverPct(portfolioText) {
  const raw = extractLineValue(portfolioText, 'Avoid excessive turnover above');
  if (!raw || raw.includes('<')) return 0;
  return parseNumber(raw);
}

function parseRebalancingPolicy(portfolioPath) {
  const text = readText(portfolioPath);
  const thresholdRaw = extractLineValue(text, 'Rebalance threshold') || '';
  const absoluteMatch = thresholdRaw.match(/absolute drift\s*>\s*([\d.]+)\s*percentage points/i);
  const relativeMatch = thresholdRaw.match(/relative drift\s*>\s*([\d.]+)\s*%/i);
  const avoidUnnecessaryTrades = /^true$/i.test(extractLineValue(text, 'Avoid unnecessary trades') || '');
  const preferCashBeforeSelling = /^true$/i.test(extractLineValue(text, 'Prefer using new cash before selling') || '');
  const maxCashDragAfterDeploymentPct = parseNumber(extractLineValue(text, 'Max cash drag after full deployment') || '0');

  return {
    minimumTradeSizeChf: parseMinimumTradeSize(text),
    rebalanceThreshold: {
      raw: thresholdRaw,
      absoluteDriftPct: absoluteMatch ? parseNumber(absoluteMatch[1]) : 0,
      relativeDriftPct: relativeMatch ? parseNumber(relativeMatch[1]) : 0,
    },
    avoidUnnecessaryTrades,
    preferCashBeforeSelling,
    maxCashDragAfterDeploymentPct,
    avoidTurnoverAbovePct: parseStopTurnoverPct(text),
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

function isOutsideBounds(row) {
  const current = Number(row.current || 0);
  const min = Number(row.min || 0);
  const max = Number(row.max || 0);
  return current < min || current > max;
}

function materiallyImprovesDrift(row, estimatedChf, totalValueChf, turnoverThresholdPct = 0) {
  if (!(estimatedChf > 0) || !(totalValueChf > 0)) return false;
  const current = Number(row.current || 0);
  const target = Number(row.target || 0);
  const driftBefore = Math.abs(current - target);
  const currentValueChf = (current / 100) * totalValueChf;
  const allocationAfter = ((currentValueChf + estimatedChf) / totalValueChf) * 100;
  const driftAfter = Math.abs(allocationAfter - target);
  const driftImprovement = driftBefore - driftAfter;
  const deployedPct = (estimatedChf / totalValueChf) * 100;
  if (driftImprovement <= 0.01) return false;
  if (turnoverThresholdPct > 0 && deployedPct > turnoverThresholdPct && driftImprovement < deployedPct) return false;
  return true;
}

function buildProposal({ row, estimatedChf, totalValueChf, minimumTradeSizeChf, preferCashBeforeSelling, forcedByBounds = false, turnoverBlocked = false, cashDragBlocked = false, remainingCashPct = 0 }) {
  const currentValueChf = Number((((row.current || 0) / 100) * totalValueChf).toFixed(2));
  const deployedChf = Math.max(Number(estimatedChf || 0), 0);
  const allocationAfter = totalValueChf > 0
    ? Number((((currentValueChf + deployedChf) / totalValueChf) * 100).toFixed(2))
    : Number(row.current || 0);
  const driftAfter = Number((allocationAfter - Number(row.target || 0)).toFixed(2));
  const belowMinimum = minimumTradeSizeChf > 0 && estimatedChf < minimumTradeSizeChf;
  const rationaleBits = [forcedByBounds
    ? `Allocation for ${row.assetClass} is outside configured min/max bounds.`
    : `Underweight ${row.assetClass} exceeds configured rebalance threshold.`];
  if (preferCashBeforeSelling) rationaleBits.push('Using available cash before considering sells.');
  if (belowMinimum) rationaleBits.push(`Suggested size remains below the configured CHF ${minimumTradeSizeChf} minimum trade size.`);
  if (cashDragBlocked) rationaleBits.push(`Proposal still leaves cash drag at ${remainingCashPct}% of portfolio value.`);
  if (turnoverBlocked) rationaleBits.push('Proposal does not materially improve drift enough to justify turnover.');

  const blockedReasons = [];
  if (belowMinimum) blockedReasons.push(`Below minimum trade size of CHF ${minimumTradeSizeChf}.`);
  if (cashDragBlocked) blockedReasons.push(`Cash drag remains above policy after proposed trades (${remainingCashPct}%).`);
  if (turnoverBlocked) blockedReasons.push('Proposal would create avoidable turnover without material drift improvement.');

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
    blocked: blockedReasons.length > 0,
    blockedReason: blockedReasons.length > 0 ? blockedReasons.join(' ') : null,
    thresholdTriggered: !forcedByBounds,
    forcedByBounds,
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

  const eligible = allocations
    .filter((row) => Number(row.drift) < 0)
    .filter((row) => exceedsRebalanceThreshold(row, policy.rebalanceThreshold) || isOutsideBounds(row));

  if (!eligible.length) {
    return {
      cashChf,
      totalValueChf,
      minTradeSize: policy.minimumTradeSizeChf,
      rebalancingPolicy: policy,
      proposals: [],
      notes: ['All underweight asset classes are within the configured rebalance threshold and min/max bounds.'],
    };
  }

  const totalTargetGap = eligible.reduce((sum, row) => sum + Math.abs(Number(row.target || 0) - Number(row.current || 0)), 0);
  const deployableCashChf = cashChf;
  const plannedAllocations = eligible
    .map((row) => {
      const share = totalTargetGap > 0 ? Math.abs(Number(row.target || 0) - Number(row.current || 0)) / totalTargetGap : 0;
      const estimatedChf = Number((deployableCashChf * share).toFixed(2));
      return { row, share, estimatedChf };
    })
    .filter(({ estimatedChf }) => estimatedChf > 0);

  const totalPlannedDeploymentChf = Number(plannedAllocations.reduce((sum, item) => sum + Number(item.estimatedChf || 0), 0).toFixed(2));
  const residualCashChf = Math.max(0, Number((cashChf - totalPlannedDeploymentChf).toFixed(2)));
  const basketRemainingCashPct = totalValueChf > 0 ? Number(((residualCashChf / totalValueChf) * 100).toFixed(2)) : 0;
  const basketCashDragBlocked = policy.maxCashDragAfterDeploymentPct > 0 && basketRemainingCashPct > policy.maxCashDragAfterDeploymentPct + 0.01 && totalPlannedDeploymentChf < cashChf;

  const proposals = plannedAllocations
    .map(({ row, estimatedChf }) => {
      const forcedByBounds = isOutsideBounds(row) && !exceedsRebalanceThreshold(row, policy.rebalanceThreshold);
      const turnoverBlocked = policy.avoidUnnecessaryTrades && !forcedByBounds && (
        !materiallyImprovesDrift(row, estimatedChf, totalValueChf, policy.avoidTurnoverAbovePct)
        || (policy.avoidTurnoverAbovePct > 0 && (estimatedChf / Math.max(totalValueChf, 1)) * 100 < policy.avoidTurnoverAbovePct && Math.abs(Number(row.drift || 0)) < policy.avoidTurnoverAbovePct)
      );
      return buildProposal({
        row,
        estimatedChf,
        totalValueChf,
        minimumTradeSizeChf: policy.minimumTradeSizeChf,
        preferCashBeforeSelling: policy.preferCashBeforeSelling,
        forcedByBounds,
        turnoverBlocked,
        cashDragBlocked: basketCashDragBlocked,
        remainingCashPct: basketRemainingCashPct,
      });
    });

  const blockedCount = proposals.filter((proposal) => proposal.blocked).length;
  const notes = [];
  if (policy.preferCashBeforeSelling) notes.push('Used available CHF cash before considering any sell-driven rebalance moves.');
  if (proposals.some((proposal) => proposal.forcedByBounds)) notes.push('Included asset classes that are outside configured min/max allocation bounds.');
  if (proposals.some((proposal) => /Cash drag remains above policy/i.test(proposal.blockedReason || ''))) notes.push('Available cash still exceeds the configured post-deployment cash-drag limit.');
  if (proposals.some((proposal) => /avoidable turnover/i.test(proposal.blockedReason || ''))) notes.push('Suppressed avoidable turnover where proposals did not materially improve drift.');
  if (blockedCount > 0 && !notes.some((note) => /minimum trade size/i.test(note))) notes.push(`${blockedCount} proposal(s) remain blocked by policy checks.`);
  if (proposals.length > 0 && blockedCount === 0 && policy.avoidUnnecessaryTrades) notes.push('Only materially useful threshold or min/max-breach proposals were retained to avoid unnecessary trades.');

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
