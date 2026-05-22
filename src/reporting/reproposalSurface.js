'use strict';

/* Phase 193 — Surface pending reproposal envelopes from runtime/basket-reproposals/. */

const fs = require('fs');
const path = require('path');

function reproposalDirFor(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'basket-reproposals', portfolio);
}
function approvedDirFor(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'approved-order-baskets', portfolio);
}

/**
 * Returns reproposal envelopes that have NOT yet been promoted to approved baskets.
 * Each item: { parentApprovalId, version, path, approvalId, legs, createdAt }.
 */
function listPendingReproposals({ rootDir, portfolio }) {
  const dir = reproposalDirFor(rootDir, portfolio);
  if (!fs.existsSync(dir)) return [];
  const approvedDir = approvedDirFor(rootDir, portfolio);
  const approvedNames = fs.existsSync(approvedDir) ? new Set(fs.readdirSync(approvedDir)) : new Set();

  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    if (approvedNames.has(name)) continue; // already promoted
    let envelope;
    try { envelope = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); } catch (_) { continue; }
    out.push({
      parentApprovalId: envelope.parentApprovalId,
      version: Number(envelope.reproposalVersion || 0),
      path: path.join(dir, name),
      approvalId: envelope.approvalId,
      legs: Array.isArray(envelope.legs) ? envelope.legs : [],
      createdAt: envelope.createdAt,
    });
  }
  out.sort((a, b) => String(a.parentApprovalId).localeCompare(String(b.parentApprovalId))
    || (a.version - b.version));
  return out;
}

/**
 * Build a queue item describing a single pending reproposal.
 */
function describeReproposalItem({ portfolio, reproposal }) {
  const legSummary = (reproposal.legs || []).map((leg) => {
    const sym = leg.ibkrSymbol || leg.instrument || '?';
    const prev = Number.isFinite(Number(leg.previousLimit)) ? ` (was ${leg.previousLimit})` : '';
    const cur = `${leg.action || 'BUY'} ${leg.quantity} @ ${leg.limitPrice} ${leg.currency || ''}`.trim();
    return `${sym} ${cur}${prev}`;
  }).join('; ');

  return {
    portfolio,
    queueType: 'approval',
    kind: 'basket_reproposal_pending',
    severity: 'medium',
    urgency: 'high',
    status: 'pending_user_approval',
    parentApprovalId: reproposal.parentApprovalId,
    approvalId: reproposal.approvalId,
    reproposalVersion: reproposal.version,
    summary: `Reproposal v${reproposal.version} pending approval: ${legSummary}`,
    explanation: `Reproposal envelope at ${reproposal.path} is awaiting a single operator approve.`,
    effectIfApproved: `Assistant will run scripts/approve-and-execute-reproposal.js --parent=${reproposal.parentApprovalId} which promotes the envelope and transmits via the canonical runner.`,
    effectIfIgnored: 'The cancelled leg(s) remain unfilled and the portfolio stays partially deployed.',
    recommendedOperatorAction: `Reply approve to transmit; assistant will run scripts/approve-and-execute-reproposal.js --parent=${reproposal.parentApprovalId}`,
  };
}

module.exports = { listPendingReproposals, describeReproposalItem, reproposalDirFor, approvedDirFor };
