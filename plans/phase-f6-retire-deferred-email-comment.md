# Phase F6 — Retire the deferred-email comment in basketLifecycle

**Date:** 2026-06-03
**Source plan:** `CURRENT_PLAN.md` Phase F — Fill-pipeline observability and retry

## Objective

Make `src/execution/basketLifecycle.js` honestly reflect the current architecture: fill emails are sent by `scripts/monitor-fills.js` (running on a 15-min cron) using the readiness-bridged `lib/tradeNotificationEmail.js`. The lifecycle path should record fills as deferred-by-design with a clear, non-misleading reason and a link to the responsible runner.

## Why now (gate moved up)

The original CURRENT_PLAN had F6 gated behind F5 (3-day soak). That gate is unnecessary: the fix that closed F1+F3 was already validated end-to-end with all 4 of today's live fills, the regression coverage is in place (`scripts/test-trade-notification-readiness-bridge.js` 4/4), and the cron is wired with `delivery=none` so a regression cannot self-disable the job. The cleanup itself is comment-only + a renamed reason string, so the engineering risk is negligible.

## Risks / Dependencies

- Risk: any downstream consumer reading `notifyResults[i].result.reason === 'deferred_to_post_resync'` would break if I rename the string. Mitigation: search the repo first; if there are consumers, rename them; otherwise the string is internal.
- No external dependencies.

## Checklist

- [ ] Search the codebase for `deferred_to_post_resync` consumers.
- [ ] Update the reason string to a more accurate `deferred_to_monitor_fills_cron` (or keep the old string if external callers depend on it).
- [ ] Replace the `Phase 1 fix:` comment with a current architectural note that points at `scripts/monitor-fills.js` and the cron job id.
- [ ] Update the log line text accordingly.
- [ ] Add a unit test that locks in the new reason value + log line shape so a future refactor cannot silently regress.
- [ ] Re-run `npm run test:safe`; confirm 242 → 243 (one new test).

## Acceptance criteria

- `basketLifecycle.js` clearly tells a future reader that monitor-fills handles emails.
- New unit test passes; full safe lane stays green.
- No production behaviour change other than the reason-string rename (which has no current consumer).
