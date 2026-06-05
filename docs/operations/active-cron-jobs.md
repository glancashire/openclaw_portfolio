# Active cron jobs — snapshot 2026-06-05

Generated 2026-06-05T10:35:00Z. Gated by `scripts/test-cron-job-policy.js`.

## Policy summary

| Property | Value |
|---|---|
| agentsDefaultsSandboxMode | `off` |
| deliveryAnnounceWorks | `False` |
| deliveryEmailWorks | `True` |
| telegramChatIdConfigured | `False` |

## Enabled jobs

| # | Name | Schedule | Target | Kind | Tools | bestEffort |
|---|---|---|---|---|---|---|
| 1 | ibkr-native-gateway-keepalive | `0 8,13 * * *` @ UTC | current | agentTurn | exec, read | True |
| 2 | portfolio-health-monitor-etf | `0 8,14,20 * * *` @ UTC | current | agentTurn | exec, read | True |
| 3 | portfolio-etf-daily-sync-and-dashboard | `5 8,17 * * 1-5` @ UTC | current | agentTurn | exec, read | True |
| 4 | portfolio-etf-daily-digest | `0 21 * * 1-5` @ Europe/Zurich | session:agent:main:main | agentTurn | exec, read | True |
| 5 | daily-rebalance-check | `0 6 * * 1-5` @ UTC | current | agentTurn | exec, read | True |
| 6 | market-calendar-sync | `30 6 * * 1-5` @ UTC | current | agentTurn | exec, read | True |
| 7 | portfolio-etf-weekly-report | `20 17 * * 5` @ UTC | current | agentTurn | exec, read | True |
| 8 | dashboard-email-cash-influx | `0 9,11,13,15,17 * * 1-5` @ Europe/Zurich | session:agent:main:direct | agentTurn | exec, read | True |
| 9 | portfolio-etf-monthly-report | `35 17 1 * *` @ UTC | current | agentTurn | exec, read | True |
| 10 | portfolio-etf-quarterly-report | `50 17 1 1,4,7,10 *` @ UTC | current | agentTurn | exec, read | True |
| 11 | sentry-autofix-weekly | `0 9 * * 1` @ Europe/Zurich | session:agent:main:main | agentTurn | exec, read | True |
| 12 | dashboard-email-friday-close | `0 17 * * 5` @ Europe/Zurich | session:agent:main:direct | agentTurn | exec, read | True |
| 13 | dashboard-email-eod-transactions | `15 17 * * 1-5` @ Europe/Zurich | session:agent:main:direct | agentTurn | exec, read | True |
| 14 | test-suite-safe-lane | `30 9 * * 1-5` @ UTC | session:agent:main:main | agentTurn | exec, read | True |
| 15 | daily-workspace-env-backup | `17 0 * * *` @ UTC | session:agent:main:main | agentTurn | exec | n/a (delivery=none) |
| 16 | energy-etf-live-quote-probe | `2026-06-05T13:00:00Z` (one-shot) | isolated | agentTurn | exec, read | True |

## Disabled jobs (registered but not firing)

| # | Name | Schedule | Target | Kind | Policy | bestEffort |
|---|---|---|---|---|---|---|
| D1 | portfolio-etf-monitor-fills | `*/15 7-21 * * 1-5` @ UTC | session:agent:main:main | agentTurn | Only enable while a basket is approved AND orders are pending fills. Disable again on completion or at end of trading day, whichever comes first. (Graham 2026-06-04) | n/a (delivery=none) |

## Phase L1.C — toolsAllow tightening (2026-06-05)

Audit removed unnecessary `write` and `edit` from 4 reporting/sync jobs that
only run scripts via exec, and explicitly set `[exec, read]` on 3 jobs that
previously inherited an unset default. None of the cron jobs that fire in
production now have `write` or `edit` in their `toolsAllow` list.

The `daily-workspace-env-backup` job keeps `exec` only (it shells out to a
local backup script that handles its own writes via the shell).

Source-of-truth list of payloads: query the gateway with `cron list`.
