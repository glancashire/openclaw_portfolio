'use strict';

// Provider-health sidecar (fix 2026-07-29): volatile quote-provider telemetry is
// persisted to a gitignored runtime sidecar, NOT embedded in the deterministic
// dashboard.md / summary.json. This test covers the round-trip + fail-safe reads
// and asserts the sidecar path lands under runtime/ (gitignored).

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  sidecarPath,
  writeProviderHealthSidecar,
  readProviderHealthSidecar,
} = require('../src/reporting/providerHealthSidecar');

let passed = 0;
function ok(cond, msg) { assert.ok(cond, msg); passed += 1; }

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phs-'));
const portfolioDir = path.join(root, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });

// 1) Path lands under runtime/ (which is gitignored) for the right portfolio.
const target = sidecarPath(portfolioDir);
ok(target.includes(`${path.sep}runtime${path.sep}quote-provider-health${path.sep}etf${path.sep}`), 'sidecar under runtime/quote-provider-health/<portfolio>/');
ok(target.endsWith('health.json'), 'sidecar file is health.json');

// 2) Missing sidecar reads as empty, never throws.
let read = readProviderHealthSidecar({ portfolioDir });
ok(Array.isArray(read.rows) && read.rows.length === 0, 'absent sidecar → empty rows');
ok(read.capturedAt === null, 'absent sidecar → null capturedAt');

// 3) Round-trip.
const rows = [
  { providerId: 'ibkr_web_api', status: 'cooling_down', consecutiveFailures: 2, cooldownUntil: '2026-07-29T20:01:10.814Z', lastError: 'ibkr_web_api_request_failed' },
  { providerId: 'yahoo_last_close', status: 'ok', consecutiveFailures: 0, cooldownUntil: null, lastError: null },
];
const written = writeProviderHealthSidecar({ portfolioDir, rows, capturedAt: '2026-07-29T20:00:00.000Z' });
ok(written === target, 'write returns the sidecar path');
ok(fs.existsSync(target), 'sidecar file created');
read = readProviderHealthSidecar({ portfolioDir });
ok(read.rows.length === 2, 'round-trip preserves rows');
ok(read.rows[0].providerId === 'ibkr_web_api' && read.rows[0].status === 'cooling_down', 'row content preserved');
ok(read.capturedAt === '2026-07-29T20:00:00.000Z', 'capturedAt preserved');

// 4) Corrupt sidecar → empty read, never throws.
fs.writeFileSync(target, '{ this is not json');
read = readProviderHealthSidecar({ portfolioDir });
ok(read.rows.length === 0, 'corrupt sidecar → empty rows (no throw)');

// 5) Default capturedAt is an ISO string when omitted.
writeProviderHealthSidecar({ portfolioDir, rows: [] });
read = readProviderHealthSidecar({ portfolioDir });
ok(typeof read.capturedAt === 'string' && !Number.isNaN(Date.parse(read.capturedAt)), 'default capturedAt is ISO');

fs.rmSync(root, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, passed }, null, 2));
