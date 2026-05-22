'use strict';

/* Phase 191 — promote a pending reproposal envelope to an approved basket. */

const fs = require('fs');
const path = require('path');

function reproposalDir(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'basket-reproposals', portfolio);
}
function approvedDir(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'approved-order-baskets', portfolio);
}

function latestReproposal({ portfolio, parentApprovalId, rootDir }) {
  const dir = reproposalDir(rootDir, portfolio);
  if (!fs.existsSync(dir)) return null;
  const re = new RegExp(`^${parentApprovalId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-reproposal-(\\d+)\\.json$`);
  let best = null;
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    if (!best || v > best.version) best = { version: v, path: path.join(dir, name) };
  }
  return best;
}

function promoteReproposalToApproval({ portfolio, parentApprovalId, version, rootDir, now = new Date() }) {
  let source;
  if (Number.isFinite(version)) {
    const candidate = path.join(reproposalDir(rootDir, portfolio), `${parentApprovalId}-reproposal-${version}.json`);
    if (!fs.existsSync(candidate)) return { ok: false, reason: 'reproposal_not_found', path: candidate };
    source = { path: candidate, version };
  } else {
    source = latestReproposal({ portfolio, parentApprovalId, rootDir });
    if (!source) return { ok: false, reason: 'no_reproposal_available' };
  }

  const envelope = JSON.parse(fs.readFileSync(source.path, 'utf8'));
  // Promotion: copy + flip status. Preserve approvalId so the runner stores its run state under the reproposal id.
  const promoted = {
    ...envelope,
    status: 'approved',
    approvedAt: typeof now === 'string' ? now : now.toISOString(),
    promotedFrom: source.path,
    legs: (envelope.legs || []).map((leg) => ({ ...leg, status: 'approved' })),
  };

  const dir = approvedDir(rootDir, portfolio);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `${envelope.approvalId}.json`);

  // Idempotency: if already promoted with same content, skip.
  if (fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (existing.status === 'approved' && existing.approvalId === envelope.approvalId) {
        return { ok: true, alreadyPromoted: true, path: outPath, version: source.version };
      }
    } catch (_) { /* fall through to overwrite */ }
  }

  fs.writeFileSync(outPath, JSON.stringify(promoted, null, 2));
  return { ok: true, alreadyPromoted: false, path: outPath, version: source.version, envelope: promoted };
}

module.exports = { promoteReproposalToApproval, latestReproposal };
