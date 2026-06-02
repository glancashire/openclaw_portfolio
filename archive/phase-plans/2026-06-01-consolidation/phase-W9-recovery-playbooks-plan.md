# Phase W9 — Recovery playbooks as executable guidance

- **Wave:** W9 of `archive/tasks/wave-plan-2026-05-27-closeout.md`
- **Owner:** bb8 (subagent)
- **Status:** in-flight
- **Started:** 2026-05-27

## Goal

Convert post-MVP postmortem learnings into runtime-emitted next-action
suggestions so the operator gets a concrete recovery ladder when the system
classifies a known symptom. Ladders cover four cases:

1. Broker down (`ibkr_socket_dead`, `ibkr_2fa_pending`)
2. Quote unavailable (`market_data_subscription_gap`)
3. Stale approval (`stale_approval`)
4. Fill reconciliation (`open_runner_backlog`, `fill_notification_backfill`)

Recovery ladders are **informational**: they suggest commands, they never
execute them. They live alongside the existing self-heal classification, not
inside it.

## Constraints

- Don't change health-classification logic.
- Backward compatible with existing `classifySymptoms` /
  `buildSelfHealPlan` consumers (new fields are additive).
- Suggested commands must reference real repo scripts (or operator-known
  paths in `TOOLS.md` for the IBKR launcher and 2FA step).
- Operator-facing terminal output must stay clean and scannable.

## Surface map

| Surface | Change |
|---|---|
| `src/execution/recoveryLadder.js` | New module exposing `getRecoveryLadder(category)` and the static `LADDERS` map. |
| `src/execution/selfHeal.js` — `classifySymptoms` | Each classified item gains `recoveryLadder: [...]`. |
| `src/execution/portfolioHealth.js` — `buildSelfHealPlan` | Plan output gains `recoveryLadders` (array of `{ category, ladder }` for unique categories from `openIssues` + blockers). |
| `scripts/trade-health.js` | Renders a "Recovery guidance" section after open issues. |
| `src/reporting/healthReport.js` — `buildHealthReportMarkdown` | When `openIssues.length > 0`, append a "Recovery guidance" section. |
| `scripts/test-recovery-ladder.js` | New tests. |
| `src/reporting/verifyRepoChecks.js` | Register the new test. |

## Ladder data shape

```js
{
  category: 'ibkr_socket_dead',
  ladder: [
    {
      rank: 1,
      action: 'verify_gateway_running',
      description: 'Confirm whether the native IBKR gateway process is up and reachable on 127.0.0.1:4001.',
      command: 'node scripts/check-interactive-brokers-readiness.js',
      automated: false,
      risk: 'low',
    },
    ...
  ]
}
```

- `command` may be `null` for fully manual steps (operator at console / 2FA).
- `automated` is informational only — current ladders are operator-driven; we
  reserve the field so a future automation layer can opt in per-step.

## Category → ladder mapping

### 1. Broker down — `ibkr_socket_dead`, `ibkr_2fa_pending`
1. Check readiness — `node scripts/check-interactive-brokers-readiness.js`
2. Restart native gateway — `/home/ubuntu/ibgateway-native/start-ibc.sh` (operator)
3. Complete 2FA on display `:99` (operator, no command)
4. Re-run readiness — `node scripts/check-interactive-brokers-readiness.js`

### 2. Quote unavailable — `market_data_subscription_gap`
1. Verify market hours — `node scripts/sync-market-calendar.js portfolio/etf --json`
2. Probe market-data subscriptions — `node scripts/diagnostics/probe-market-data-subscriptions.js`
3. Check SIX L1 subscription — `node scripts/diagnostics/probe-six-subscription-detail.js`
4. Restart gateway if quotes still wedged — `/home/ubuntu/ibgateway-native/start-ibc.sh`
   (per `memory/2026-05-26.md` postmortem)

### 3. Stale approval — `stale_approval`
1. List stale rows — `node scripts/trade.js refresh-stale-approvals portfolio/etf --json`
2. Regenerate proposal — `node scripts/propose-basket.js portfolio/etf`
3. Review fresh row & approve — `node scripts/approve-portfolio-trade.js portfolio/etf '<json>'`

### 4. Fill reconciliation — `open_runner_backlog`, `fill_notification_backfill`
1. List broker-open orders — `node scripts/diagnostics/list-ibkr-open-orders.js`
2. Resync fills — `node scripts/resync-portfolio-orders.js portfolio/etf`
3. Close notification backlog — `node scripts/acknowledge-fill-notification-backfill.js portfolio/etf`

## Tests (`scripts/test-recovery-ladder.js`)

- All four categories return a non-empty ladder.
- Every step has `rank`, `action`, `description`, and a `command` (or `command: null`).
- Ranks are unique and sorted ascending.
- Unknown category → empty array (graceful).
- Repo-relative scripts referenced by ladders exist on disk (skip absolute
  paths like `/home/ubuntu/ibgateway-native/start-ibc.sh` — those live
  outside the repo and are operator-managed per `TOOLS.md`).
- `classifySymptoms` output carries a `recoveryLadder` field for known categories.
- `buildSelfHealPlan` plan exposes `recoveryLadders` and renders correctly when fed
  a stale-approval scenario.
- Wired into `verifyRepoChecks`.

## Final steps

- `npm test` green.
- Commit + push (single commit: plan first, then implementation+tests).
- Print progress summary back to main.
