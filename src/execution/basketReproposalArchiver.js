'use strict';

/* Phase 194 — Archive superseded reproposal envelopes (keep only the latest un-promoted per parent). */

const fs = require('fs');
const path = require('path');

function reproposalDir(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'basket-reproposals', portfolio);
}
function approvedDir(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'approved-order-baskets', portfolio);
}
function archiveDir(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'basket-reproposals', portfolio, '.superseded');
}

function readEnvelope(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return null; }
}

/**
 * Group un-promoted reproposal files by parentApprovalId. For each parent with >1 un-promoted
 * versions, move all but the highest into `.superseded/`. Returns the list of archived files.
 *
 * Idempotent: re-running on a clean state is a no-op.
 */
function sweepSupersededReproposals({ rootDir, portfolio, dryRun = false } = {}) {
  const dir = reproposalDir(rootDir, portfolio);
  if (!fs.existsSync(dir)) return { archived: [], scanned: 0 };
  const approved = approvedDir(rootDir, portfolio);
  const approvedNames = fs.existsSync(approved) ? new Set(fs.readdirSync(approved)) : new Set();

  const byParent = new Map();
  let scanned = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    if (approvedNames.has(name)) continue;
    const full = path.join(dir, name);
    const env = readEnvelope(full);
    if (!env || !env.parentApprovalId || !Number.isFinite(Number(env.reproposalVersion))) continue;
    scanned += 1;
    const parent = env.parentApprovalId;
    const list = byParent.get(parent) || [];
    list.push({ name, full, version: Number(env.reproposalVersion) });
    byParent.set(parent, list);
  }

  const archived = [];
  for (const [parent, list] of byParent.entries()) {
    if (list.length <= 1) continue;
    list.sort((a, b) => a.version - b.version);
    const max = list[list.length - 1].version;
    const toArchive = list.filter((item) => item.version < max);
    if (toArchive.length === 0) continue;
    if (!dryRun) fs.mkdirSync(archiveDir(rootDir, portfolio), { recursive: true });
    for (const item of toArchive) {
      const dest = path.join(archiveDir(rootDir, portfolio), item.name);
      if (!dryRun) {
        fs.renameSync(item.full, dest);
      }
      archived.push({ parent, version: item.version, from: item.full, to: dest });
    }
  }
  return { archived, scanned };
}

module.exports = { sweepSupersededReproposals, archiveDir, reproposalDir, approvedDir };
