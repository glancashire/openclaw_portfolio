# Phase Cleanup-1F — Cron delivery hardening (state of play)

**Date:** 2026-06-01 22:35 UTC
**Tranche:** 2

## Findings (current truth)

Surveyed all 11 active cron jobs via `openclaw cron list --json`:

| Job | Status | Last run | Consecutive errors | bestEffort |
| --- | --- | --- | ---: | --- |
| daily-workspace-env-backup | ok | ok | 0 | ✓ |
| daily-rebalance-check | ok | ok | 0 | ✓ |
| market-calendar-sync | ok | ok | 0 | ✓ |
| ibkr-native-gateway-keepalive | ok | ok | 0 | ✓ |
| portfolio-health-monitor-etf | ok | ok | 0 | ✓ |
| portfolio-etf-daily-sync-and-dashboard | ok | ok | 0 | ✓ |
| test-suite-safe-lane | ok | ok | 0 | ✓ |
| portfolio-etf-daily-digest | ok | ok | 0 | ✓ |
| portfolio-etf-weekly-report | ok | ok | 0 | ✓ |
| portfolio-etf-monthly-report | ok | ok | 0 | ✓ |
| portfolio-etf-quarterly-report | idle | — | 0 | ✓ |

**Substantive work is healthy.** Earlier consolidation note ("`portfolio-health-monitor` in error") was stale; current state is `ok`.

## Remaining concern

`announce -> last` delivery preview still says `no route, will fail-closed: Delivering to Telegram requires target <chatId>` for 10 of 11 jobs.

This means cron output is **not pushed** to a chat surface — operators see results only via dashboard, generated reports, and `cron runs` history.

## Auto-decision

Configuring a Telegram chatId is operator-personal and out-of-scope for autonomous work. Document the file-only delivery posture as the current intentional design and surface the upgrade path in `docs/operations/cron.md` for the operator's later choice.

## Objectives

1. Confirm every active cron job carries `bestEffort: true` (already the case; verified).
2. Confirm zero jobs are in `error` state (already the case; verified).
3. Document the current "file-only delivery" posture and the upgrade path in `docs/operations/cron.md`.
4. Add a small runbook regression test that asserts every active cron job declares `bestEffort: true`.

## Risks / dependencies

- The runbook test must be tolerant of jobs `delivery: { mode: 'none' | 'webhook' }`; only assert `bestEffort: true` when `delivery.mode === 'announce'`.
- Reading cron list requires the daemon to be live; gracefully skip/skip-with-note if not.

## Actionable checklist

- [ ] Append a "Delivery posture" section to `docs/operations/cron.md` describing file-only as the current intentional state and the steps to enable announce delivery later.
- [ ] Add `scripts/test-cron-delivery-posture.js`:
  - Runs `openclaw cron list --json`; iterates jobs.
  - For every announce-mode job, asserts `delivery.bestEffort === true`.
  - Fails if any job is in `error` state.
- [ ] Run the regression test.
- [ ] Tick off 1F in CURRENT_PLAN with a note about the file-only decision.

## Acceptance criteria

- Runbook entry merged.
- New regression test passes against the live cron config.
- CURRENT_PLAN reflects the closed state.
