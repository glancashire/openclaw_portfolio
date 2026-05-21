'use strict';

const fs = require('fs');
const path = require('path');

const BASKET_REAPPROVAL_SCHEMA_VERSION = '1.0';

function reapprovalRoot(rootDir = process.cwd()) {
  return path.join(rootDir, 'runtime', 'basket-reapprovals');
}

function reapprovalPath({ portfolio, approvalId, rootDir = process.cwd() }) {
  if (!portfolio) throw new Error('portfolio is required');
  if (!approvalId) throw new Error('approvalId is required');
  return path.join(reapprovalRoot(rootDir), portfolio, `${approvalId}.json`);
}

function evaluateLegPriceDrift({ approvedLeg = {}, currentLeg = {}, tolerancePct = 0.5 } = {}) {
  const approved = Number(approvedLeg.limitPrice || 0);
  const current = Number(currentLeg.limitPrice || 0);
  if (!Number.isFinite(approved) || approved <= 0 || !Number.isFinite(current) || current <= 0) {
    return { ok: false, code: 'price_unavailable', reason: 'Approved or current price is unavailable.', driftPct: null, withinBand: false };
  }
  const driftPct = Number((((current - approved) / approved) * 100).toFixed(2));
  const lower = Number((approved * (1 - tolerancePct / 100)).toFixed(2));
  const upper = Number((approved * (1 + tolerancePct / 100)).toFixed(2));
  const withinBand = current >= lower && current <= upper;
  return {
    ok: true,
    approvedPrice: approved,
    currentPrice: current,
    driftPct,
    lowerBound: lower,
    upperBound: upper,
    withinBand,
    stale: !withinBand,
  };
}

function buildCompactReapproval({ portfolio, approvalId, originalApproval, affectedLegs = [], now = new Date() } = {}) {
  const generatedAt = new Date(now).toISOString();
  const legs = affectedLegs.map((leg) => ({
    legId: leg.legId,
    instrument: leg.instrument,
    action: leg.action,
    quantity: leg.quantity,
    originalLimitPrice: Number(leg.limitPrice || 0),
    proposedLimitPrice: Number(leg.currentPrice || leg.limitPrice || 0),
    lowerBound: Number(leg.lowerBound || 0),
    upperBound: Number(leg.upperBound || 0),
    driftPct: Number(leg.driftPct || 0),
    reason: leg.reason || 'Price band drifted beyond the approved range.',
  }));
  const artifact = {
    schemaVersion: BASKET_REAPPROVAL_SCHEMA_VERSION,
    portfolio,
    approvalId,
    generatedAt,
    originalApprovalId: originalApproval?.approvalId || null,
    summary: {
      affectedLegCount: legs.length,
      unaffectedLegCount: Math.max(0, Number(originalApproval?.legs?.length || 0) - legs.length),
      reason: 'One or more leg price bands drifted beyond the approved range.',
    },
    legs,
  };
  const outPath = reapprovalPath({ portfolio, approvalId, rootDir: process.cwd() });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  return { path: outPath, artifact };
}

function detectBasketPriceDrift({ approvalEnvelope, currentLegs = [], tolerancePct = 0.5, now = new Date() } = {}) {
  const currentByLegId = new Map(currentLegs.map((leg) => [String(leg.legId), leg]));
  const affectedLegs = [];
  const legResults = [];
  for (const leg of approvalEnvelope?.legs || []) {
    const current = currentByLegId.get(String(leg.legId)) || null;
    const drift = evaluateLegPriceDrift({ approvedLeg: leg, currentLeg: current || leg, tolerancePct });
    const row = {
      legId: leg.legId,
      instrument: leg.instrument,
      approvedPrice: drift.approvedPrice,
      currentPrice: drift.currentPrice,
      driftPct: drift.driftPct,
      lowerBound: drift.lowerBound,
      upperBound: drift.upperBound,
      withinBand: drift.withinBand,
      stale: drift.stale,
      reason: drift.reason || null,
    };
    legResults.push(row);
    if (drift.stale) affectedLegs.push({ ...leg, ...row });
  }
  const compactReapproval = affectedLegs.length > 0
    ? buildCompactReapproval({ portfolio: approvalEnvelope?.portfolio, approvalId: approvalEnvelope?.approvalId, originalApproval: approvalEnvelope, affectedLegs, now })
    : null;
  return {
    ok: true,
    tolerancePct,
    affectedLegCount: affectedLegs.length,
    unaffectedLegCount: Math.max(0, (approvalEnvelope?.legs?.length || 0) - affectedLegs.length),
    legResults,
    affectedLegs,
    compactReapproval,
  };
}

module.exports = {
  BASKET_REAPPROVAL_SCHEMA_VERSION,
  reapprovalRoot,
  reapprovalPath,
  evaluateLegPriceDrift,
  buildCompactReapproval,
  detectBasketPriceDrift,
};
