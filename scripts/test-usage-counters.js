#!/usr/bin/env node
'use strict';

/**
 * Unit tests for src/reporting/usageCounters.js.
 *
 * Covers: schema, rolling windows, unavailable fallthrough, edge cases
 * (zero events, missing fields), percentile helper.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  SCHEMA_VERSION,
  buildSnapshot,
  summarizeForDashboard,
  readSnapshot,
  writeSnapshot,
  countReports,
  assessDeliveryHealth,
  assessApprovalLatency,
  assessReconciliationLag,
  percentile,
} = require('../src/reporting/usageCounters');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// --- Percentile helper ---

test('percentile: empty array returns null', () => {
  assert.strictEqual(percentile([], 50), null);
});

test('percentile: single element', () => {
  assert.strictEqual(percentile([100], 50), 100);
  assert.strictEqual(percentile([100], 90), 100);
});

test('percentile: multiple elements', () => {
  const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.strictEqual(percentile(sorted, 50), 50);
  assert.strictEqual(percentile(sorted, 90), 90);
  assert.strictEqual(percentile(sorted, 10), 10);
});

// --- countReports ---

test('countReports: missing file returns unavailable', () => {
  const r = countReports('/nonexistent', 7);
  assert.strictEqual(r.available, false);
});

test('countReports: counts within window', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-test-'));
  const overviewDir = path.join(tmp, 'runtime/overview');
  fs.mkdirSync(overviewDir, { recursive: true });
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const oldStr = '20200101';
  fs.writeFileSync(path.join(overviewDir, 'report-history.json'), JSON.stringify({
    portfolios: [{
      portfolio: 'test',
      reports: [
        { date: todayStr, period: 'daily' },
        { date: todayStr, period: 'weekly' },
        { date: oldStr, period: 'monthly' },
      ],
    }],
  }));
  const r7 = countReports(tmp, 7);
  assert.strictEqual(r7.available, true);
  assert.strictEqual(r7.count, 2);
  assert.strictEqual(r7.byPeriod.daily, 1);
  assert.strictEqual(r7.byPeriod.weekly, 1);
  fs.rmSync(tmp, { recursive: true });
});

// --- assessDeliveryHealth ---

test('assessDeliveryHealth: missing file returns unavailable', () => {
  const r = assessDeliveryHealth('/nonexistent');
  assert.strictEqual(r.available, false);
});

test('assessDeliveryHealth: counts ready/not-ready', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-test-'));
  const overviewDir = path.join(tmp, 'runtime/overview');
  fs.mkdirSync(overviewDir, { recursive: true });
  fs.writeFileSync(path.join(overviewDir, 'delivery-status.json'), JSON.stringify({
    portfolios: [
      { ready: true, deliveryPosture: { brokerAutomationPaused: false, brokerBlockContext: { blockedTradeCount: 0 } } },
      { ready: false, deliveryPosture: { brokerAutomationPaused: true, brokerBlockContext: { blockedTradeCount: 1 } } },
    ],
  }));
  const r = assessDeliveryHealth(tmp);
  assert.strictEqual(r.available, true);
  assert.strictEqual(r.readyCount, 1);
  assert.strictEqual(r.notReadyCount, 1);
  assert.strictEqual(r.brokerDegraded, true);
  fs.rmSync(tmp, { recursive: true });
});

// --- assessApprovalLatency ---

test('assessApprovalLatency: missing file returns unavailable', () => {
  const r = assessApprovalLatency('/nonexistent');
  assert.strictEqual(r.available, false);
});

test('assessApprovalLatency: computes latencies', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-test-'));
  const overviewDir = path.join(tmp, 'runtime/overview');
  fs.mkdirSync(overviewDir, { recursive: true });
  fs.writeFileSync(path.join(overviewDir, 'approvals-queue.json'), JSON.stringify({
    items: [
      { createdAt: '2026-06-01T10:00:00Z', approvedAt: '2026-06-01T10:05:00Z' },
      { createdAt: '2026-06-01T11:00:00Z', approvedAt: '2026-06-01T11:10:00Z' },
      { createdAt: '2026-06-02T08:00:00Z' }, // pending, no approval
    ],
  }));
  const r = assessApprovalLatency(tmp);
  assert.strictEqual(r.available, true);
  assert.strictEqual(r.pendingCount, 3);
  assert.strictEqual(r.latencies.length, 2);
  assert.strictEqual(r.latencies[0], 300000); // 5 min
  assert.strictEqual(r.latencies[1], 600000); // 10 min
  fs.rmSync(tmp, { recursive: true });
});

// --- assessReconciliationLag ---

test('assessReconciliationLag: missing file returns unavailable', () => {
  const r = assessReconciliationLag('/nonexistent', 'etf');
  assert.strictEqual(r.available, false);
});

test('assessReconciliationLag: returns lag from mtime', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-test-'));
  const accDir = path.join(tmp, 'runtime/ibkr-accounting/etf');
  fs.mkdirSync(accDir, { recursive: true });
  fs.writeFileSync(path.join(accDir, 'latest.json'), '{}');
  const r = assessReconciliationLag(tmp, 'etf');
  assert.strictEqual(r.available, true);
  assert(r.lagDays <= 0.1, `lag should be near zero, got ${r.lagDays}`);
  assert(r.lastReconcileAt);
  fs.rmSync(tmp, { recursive: true });
});

// --- buildSnapshot ---

test('buildSnapshot: produces valid structure from empty repo', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-test-'));
  const snapshot = buildSnapshot(tmp);
  assert.strictEqual(snapshot.schemaVersion, SCHEMA_VERSION);
  assert(snapshot.generatedAt);
  assert(snapshot.counters);
  assert.strictEqual(snapshot.counters.reportSends.last7d, 'unavailable');
  assert.strictEqual(snapshot.counters.deliveryHealth.available, false);
  assert.strictEqual(snapshot.counters.approvalLatency.available, false);
  assert.strictEqual(snapshot.counters.reconciliationLag.available, false);
  fs.rmSync(tmp, { recursive: true });
});

// --- summarizeForDashboard ---

test('summarizeForDashboard: null snapshot returns empty array', () => {
  assert.deepStrictEqual(summarizeForDashboard(null), []);
});

test('summarizeForDashboard: produces items from valid snapshot', () => {
  const snapshot = {
    counters: {
      reportSends: { last7d: 3 },
      deliveryHealth: { available: true, readyPortfolios: 1, notReadyPortfolios: 0, brokerDegraded: false },
      approvalLatency: { available: true, pendingCount: 2, medianMs: 120000 },
      reconciliationLag: { available: true, lagDays: 0.5, lastReconcileAt: '2026-06-03T00:00:00Z' },
    },
  };
  const items = summarizeForDashboard(snapshot);
  assert(items.length >= 3);
  assert(items.some(i => i.value.includes('3')));
  assert(items.some(i => i.value.includes('ready')));
  assert(items.some(i => i.value.includes('min')));
});

test('summarizeForDashboard: unavailable shows dash', () => {
  const snapshot = {
    counters: {
      reportSends: { last7d: 'unavailable' },
    },
  };
  const items = summarizeForDashboard(snapshot);
  assert(items.some(i => i.value === '—'));
});

// --- readSnapshot / writeSnapshot ---

test('readSnapshot: returns null for missing file', () => {
  assert.strictEqual(readSnapshot('/nonexistent/path.json'), null);
});

test('writeSnapshot + readSnapshot round-trip', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-test-'));
  const p = path.join(tmp, 'counters.json');
  const snap = { schemaVersion: '1.0', generatedAt: 'x', counters: {} };
  writeSnapshot(snap, p);
  const loaded = readSnapshot(p);
  assert.deepStrictEqual(loaded, snap);
  fs.rmSync(tmp, { recursive: true });
});

console.log(JSON.stringify({ ok: true, passed }, null, 2));
