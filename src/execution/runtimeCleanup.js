'use strict';

const fs = require('fs');
const path = require('path');

function isoNow(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(dir, name));
}

function parseTimestamp(...values) {
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

function ageDays(timestampMs, nowMs) {
  if (!Number.isFinite(timestampMs)) return null;
  return (nowMs - timestampMs) / (24 * 60 * 60 * 1000);
}

function approvalEnvelopeTerminal(envelope = {}) {
  const topStatus = String(envelope.status || '').trim().toLowerCase();
  if (['filled', 'executed', 'completed', 'cancelled', 'rejected', 'expired', 'superseded'].includes(topStatus)) return true;
  const legs = Array.isArray(envelope.legs) ? envelope.legs : [];
  if (legs.length === 0) return false;
  return legs.every((leg) => {
    const status = String(leg.status || '').trim().toLowerCase();
    return ['filled', 'executed', 'completed', 'cancelled', 'rejected', 'expired', 'superseded'].includes(status);
  });
}

function circuitBreakerCleared(marker = {}) {
  if (marker == null || typeof marker !== 'object') return false;
  if (marker.clearedAt) return true;
  const activeCount = Number(marker.count || 0);
  return activeCount <= 0 && Boolean(marker.lastSeenAt || marker.firstTrippedAt);
}

function removeFile(filePath, dryRun) {
  if (!dryRun && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function sweepSupersededBasketProposals({ rootDir = process.cwd(), portfolio = 'etf', now = new Date(), keepDays = 7, dryRun = false } = {}) {
  const dir = path.join(rootDir, 'runtime', 'basket-proposals', portfolio, '.superseded');
  const nowMs = new Date(now).getTime();
  const removed = [];
  const kept = [];

  for (const filePath of listJsonFiles(dir)) {
    const payload = safeReadJson(filePath);
    const ts = parseTimestamp(payload?.generatedAt, payload?.createdAt);
    const days = ageDays(ts, nowMs);
    const item = { filePath, proposalId: payload?.proposalId || payload?.approvalId || path.basename(filePath, '.json'), ageDays: days };
    if (days != null && days > keepDays) {
      removeFile(filePath, dryRun);
      removed.push(item);
    } else {
      kept.push(item);
    }
  }

  return { category: 'superseded_basket_proposals', dir, keepDays, dryRun, removed, kept, scanned: removed.length + kept.length, now: isoNow(now) };
}

function sweepSupersededApprovedBaskets({ rootDir = process.cwd(), portfolio = 'etf', now = new Date(), keepDays = 30, dryRun = false } = {}) {
  const dir = path.join(rootDir, 'runtime', 'approved-order-baskets', portfolio, '.superseded');
  const nowMs = new Date(now).getTime();
  const removed = [];
  const kept = [];

  for (const filePath of listJsonFiles(dir)) {
    const payload = safeReadJson(filePath);
    const ts = parseTimestamp(payload?.approvedAt, payload?.createdAt, payload?.expiresAt);
    const days = ageDays(ts, nowMs);
    const terminal = approvalEnvelopeTerminal(payload || {});
    const item = {
      filePath,
      approvalId: payload?.approvalId || payload?.proposalId || path.basename(filePath, '.json'),
      ageDays: days,
      terminal,
      status: payload?.status || null,
    };
    if (terminal && days != null && days > keepDays) {
      removeFile(filePath, dryRun);
      removed.push(item);
    } else {
      kept.push(item);
    }
  }

  return { category: 'superseded_approved_baskets', dir, keepDays, dryRun, removed, kept, scanned: removed.length + kept.length, now: isoNow(now) };
}

function sweepClearedCircuitBreakers({ rootDir = process.cwd(), portfolio = 'etf', now = new Date(), keepDays = 7, dryRun = false } = {}) {
  const dir = path.join(rootDir, 'runtime', 'circuit-breakers', portfolio);
  const nowMs = new Date(now).getTime();
  const removed = [];
  const kept = [];

  for (const filePath of listJsonFiles(dir)) {
    const payload = safeReadJson(filePath);
    const cleared = circuitBreakerCleared(payload || {});
    const ts = parseTimestamp(payload?.clearedAt, payload?.lastSeenAt, payload?.firstTrippedAt);
    const days = ageDays(ts, nowMs);
    const item = {
      filePath,
      instrument: payload?.instrument || path.basename(filePath, '.json'),
      ageDays: days,
      cleared,
      count: Number(payload?.count || 0),
    };
    if (cleared && days != null && days > keepDays) {
      removeFile(filePath, dryRun);
      removed.push(item);
    } else {
      kept.push(item);
    }
  }

  return { category: 'cleared_circuit_breakers', dir, keepDays, dryRun, removed, kept, scanned: removed.length + kept.length, now: isoNow(now) };
}

function sweepRuntimeArtifacts({ rootDir = process.cwd(), portfolio = 'etf', now = new Date(), dryRun = false, proposalKeepDays = 7, approvedKeepDays = 30, circuitBreakerKeepDays = 7 } = {}) {
  const results = [
    sweepSupersededBasketProposals({ rootDir, portfolio, now, keepDays: proposalKeepDays, dryRun }),
    sweepSupersededApprovedBaskets({ rootDir, portfolio, now, keepDays: approvedKeepDays, dryRun }),
    sweepClearedCircuitBreakers({ rootDir, portfolio, now, keepDays: circuitBreakerKeepDays, dryRun }),
  ];
  const totals = results.reduce((acc, result) => {
    acc.scanned += result.scanned;
    acc.removed += result.removed.length;
    acc.kept += result.kept.length;
    return acc;
  }, { scanned: 0, removed: 0, kept: 0 });
  return {
    ok: true,
    portfolio,
    dryRun,
    now: isoNow(now),
    totals,
    results,
  };
}

module.exports = {
  approvalEnvelopeTerminal,
  circuitBreakerCleared,
  sweepSupersededBasketProposals,
  sweepSupersededApprovedBaskets,
  sweepClearedCircuitBreakers,
  sweepRuntimeArtifacts,
};
