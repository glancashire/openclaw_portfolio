#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  acquireIbkrSyncGuard,
  releaseIbkrSyncGuard,
  runWithIbkrSyncGuard,
} = require('../src/brokers/interactive-brokers/syncGuard');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ibkr-sync-guard-'));
const portfolioDir = path.join(tmpRoot, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });

const first = acquireIbkrSyncGuard({ portfolioDir, operation: 'holdings_sync' });
assert.strictEqual(first.ok, true);
assert(fs.existsSync(first.lockPath));

const second = acquireIbkrSyncGuard({ portfolioDir, operation: 'accounting_sync' });
assert.strictEqual(second.ok, false);
assert.strictEqual(second.reason, 'sync_in_progress');
assert.match(second.message, /already in progress/i);

releaseIbkrSyncGuard(first);
assert.strictEqual(fs.existsSync(first.lockPath), false);

const stale = acquireIbkrSyncGuard({ portfolioDir, operation: 'holdings_sync' });
const payload = JSON.parse(fs.readFileSync(stale.lockPath, 'utf8'));
payload.createdAtMs = Date.now() - 10 * 60 * 1000;
fs.writeFileSync(stale.lockPath, JSON.stringify(payload, null, 2));
const recovered = acquireIbkrSyncGuard({ portfolioDir, operation: 'accounting_sync', staleAfterMs: 60 * 1000 });
assert.strictEqual(recovered.ok, true);
releaseIbkrSyncGuard(recovered);

(async () => {
  const guarded = await runWithIbkrSyncGuard({ portfolioDir, operation: 'dashboard_refresh' }, async () => ({ ok: true, ran: true }));
  assert.deepStrictEqual(guarded, { ok: true, ran: true });

  const held = acquireIbkrSyncGuard({ portfolioDir, operation: 'holdings_sync' });
  const blocked = await runWithIbkrSyncGuard({ portfolioDir, operation: 'accounting_sync' }, async () => ({ ok: true }));
  assert.strictEqual(blocked.ok, false);
  assert.strictEqual(blocked.reason, 'sync_in_progress');
  releaseIbkrSyncGuard(held);

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
