'use strict';

/**
 * Usage counters — operational KPI store for the portfolio system.
 *
 * Reads evidence from existing runtime artifacts and produces a counters
 * snapshot with rolling windows (7d, 30d, lifetime) plus timestamps.
 *
 * Schema: runtime/overview/usage-counters.json
 * Artifact: docs/plans/phase-3-usage-counters.md
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = '1.0';
const RUNTIME_DIR = path.resolve(__dirname, '../../runtime/overview');
const COUNTERS_PATH = path.join(RUNTIME_DIR, 'usage-counters.json');

/**
 * Scan report-history.json and count reports by period within the given window.
 */
function countReports(repoRoot, windowDays) {
  const histPath = path.join(repoRoot, 'runtime/overview/report-history.json');
  if (!fs.existsSync(histPath)) return { available: false, count: 0, byPeriod: {} };
  try {
    const data = JSON.parse(fs.readFileSync(histPath, 'utf8'));
    const cutoff = Date.now() - windowDays * 86400000;
    let count = 0;
    const byPeriod = {};
    for (const portfolio of (data.portfolios || [])) {
      for (const report of (portfolio.reports || [])) {
        // report.date is YYYYMMDD
        const dateStr = String(report.date || '');
        if (dateStr.length === 8) {
          const ts = new Date(`${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`).getTime();
          if (ts >= cutoff) {
            count++;
            const period = report.period || 'unknown';
            byPeriod[period] = (byPeriod[period] || 0) + 1;
          }
        }
      }
    }
    return { available: true, count, byPeriod };
  } catch { return { available: false, count: 0, byPeriod: {} }; }
}

/**
 * Scan delivery-status.json for portfolio delivery readiness.
 */
function assessDeliveryHealth(repoRoot) {
  const dsPath = path.join(repoRoot, 'runtime/overview/delivery-status.json');
  if (!fs.existsSync(dsPath)) return { available: false, readyCount: 0, notReadyCount: 0, brokerDegraded: false };
  try {
    const data = JSON.parse(fs.readFileSync(dsPath, 'utf8'));
    let readyCount = 0;
    let notReadyCount = 0;
    let brokerDegraded = false;
    for (const p of (data.portfolios || [])) {
      if (p.ready) readyCount++;
      else notReadyCount++;
      if (p.deliveryPosture && p.deliveryPosture.brokerAutomationPaused) brokerDegraded = true;
      if (p.deliveryPosture && p.deliveryPosture.brokerBlockContext && p.deliveryPosture.brokerBlockContext.blockedTradeCount > 0) {
        brokerDegraded = true;
      }
    }
    return { available: true, readyCount, notReadyCount, brokerDegraded, generatedAt: data.generatedAt };
  } catch { return { available: false, readyCount: 0, notReadyCount: 0, brokerDegraded: false }; }
}

/**
 * Scan approvals-queue.json for approval items + latency if resolvable.
 */
function assessApprovalLatency(repoRoot) {
  const aqPath = path.join(repoRoot, 'runtime/overview/approvals-queue.json');
  if (!fs.existsSync(aqPath)) return { available: false, pendingCount: 0, latencies: [] };
  try {
    const data = JSON.parse(fs.readFileSync(aqPath, 'utf8'));
    const items = data.items || [];
    const pendingCount = items.length;
    const latencies = [];
    for (const item of items) {
      if (item.createdAt && item.approvedAt) {
        const created = new Date(item.createdAt).getTime();
        const approved = new Date(item.approvedAt).getTime();
        if (Number.isFinite(created) && Number.isFinite(approved) && approved > created) {
          latencies.push(approved - created);
        }
      }
    }
    return { available: true, pendingCount, latencies };
  } catch { return { available: false, pendingCount: 0, latencies: [] }; }
}

/**
 * Determine reconciliation lag from ibkr-accounting latest.json mtime.
 */
function assessReconciliationLag(repoRoot, portfolioName = 'etf') {
  const latestPath = path.join(repoRoot, `runtime/ibkr-accounting/${portfolioName}/latest.json`);
  if (!fs.existsSync(latestPath)) return { available: false, lagDays: null };
  try {
    const stat = fs.statSync(latestPath);
    const lagMs = Date.now() - stat.mtimeMs;
    return { available: true, lagDays: Math.round(lagMs / 86400000 * 10) / 10, lastReconcileAt: stat.mtime.toISOString() };
  } catch { return { available: false, lagDays: null }; }
}

/**
 * Compute percentile from sorted array.
 */
