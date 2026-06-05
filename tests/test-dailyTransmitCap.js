'use strict';

/* Test daily transmit cap (Phase L1.B). */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  sumTransmittedToday,
  evaluateDailyTransmitCap,
  DEFAULT_DAILY_CAP_CHF,
} = require('../src/execution/dailyTransmitCap');

function makeRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-cap-test-'));
  fs.mkdirSync(path.join(dir, 'runtime', 'basket-runs', 'etf'), { recursive: true });
  return dir;
}

function writeRun(rootDir, name, runState) {
  const p = path.join(rootDir, 'runtime', 'basket-runs', 'etf', `${name}.json`);
  fs.writeFileSync(p, JSON.stringify(runState, null, 2));
  return p;
}

const isoToday = (now = new Date()) => now.toISOString();
const isoYesterday = () => new Date(Date.now() - 36 * 3600 * 1000).toISOString();

test('zero transmits today — returns 0', () => {
  const root = makeRoot();
  const r = sumTransmittedToday({ portfolio: 'etf', rootDir: root });
  assert.equal(r.chfTransmittedToday, 0);
  assert.equal(r.byApproval.length, 0);
});

test('one filled basket today is summed in CHF', () => {
  const root = makeRoot();
  writeRun(root, 'a', {
    portfolio: 'etf',
    approvalId: 'a',
    updatedAt: isoToday(),
    legs: {
      l1: { status: 'filled', avgFillPrice: 100, fillQuantity: 50, currency: 'CHF' },
    },
  });
  const r = sumTransmittedToday({ portfolio: 'etf', rootDir: root });
  assert.equal(r.chfTransmittedToday, 5000);
});

test('yesterday transmits do not count', () => {
  const root = makeRoot();
  writeRun(root, 'old', {
    portfolio: 'etf',
    approvalId: 'old',
    updatedAt: isoYesterday(),
    legs: {
      l1: { status: 'filled', avgFillPrice: 100, fillQuantity: 1000, currency: 'CHF' },
    },
  });
  const r = sumTransmittedToday({ portfolio: 'etf', rootDir: root });
  assert.equal(r.chfTransmittedToday, 0);
});

test('blocked legs do not count (never reached the wire)', () => {
  const root = makeRoot();
  writeRun(root, 'b', {
    portfolio: 'etf',
    approvalId: 'b',
    updatedAt: isoToday(),
    legs: {
      l1: { status: 'blocked', limitPrice: 100, quantity: 50, currency: 'CHF' },
    },
  });
  const r = sumTransmittedToday({ portfolio: 'etf', rootDir: root });
  assert.equal(r.chfTransmittedToday, 0);
});

test('cancelled and failed legs DO count (order was on the wire)', () => {
  const root = makeRoot();
  writeRun(root, 'c', {
    portfolio: 'etf',
    approvalId: 'c',
    updatedAt: isoToday(),
    legs: {
      l1: { status: 'cancelled', limitPrice: 100, quantity: 50, currency: 'CHF' },
      l2: { status: 'failed',    limitPrice: 100, quantity: 50, currency: 'CHF' },
    },
  });
  const r = sumTransmittedToday({ portfolio: 'etf', rootDir: root });
  assert.equal(r.chfTransmittedToday, 10000);
});

test('FX lookup converts EUR/USD to CHF', () => {
  const root = makeRoot();
  writeRun(root, 'fx', {
    portfolio: 'etf',
    approvalId: 'fx',
    updatedAt: isoToday(),
    legs: {
      l1: { status: 'filled', avgFillPrice: 100, fillQuantity: 50, currency: 'EUR' },
    },
  });
  const r = sumTransmittedToday({ portfolio: 'etf', rootDir: root, fxLookup: (c) => c === 'EUR' ? 0.95 : 1 });
  assert.equal(r.chfTransmittedToday, 4750); // 100 * 50 * 0.95
});

test('excludeApprovalId skips the named basket', () => {
  const root = makeRoot();
  writeRun(root, 'a', {
    portfolio: 'etf',
    approvalId: 'a',
    updatedAt: isoToday(),
    legs: { l1: { status: 'filled', avgFillPrice: 100, fillQuantity: 50, currency: 'CHF' } },
  });
  writeRun(root, 'b', {
    portfolio: 'etf',
    approvalId: 'b',
    updatedAt: isoToday(),
    legs: { l1: { status: 'filled', avgFillPrice: 100, fillQuantity: 50, currency: 'CHF' } },
  });
  const r = sumTransmittedToday({ portfolio: 'etf', rootDir: root, excludeApprovalId: 'a' });
  assert.equal(r.chfTransmittedToday, 5000);
});

test('evaluateDailyTransmitCap: under cap → ok', () => {
  const root = makeRoot();
  writeRun(root, 'past', {
    portfolio: 'etf',
    approvalId: 'past',
    updatedAt: isoToday(),
    legs: { l1: { status: 'filled', avgFillPrice: 100, fillQuantity: 100, currency: 'CHF' } }, // 10k used
  });
  const r = evaluateDailyTransmitCap({
    portfolio: 'etf',
    rootDir: root,
    envelope: {
      approvalId: 'new',
      legs: [{ limitPrice: 100, quantity: 100, currency: 'CHF' }], // 10k requested
    },
    capChf: 50000,
  });
  assert.equal(r.ok, true);
  assert.equal(r.used, 10000);
  assert.equal(r.requested, 10000);
  assert.equal(r.remaining, 40000);
});

test('evaluateDailyTransmitCap: over cap → blocked', () => {
  const root = makeRoot();
  writeRun(root, 'past', {
    portfolio: 'etf',
    approvalId: 'past',
    updatedAt: isoToday(),
    legs: { l1: { status: 'filled', avgFillPrice: 100, fillQuantity: 400, currency: 'CHF' } }, // 40k used
  });
  const r = evaluateDailyTransmitCap({
    portfolio: 'etf',
    rootDir: root,
    envelope: {
      approvalId: 'new',
      legs: [{ limitPrice: 100, quantity: 200, currency: 'CHF' }], // 20k requested → 60k > 50k cap
    },
    capChf: 50000,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'daily_transmit_cap');
  assert.equal(r.used, 40000);
  assert.equal(r.requested, 20000);
});

test('evaluateDailyTransmitCap: re-running same approvalId does not double-count', () => {
  const root = makeRoot();
  // Earlier run of "same" basket — already on disk.
  writeRun(root, 'same', {
    portfolio: 'etf',
    approvalId: 'same',
    updatedAt: isoToday(),
    legs: { l1: { status: 'filled', avgFillPrice: 100, fillQuantity: 400, currency: 'CHF' } },
  });
  const r = evaluateDailyTransmitCap({
    portfolio: 'etf',
    rootDir: root,
    envelope: {
      approvalId: 'same',  // matches existing
      legs: [{ limitPrice: 100, quantity: 200, currency: 'CHF' }],
    },
    capChf: 50000,
  });
  assert.equal(r.ok, true);
  assert.equal(r.used, 0); // excluded
});

test('Default cap is CHF 50,000', () => {
  assert.equal(DEFAULT_DAILY_CAP_CHF, 50000);
});

test('No basket-runs dir → 0 (clean state)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-cap-empty-'));
  // Don't create the basket-runs subtree at all.
  const r = sumTransmittedToday({ portfolio: 'etf', rootDir: dir });
  assert.equal(r.chfTransmittedToday, 0);
});
