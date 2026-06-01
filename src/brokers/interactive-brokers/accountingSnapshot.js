'use strict';

const fs = require('fs');
const path = require('path');
const { runWithIbkrSyncGuard } = require('./syncGuard');

function shouldPreservePreviousAccountingSnapshot({ authOk, accountId, positions = [], ledger = [] } = {}) {
  if (!authOk || !accountId) return false;
  const hasPositions = Array.isArray(positions) && positions.length > 0;
  const hasLedger = Array.isArray(ledger) && ledger.length > 0;
  return !hasPositions && !hasLedger;
}

function preservePreviousAccountingSnapshotIfNeeded({ outDir, ...state } = {}) {
  if (!shouldPreservePreviousAccountingSnapshot(state)) return null;
  const latestPath = path.join(outDir, 'latest.json');
  if (!fs.existsSync(latestPath)) return null;
  return {
    ok: false,
    reason: 'preserved_last_known_good',
    message: 'Degraded broker read returned empty accounting snapshot after successful auth; preserved last-known-good accounting artifact.',
    preservedPath: latestPath,
  };
}

async function runAccountingSnapshotSync({ portfolioDir, outDir, writer }) {
  return runWithIbkrSyncGuard({ portfolioDir, operation: 'accounting_sync' }, writer);
}

module.exports = {
  shouldPreservePreviousAccountingSnapshot,
  preservePreviousAccountingSnapshotIfNeeded,
  runAccountingSnapshotSync,
};
