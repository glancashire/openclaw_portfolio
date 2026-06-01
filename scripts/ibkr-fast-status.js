#!/usr/bin/env node
'use strict';

/**
 * scripts/ibkr-fast-status.js
 *
 * Tier-1 IBKR status probe. Designed to return in <5 seconds and answer the
 * four questions that matter when broker connectivity looks broken:
 *
 *   1. Is the native API socket up? (:4001 listener)
 *   2. Did authentication actually complete? (managed-accounts within timeout)
 *   3. Can we read positions with the read-only client id? (positions count)
 *   4. What is current quote posture? (live / delayed / unpriced / unknown)
 *
 * Use this BEFORE running larger sync scripts to avoid wasting time on
 * downstream symptoms when the underlying IBKR state isn't ready.
 *
 * Exit codes:
 *   0 — all four checks healthy
 *   1 — socket down (gateway not running or login wall not crossed)
 *   2 — socket up but auth not completed (likely 2FA pending)
 *   3 — auth ok but read client id can't see positions
 *   4 — read ok but quote posture is degraded (delayed/unpriced)
 *
 * Usage:
 *   node scripts/ibkr-fast-status.js
 *   node scripts/ibkr-fast-status.js --portfolio=etf --json
 */

const net = require('net');

const args = process.argv.slice(2);
const portfolio = (args.find((a) => a.startsWith('--portfolio=')) || '--portfolio=etf').split('=')[1];
const jsonOut = args.includes('--json');
const verbose = args.includes('--verbose') || args.includes('-v');

const TIMEOUT_SOCKET_MS = 1500;
const TIMEOUT_AUTH_MS = 3000;
const TIMEOUT_READ_MS = 5000;
const TIMEOUT_QUOTE_MS = 5000;

const result = {
  ts: new Date().toISOString(),
  portfolio,
  socket: null,
  auth: null,
  read: null,
  quote: null,
  exitCode: 0,
  summary: '',
  durations: {},
};

function emit(extra = {}) {
  Object.assign(result, extra);
  if (jsonOut) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    const tick = (b) => (b === true ? '✓' : b === false ? '✗' : '?');
    process.stdout.write([
      `IBKR fast status @ ${result.ts}`,
      `  ${tick(result.socket?.ok)} socket    ${describe(result.socket)}`,
      `  ${tick(result.auth?.ok)} auth      ${describe(result.auth)}`,
      `  ${tick(result.read?.ok)} read      ${describe(result.read)}`,
      `  ${tick(result.quote?.ok)} quote     ${describe(result.quote)}`,
      result.summary ? `\n=> ${result.summary}` : '',
    ].filter(Boolean).join('\n') + '\n');
  }
  process.exit(result.exitCode);
}

function describe(stage) {
  if (!stage) return 'not checked';
  const ms = stage.ms != null ? ` (${stage.ms}ms)` : '';
  return `${stage.detail || ''}${ms}`.trim();
}

async function timed(label, fn, timeoutMs) {
  const start = Date.now();
  try {
    const v = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)),
    ]);
    const ms = Date.now() - start;
    return { ok: true, value: v, ms };
  } catch (e) {
    const ms = Date.now() - start;
    return { ok: false, error: e?.message || String(e), ms };
  }
}

async function checkSocket() {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: '127.0.0.1', port: 4001 });
    let done = false;
    const finish = (ok, detail) => {
      if (done) return;
      done = true;
      try { s.destroy(); } catch {}
      resolve({ ok, detail });
    };
    s.setTimeout(TIMEOUT_SOCKET_MS, () => finish(false, 'connect timeout to 127.0.0.1:4001'));
    s.once('connect', () => finish(true, '127.0.0.1:4001 listening'));
    s.once('error', (e) => finish(false, e.message));
  });
}

async function checkAuthAndRead() {
  // Late require so a missing dep doesn't crash the socket-only path.
  const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');
  const client = new InteractiveBrokersClient({ portfolio });
  const auth = await timed('auth', async () => {
    const a = await client.authenticate();
    if (!a?.ok) throw new Error(a?.error || a?.diagnostics?.detail || 'auth not ok');
    return a;
  }, TIMEOUT_AUTH_MS);
  result.auth = { ok: auth.ok, detail: auth.ok ? 'managed-accounts received' : `auth failed: ${auth.error}`, ms: auth.ms };
  if (!auth.ok) {
    result.exitCode = 2;
    result.summary = 'Socket is up but auth did not complete in time. Likely a manual login/2FA step is still required on display :99.';
    return;
  }
  const read = await timed('read', async () => {
    const positions = await client.native.fetchPositions();
    if (!Array.isArray(positions)) throw new Error('positions not an array');
    return positions;
  }, TIMEOUT_READ_MS);
  if (read.ok) {
    result.read = { ok: true, detail: `${read.value.length} positions visible`, ms: read.ms };
  } else {
    result.read = { ok: false, detail: read.error, ms: read.ms };
    result.exitCode = 3;
    result.summary = 'Auth ok but read failed. Suspect read-only client id behavior or session collision; consider restarting native gateway.';
    return;
  }
  const quote = await timed('quote', async () => {
    const { getInteractiveBrokersReadinessBounded } = require('../src/brokers/interactive-brokers/readiness');
    const r = await getInteractiveBrokersReadinessBounded({ portfolio, timeoutMs: TIMEOUT_QUOTE_MS - 200 });
    return r;
  }, TIMEOUT_QUOTE_MS);
  if (quote.ok) {
    const mode = quote.value?.marketDataMode || 'unknown';
    const ok = mode === 'live_or_realtime';
    result.quote = { ok, detail: `marketDataMode=${mode}`, ms: quote.ms };
    if (!ok) {
      result.exitCode = 4;
      result.summary = `Read path is healthy but quote posture is ${mode}. Live submission should remain blocked.`;
    } else {
      result.summary = 'IBKR is fully ready.';
    }
  } else {
    result.quote = { ok: false, detail: quote.error, ms: quote.ms };
    result.exitCode = 4;
    result.summary = 'Read ok but quote posture probe failed.';
  }
}

(async () => {
  const sock = await checkSocket();
  result.socket = { ok: sock.ok, detail: sock.detail };
  if (!sock.ok) {
    result.exitCode = 1;
    result.summary = 'Native API socket on 127.0.0.1:4001 is not reachable. Restart IB Gateway: /home/ubuntu/ibgateway-native/start-ibc.sh';
    return emit();
  }
  await checkAuthAndRead();
  emit();
})().catch((e) => {
  result.exitCode = 1;
  result.summary = `unexpected error: ${e?.message || e}`;
  emit();
});