function percentile(sortedArr, p) {
  if (!sortedArr.length) return null;
  const i = Math.ceil(p / 100 * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(i, sortedArr.length - 1))];
}

/**
 * Build a full counters snapshot from current evidence on disk.
 */
function buildSnapshot(repoRoot) {
  const now = new Date().toISOString();
  const reports7 = countReports(repoRoot, 7);
  const reports30 = countReports(repoRoot, 30);
  const delivery = assessDeliveryHealth(repoRoot);
  const approvals = assessApprovalLatency(repoRoot);
  const reconciliation = assessReconciliationLag(repoRoot, 'etf');

  const latenciesSorted = [...approvals.latencies].sort((a, b) => a - b);
  const medianLatencyMs = percentile(latenciesSorted, 50);
  const p90LatencyMs = percentile(latenciesSorted, 90);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: now,
    counters: {
      reportSends: {
        last7d: reports7.available ? reports7.count : 'unavailable',
        last30d: reports30.available ? reports30.count : 'unavailable',
        byPeriod7d: reports7.available ? reports7.byPeriod : 'unavailable',
        byPeriod30d: reports30.available ? reports30.byPeriod : 'unavailable',
      },
      deliveryHealth: {
        available: delivery.available,
        readyPortfolios: delivery.readyCount,
        notReadyPortfolios: delivery.notReadyCount,
        brokerDegraded: delivery.brokerDegraded,
        lastCheckedAt: delivery.generatedAt || null,
      },
      approvalLatency: {
        available: approvals.available,
        pendingCount: approvals.pendingCount,
        resolvedCount: approvals.latencies.length,
        medianMs: medianLatencyMs,
        p90Ms: p90LatencyMs,
      },
      reconciliationLag: {
        available: reconciliation.available,
        lagDays: reconciliation.lagDays,
        lastReconcileAt: reconciliation.lastReconcileAt || null,
      },
    },
  };
}

/**
 * Summarize a snapshot into labels suitable for metricGrid rendering.
 */
function summarizeForDashboard(snapshot) {
  if (!snapshot || !snapshot.counters) return [];
  const c = snapshot.counters;
  const items = [];

  // Reports
  if (c.reportSends) {
    const v7 = c.reportSends.last7d;
    items.push({
      label: 'Reports sent (7d)',
      value: v7 === 'unavailable' ? '—' : String(v7),
      detail: v7 === 'unavailable' ? 'Counter unavailable' : undefined,
    });
  }

  // Delivery health
  if (c.deliveryHealth && c.deliveryHealth.available) {
    const ready = c.deliveryHealth.readyPortfolios;
    const notReady = c.deliveryHealth.notReadyPortfolios;
    items.push({
      label: 'Delivery readiness',
      value: notReady === 0 ? `${ready} ready` : `${notReady} not ready`,
      detail: c.deliveryHealth.brokerDegraded ? 'Broker degraded' : undefined,
    });
  }

  // Approval latency
  if (c.approvalLatency && c.approvalLatency.available) {
    const med = c.approvalLatency.medianMs;
    items.push({
      label: 'Approval latency (median)',
      value: med != null ? `${Math.round(med / 60000)} min` : 'No data',
      detail: c.approvalLatency.pendingCount > 0
        ? `${c.approvalLatency.pendingCount} pending`
        : undefined,
    });
  }

  // Reconciliation lag
  if (c.reconciliationLag && c.reconciliationLag.available) {
    items.push({
      label: 'Last reconciliation',
      value: `${c.reconciliationLag.lagDays}d ago`,
      detail: c.reconciliationLag.lastReconcileAt
        ? c.reconciliationLag.lastReconcileAt.slice(0, 10)
        : undefined,
    });
  }

  return items;
}

/**
 * Read a previously-saved snapshot from disk.
 */
function readSnapshot(countersPath = COUNTERS_PATH) {
  if (!fs.existsSync(countersPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(countersPath, 'utf8'));
  } catch { return null; }
}

/**
 * Write a snapshot to disk atomically.
 */
function writeSnapshot(snapshot, countersPath = COUNTERS_PATH) {
  const dir = path.dirname(countersPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(countersPath, JSON.stringify(snapshot, null, 2));
}

module.exports = {
  SCHEMA_VERSION,
  COUNTERS_PATH,
  buildSnapshot,
  summarizeForDashboard,
  readSnapshot,
  writeSnapshot,
  // Internals exported for testing:
  countReports,
  assessDeliveryHealth,
  assessApprovalLatency,
  assessReconciliationLag,
  percentile,
};
