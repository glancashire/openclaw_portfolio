'use strict';

/**
 * Summarize cron job health for dashboard rendering.
 * Each job in -> { name, severity, badge, lastRunAge, consecutiveErrors, lastError }
 *
 * Severity:
 *   ok       -> consecutiveErrors === 0 (or undefined)
 *   warning  -> consecutiveErrors >= 1 && < 3
 *   alert    -> consecutiveErrors >= 3 && < 10
 *   critical -> consecutiveErrors >= 10
 *   stale    -> lastRunAt > 48h
 */

function severityFor({ consecutiveErrors = 0, lastRunAtMs }) {
  const now = Date.now();
  const ageHours = lastRunAtMs ? (now - lastRunAtMs) / (3600 * 1000) : null;
  if (ageHours !== null && ageHours > 48 && consecutiveErrors === 0) return 'stale';
  if (consecutiveErrors >= 10) return 'critical';
  if (consecutiveErrors >= 3) return 'alert';
  if (consecutiveErrors >= 1) return 'warning';
  return 'ok';
}

function summarizeCronJobs(jobs = [], { now = Date.now(), sourceStatus = 'ok', sourceMessage = null } = {}) {
  const summary = jobs
    .filter((job) => job.enabled !== false)
    .map((job) => {
      const state = job.state || {};
      const lastRunAtMs = state.lastRunAtMs || null;
      const ageHours = lastRunAtMs ? (now - lastRunAtMs) / (3600 * 1000) : null;
      const severity = severityFor({ consecutiveErrors: state.consecutiveErrors || 0, lastRunAtMs });
      return {
        id: job.id,
        name: job.name,
        scheduleExpr: job.schedule?.expr || job.schedule?.at || 'unknown',
        sessionTarget: job.sessionTarget || 'isolated',
        deliveryMode: job.delivery?.mode || 'none',
        consecutiveErrors: state.consecutiveErrors || 0,
        lastRunAtMs,
        lastRunAgeHours: ageHours,
        lastStatus: state.lastStatus || state.lastRunStatus || 'pending',
        lastError: state.lastError || null,
        severity,
      };
    })
    .sort((a, b) => {
      const order = { critical: 0, alert: 1, warning: 2, stale: 3, ok: 4 };
      return (order[a.severity] - order[b.severity]) || a.name.localeCompare(b.name);
    });

  const counts = summary.reduce((acc, s) => {
    acc[s.severity] = (acc[s.severity] || 0) + 1;
    return acc;
  }, {});

  const base = {
    jobs: summary,
    counts,
    total: summary.length,
    healthy: counts.ok || 0,
    failing: (counts.warning || 0) + (counts.alert || 0) + (counts.critical || 0),
  };

  if (sourceStatus !== 'ok') {
    return {
      ...base,
      status: 'unavailable',
      message: sourceMessage || 'Cron inspection unavailable.',
    };
  }

  if (base.total === 0) {
    return {
      ...base,
      status: 'empty',
      message: sourceMessage || 'No enabled cron jobs found.',
    };
  }

  return {
    ...base,
    status: 'ok',
    message: sourceMessage || null,
  };
}

module.exports = { summarizeCronJobs, severityFor };
