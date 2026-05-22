# Phase 204 — Hot-fix: cron sandbox + delivery

## Objective
Stop the silent failure: 6 active cron jobs are failing 100% with `"Sandbox mode requires Docker, but the Docker daemon is not available"` and Graham gets zero notification because `delivery.mode: 'none'`.

## Findings (from cron list at 16:05 UTC)
| Job | Errors | Status | Issue |
|---|---|---|---|
| portfolio-etf-daily-sync-and-dashboard | 25 | failing | sandbox=docker, delivery=none |
| portfolio-etf-weekly-report | 2 | failing | sandbox=docker, delivery=none |
| portfolio-health-monitor-etf | 23 | failing | sandbox=docker, delivery=none |
| ibkr-native-gateway-keepalive | 1 | failing | "agent couldn't generate response" |
| daily-rebalance-check | 11 | failing | sandbox=docker, delivery=announce-broken |
| portfolio-etf-monthly-report | (next run not yet) | latent | sandbox=docker, delivery=none |
| portfolio-etf-quarterly-report | (next run not yet) | latent | sandbox=docker, delivery=none |
| UBSPX retry reminder + 2 stale jobs | dead | disabled | safe to leave |

## Root causes
1. **Sandbox=Docker**: cron jobs were created with `sessionTarget: 'isolated'` which requires Docker. No Docker on this host.
2. **delivery.mode: 'none'**: failures silent.
3. **delivery.mode: 'announce' with no `chatId`**: Telegram routing broken for `daily-rebalance-check`.

## Risks / dependencies
- Switching from `isolated` to `current` session means cron runs inside our main agent session. Less isolation, but matches what `portfolio-health-monitor-etf` already does (sessionTarget=current) and matches `verify-six-l1-subscription-monday` (sessionTarget=main).
- Webchat channel is the operator-facing surface; switching `delivery.mode` to `announce` will route through current default channel.

## Actionable checklist
- [ ] For each failing cron job: patch `sessionTarget` from `isolated` → `current` (or `session:agent:main:main`).
- [ ] For each silent cron job: set `delivery.mode: 'announce'` so failures surface.
- [ ] Strip broken Telegram-only delivery (`daily-rebalance-check`).
- [ ] Optionally: bump `consecutiveErrors` threshold so a healing job can disable a continuously-failing cron later (Phase 208).
- [ ] Verify by dry-running one job (`cron run --runMode=force`).
- [ ] Update `TOOLS.md` documenting the sandbox-off invariant.

## Acceptance criteria
- All 6 active cron jobs have `sessionTarget: 'current'` (or equivalent non-Docker session).
- All 6 have `delivery.mode: 'announce'`.
- A test dry-run of `portfolio-health-monitor-etf` exits non-error.
- TOOLS.md updated.
