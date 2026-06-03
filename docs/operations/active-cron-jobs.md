# Active cron jobs — snapshot 2026-06-03

Generated 2026-06-03T15:50:00Z. Gated by `scripts/test-cron-job-policy.js`.

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
| 3 | portfolio-etf-daily-sync-and-dashboard | `5 8,17 * * 1-5` @ UTC | current | agentTurn | exec, read, write, edit | True |
| 4 | portfolio-etf-daily-digest | `0 21 * * 1-5` @ Europe/Zurich | session:agent:main:main | agentTurn | exec, read | True |
| 5 | daily-rebalance-check | `0 6 * * 1-5` @ UTC | current | agentTurn | - | True |
| 6 | market-calendar-sync | `30 6 * * 1-5` @ UTC | current | agentTurn | exec, read | True |
| 7 | portfolio-etf-weekly-report | `20 17 * * 5` @ UTC | current | agentTurn | exec, read, write, edit | True |
| 8 | soak-self-check-2026-05-30 | `2026-05-30T09:00:00.000Z` @ - | session:agent:main:main | agentTurn | exec, read, write | True |
| 9 | portfolio-etf-monthly-report | `35 17 1 * *` @ UTC | current | agentTurn | exec, read, write, edit | True |
| 10 | portfolio-etf-quarterly-report | `50 17 1 1,4,7,10 *` @ UTC | current | agentTurn | exec, read, write, edit | True |
| 11 | portfolio-etf-monitor-fills | `*/15 7-21 * * 1-5` @ UTC | current | agentTurn | exec, read | n/a (delivery=none) |


