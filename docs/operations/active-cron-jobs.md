# Active cron jobs — snapshot 2026-05-25

Generated 2026-05-25 (post-Phase S3 audit). Source of truth at snapshot time is
`cron list`; this file is the human-readable mirror plus the policy gate.

If you change a job (add, remove, toggle, edit schedule, edit delivery), update
this snapshot AND `docs/operations/active-cron-jobs.json` so the
`test:cron-job-policy` regression keeps the two in sync.

## Enabled

| Job | Schedule | sessionTarget | Tools | Delivery | Notes |
|---|---|---|---|---|---|
| portfolio-etf-daily-sync-and-dashboard | `5 8,17 * * 1-5` UTC | current | exec/read/write/edit | announce, bestEffort | Daily holdings sync + dashboard refresh |
| portfolio-health-monitor-etf | `0 8,14,20 * * *` UTC | current | exec/read | announce, bestEffort | Health monitor; lightContext |
| daily-rebalance-check | `0 6 * * 1-5` UTC | current | (default) | announce, bestEffort | check-rebalance script |
| market-calendar-sync | `30 6 * * 1-5` UTC | current | exec/read | announce, bestEffort | IBKR contract hours sync |
| basket-approval-reminder-tuesday | `at 2026-05-26T07:45:00Z` | session:agent:main:main | exec/read/write/edit | announce, bestEffort | One-shot Tue re-propose basket + email |
| ibkr-native-gateway-keepalive | `0 8,13 * * *` UTC | current | exec/read | announce, bestEffort | Daytime gateway keepalive |
| rebalance-fill-check-monday | `at 2026-05-26T09:30:00Z` | current | exec/read/write/edit | announce, bestEffort | One-shot; checks rebalance fills |
| portfolio-etf-weekly-report | `20 17 * * 5` UTC | current | exec/read/write/edit | announce, bestEffort | Friday afternoon report cycle |
| portfolio-etf-monthly-report | `35 17 1 * *` UTC | current | exec/read/write/edit | announce, bestEffort | First-of-month report cycle |
| portfolio-etf-quarterly-report | `50 17 1 1,4,7,10 *` UTC | current | exec/read/write/edit | announce, bestEffort | Quarterly report cycle |

## Disabled (kept for audit)

| Job | Reason disabled |
|---|---|
| UBSPX retry reminder after IBIS open | Historical follow-up from 2026-05-21; superseded by basket lifecycle |
| UBSPX retry Telegram reminder after IBIS open | Same as above; was running as isolated and hit the Docker sandbox bug |
| submit-orders-at-market-open | Historical 2026-05-08; isolated session + Docker sandbox bug; replaced by current basket workflow |
| monitor-trade-fills | Replaced by basket-execution runner + fill check jobs |

## Health snapshot

- All 10 enabled jobs report `consecutiveErrors: 0`.
- All enabled jobs use `sessionTarget: "current"` (or sticky `session:agent:main:main`); none are `isolated`.
- All enabled jobs have `delivery.bestEffort: true` (Telegram announce fails-closed by design on this host; see `docs/operations/cron.md`).

## How to refresh this snapshot

1. Capture the current state with the `cron` tool action `list`.
2. Update both `docs/operations/active-cron-jobs.md` (this file) and
   `docs/operations/active-cron-jobs.json` (machine-readable mirror).
3. Run `node scripts/test-cron-job-policy.js` to confirm the policy still holds.
4. Commit both files plus any related job changes.
