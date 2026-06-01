'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function lockPathFor(portfolioDir) {
  return path.join(portfolioDir, '.runtime', 'ibkr-read-sync.lock.json');
}

function acquireIbkrSyncGuard({ portfolioDir, operation = 'ibkr_sync', staleAfterMs = 5 * 60 * 1000 } = {}) {
  const lockPath = lockPathFor(portfolioDir);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const now = Date.now();
  if (fs.existsSync(lockPath)) {
    try {
      const current = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      const createdAtMs = Number(current?.createdAtMs || 0);
      if (Number.isFinite(createdAtMs) && (now - createdAtMs) <= staleAfterMs) {
        return {
          ok: false,
          reason: 'sync_in_progress',
          message: `IBKR read sync already in progress for ${path.basename(portfolioDir)}.` ,
          lockPath,
          current,
        };
      }
    } catch {}
    try { fs.unlinkSync(lockPath); } catch {}
  }

  const payload = {
    operation,
    createdAtMs: now,
    pid: process.pid,
    host: os.hostname(),
  };
  fs.writeFileSync(lockPath, JSON.stringify(payload, null, 2), { flag: 'w' });
  return { ok: true, lockPath, payload };
}

function releaseIbkrSyncGuard(lock = null) {
  const lockPath = lock?.lockPath;
  if (!lockPath) return;
  try { if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath); } catch {}
}

async function runWithIbkrSyncGuard(options, fn) {
  const lock = acquireIbkrSyncGuard(options);
  if (!lock.ok) return lock;
  try {
    return await fn(lock);
  } finally {
    releaseIbkrSyncGuard(lock);
  }
}

module.exports = {
  lockPathFor,
  acquireIbkrSyncGuard,
  releaseIbkrSyncGuard,
  runWithIbkrSyncGuard,
};
