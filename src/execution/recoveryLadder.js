'use strict';

/**
 * Recovery ladders — informational, ranked recovery steps per symptom category.
 *
 * Each ladder maps a symptom category (as emitted by classifySymptoms or a
 * portfolio-health blocker code) to an ordered list of recovery steps. The
 * runtime never executes these steps; it only surfaces them so the operator
 * sees a concrete sequence to follow.
 *
 * Step shape:
 *   {
 *     rank,         // 1-based; ladders are pre-sorted ascending by rank
 *     action,       // short snake_case slug, stable identifier
 *     description,  // human-readable explanation of what this step does
 *     command,      // shell command string, or null for fully manual steps
 *     automated,    // boolean — currently always false (operator-driven)
 *     risk,         // 'low' | 'medium' | 'high'
 *   }
 *
 * Authoritative source for incident recovery: see
 *   - docs/operator-runbooks.md
 *   - docs/self-heal-recipes.md
 *   - memory/2026-05-26.md (duplicate-order incident postmortem)
 *   - TOOLS.md ("IBKR native gateway recovery" section)
 */

const LADDERS = {
  // 1. Broker down — socket dead or 2FA pending.
  ibkr_socket_dead: [
    {
      rank: 1,
      action: 'verify_gateway_running',
      description: 'Confirm whether the native IBKR gateway is up and the API socket is reachable on 127.0.0.1:4001.',
      command: 'node scripts/check-interactive-brokers-readiness.js',
      automated: false,
      risk: 'low',
    },
    {
      rank: 2,
      action: 'restart_native_gateway',
      description: 'Restart the native IB gateway via the known-good launcher (uses the pinned install4j JRE — see TOOLS.md).',
      command: '/home/ubuntu/ibgateway-native/start-ibc.sh',
      automated: false,
      risk: 'medium',
    },
    {
      rank: 3,
      action: 'complete_two_factor',
      description: 'Complete the IB Gateway login / second-factor approval on display :99 so the API port is exposed.',
      command: null,
      automated: false,
      risk: 'medium',
    },
    {
      rank: 4,
      action: 'verify_post_restart',
      description: 'Re-run readiness to confirm the API port is live and the gateway accepts orders again.',
      command: 'node scripts/check-interactive-brokers-readiness.js',
      automated: false,
      risk: 'low',
    },
  ],

  // 2. Quote unavailable — market-data subscription gap or wedged quotes.
  market_data_subscription_gap: [
    {
      rank: 1,
      action: 'verify_market_hours',
      description: 'Confirm whether the venue is actually open right now; missing quotes outside hours is expected.',
      command: 'node scripts/sync-market-calendar.js portfolio/etf --json',
      automated: false,
      risk: 'low',
    },
    {
      rank: 2,
      action: 'probe_market_data',
      description: 'Run the market-data subscription probe to see which symbols/streams the broker is actually serving.',
      command: 'node scripts/diagnostics/probe-market-data-subscriptions.js',
      automated: false,
      risk: 'low',
    },
    {
      rank: 3,
      action: 'check_six_l1_subscription',
      description: 'Check the SIX L1 subscription detail; the SIX feed gates Swiss-listed quotes.',
      command: 'node scripts/diagnostics/probe-six-subscription-detail.js',
      automated: false,
      risk: 'low',
    },
    {
      rank: 4,
      action: 'restart_gateway_if_wedged',
      description: 'If quotes remain wedged after subscriptions look healthy, restart the gateway (per the 2026-05-26 stale-quote postmortem).',
      command: '/home/ubuntu/ibgateway-native/start-ibc.sh',
      automated: false,
      risk: 'medium',
    },
  ],

  // 3. Stale approval — approved row aged past freshness window.
  stale_approval: [
    {
      rank: 1,
      action: 'list_stale_rows',
      description: 'List the stale approval rows and the exact safe next steps the runtime is willing to take.',
      command: 'node scripts/trade.js refresh-stale-approvals portfolio/etf --json',
      automated: false,
      risk: 'low',
    },
    {
      rank: 2,
      action: 'regenerate_proposal',
      description: 'Regenerate a fresh basket proposal so the latest row reflects current prices and allocations.',
      command: 'node scripts/propose-basket.js portfolio/etf',
      automated: false,
      risk: 'low',
    },
    {
      rank: 3,
      action: 'review_and_approve_fresh',
      description: 'Review the freshly proposed row and approve it explicitly (do not reuse the stale approval).',
      command: "node scripts/approve-portfolio-trade.js portfolio/etf '<json>'",
      automated: false,
      risk: 'medium',
    },
  ],

  // 4. Fill reconciliation — open-runner backlog or fill-notification backfill.
  open_runner_backlog: [
    {
      rank: 1,
      action: 'list_open_orders',
      description: 'List orders the broker still considers open; this is the source of truth for what is in flight.',
      command: 'node scripts/diagnostics/list-ibkr-open-orders.js',
      automated: false,
      risk: 'low',
    },
    {
      rank: 2,
      action: 'resync_fills',
      description: 'Resync portfolio order state against the broker so filled rows transition out of the open queue.',
      command: 'node scripts/resync-portfolio-orders.js portfolio/etf',
      automated: false,
      risk: 'low',
    },
    {
      rank: 3,
      action: 'close_notification_backlog',
      description: 'Acknowledge any reconciled fills that still need notification backfill review.',
      command: 'node scripts/acknowledge-fill-notification-backfill.js portfolio/etf',
      automated: false,
      risk: 'low',
    },
  ],
};

// Aliases — categories that share the same recovery ladder as another category.
const ALIASES = {
  ibkr_2fa_pending: 'ibkr_socket_dead',
  fill_notification_backfill: 'open_runner_backlog',
};

function getRecoveryLadder(category) {
  if (!category || typeof category !== 'string') return [];
  const resolved = ALIASES[category] || category;
  const ladder = LADDERS[resolved];
  if (!Array.isArray(ladder)) return [];
  // Defensive copy + ensure ascending rank order.
  return ladder
    .map((step) => ({ ...step }))
    .sort((a, b) => a.rank - b.rank);
}

function listSupportedCategories() {
  return Array.from(new Set([...Object.keys(LADDERS), ...Object.keys(ALIASES)])).sort();
}

module.exports = {
  LADDERS,
  ALIASES,
  getRecoveryLadder,
  listSupportedCategories,
};
