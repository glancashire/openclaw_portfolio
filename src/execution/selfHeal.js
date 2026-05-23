const fs = require('fs');
const path = require('path');

function observabilityPaths(repoRoot = process.cwd()) {
  const dir = path.join(repoRoot, 'runtime', 'observability');
  return {
    dir,
    eventLogPath: path.join(dir, 'event-log.jsonl'),
  };
}

function appendObservabilityEvent(event, { repoRoot = process.cwd() } = {}) {
  const { dir, eventLogPath } = observabilityPaths(repoRoot);
  fs.mkdirSync(dir, { recursive: true });
  const payload = { at: new Date().toISOString(), ...event };
  fs.appendFileSync(eventLogPath, `${JSON.stringify(payload)}\n`);
  return { eventLogPath, event: payload };
}

function readObservabilityEvents({ repoRoot = process.cwd() } = {}) {
  const { eventLogPath } = observabilityPaths(repoRoot);
  if (!fs.existsSync(eventLogPath)) return [];
  return fs.readFileSync(eventLogPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function classifySymptoms({ brokerReadiness, deliveryStatus, cronHealth, errorState }) {
  const classified = [];
  const brokerMessage = String(brokerReadiness?.message || brokerReadiness?.guidance || '').trim();
  const deliveryMessages = Array.isArray(deliveryStatus?.pendingActions) ? deliveryStatus.pendingActions : [];
  const jobs = Array.isArray(cronHealth?.jobs) ? cronHealth.jobs : [];

  if (/sandbox mode requires docker|docker daemon is not available/i.test(brokerMessage)) {
    classified.push({
      category: 'sandbox_docker_required',
      severity: 'high',
      symptom: brokerMessage,
      recommendedAction: 'Set agents.defaults.sandbox.mode to off and restart the gateway.',
      healable: false,
    });
  }

  if (/ECONNREFUSED 127\.0\.0\.1:4001/i.test(brokerMessage)) {
    classified.push({
      category: 'ibkr_socket_dead',
      severity: 'high',
      symptom: brokerMessage,
      recommendedAction: 'Restart the native IBKR gateway during market hours or notify the operator.',
      healable: true,
      recipe: 'restart_ibkr_gateway_if_socket_dead',
    });
  }

  if (/2fa|second-factor|awaiting login|login \/ 2fa/i.test(brokerMessage)) {
    classified.push({
      category: 'ibkr_2fa_pending',
      severity: 'high',
      symptom: brokerMessage,
      recommendedAction: 'Notify the operator and wait for manual approval; do not auto-retry.',
      healable: false,
    });
  }

  if (/subscription|10089/i.test(brokerMessage)) {
    classified.push({
      category: 'market_data_subscription_gap',
      severity: 'medium',
      symptom: brokerMessage,
      recommendedAction: 'Verify the market-data subscription tier before retrying price-dependent actions.',
      healable: false,
    });
  }

  for (const pending of deliveryMessages) {
    if (/telegram requires target|no route/i.test(String(pending))) {
      classified.push({
        category: 'delivery_missing_target',
        severity: 'medium',
        symptom: String(pending),
        recommendedAction: 'Add a valid delivery target or switch the cron/report path to email delivery.',
        healable: false,
      });
    }
  }

  for (const job of jobs) {
    const consecutiveErrors = Number(job.consecutiveErrors || 0);
    if (consecutiveErrors >= 10) {
      classified.push({
        category: 'cron_excessive_errors',
        severity: 'high',
        symptom: `${job.name} has ${consecutiveErrors} consecutive errors`,
        recommendedAction: `Disable cron job ${job.id || job.name} after repeated failures.`,
        healable: true,
        recipe: 'disable_cron_after_N_consecutive_errors',
        jobId: job.id || null,
        jobName: job.name || null,
      });
    }
  }

  if (errorState?.stopAutomation) {
    classified.push({
      category: 'broker_automation_paused',
      severity: 'high',
      symptom: `Broker automation paused after ${errorState.consecutive} consecutive broker errors`,
      recommendedAction: 'Inspect broker error state before clearing the pause.',
      healable: false,
    });
  }

  return classified;
}

function recipeDisableCronAfterErrors(item) {
  return {
    ok: true,
    kind: 'disable_cron_after_N_consecutive_errors',
    applied: false,
    blocked: 'manual_or_future_gateway_integration_required',
    jobId: item.jobId || null,
    jobName: item.jobName || null,
    summary: item.recommendedAction,
  };
}

function recipeRestartIbkrGateway(item, { now = new Date() } = {}) {
  const hour = now.getUTCHours();
  const daytime = hour >= 8 && hour < 20;
  if (!daytime) {
    return {
      ok: true,
      kind: 'restart_ibkr_gateway_if_socket_dead',
      applied: false,
      blocked: 'outside_daytime_window',
      summary: 'Skipped IBKR restart because the check ran outside the daytime window.',
    };
  }
  return {
    ok: true,
    kind: 'restart_ibkr_gateway_if_socket_dead',
    applied: false,
    blocked: 'operator_present_restart_only',
    summary: item.recommendedAction,
  };
}

function applyHealRecipes(classified = [], { now = new Date() } = {}) {
  return classified
    .filter((item) => item.healable)
    .map((item) => {
      if (item.recipe === 'disable_cron_after_N_consecutive_errors') return recipeDisableCronAfterErrors(item);
      if (item.recipe === 'restart_ibkr_gateway_if_socket_dead') return recipeRestartIbkrGateway(item, { now });
      return {
        ok: true,
        kind: item.recipe || item.category,
        applied: false,
        blocked: 'no_recipe_implementation',
        summary: item.recommendedAction,
      };
    });
}

function buildOpenIssues({ classified = [], healed = [] }) {
  const resolvedKinds = new Set(healed.filter((item) => item.applied).map((item) => item.kind));
  return classified
    .filter((item) => !resolvedKinds.has(item.recipe || item.category))
    .map((item) => ({
      category: item.category,
      severity: item.severity,
      summary: item.recommendedAction,
      symptom: item.symptom,
    }));
}

module.exports = {
  observabilityPaths,
  appendObservabilityEvent,
  readObservabilityEvents,
  classifySymptoms,
  applyHealRecipes,
  buildOpenIssues,
};
