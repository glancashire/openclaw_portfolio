# Phase 2 — Wire Sentry instrumentation into unattended entry points

**Created:** 2026-06-04
**Parent plan:** `plans/sentry-integration-plan.md`
**Status:** READY to implement

## Objectives
1. Create `lib/observability/bootstrap.js` — single-line auto-init shim.
   Calling `require('../lib/observability/bootstrap')` initializes Sentry
   from env and attaches global handlers for uncaughtException and
   unhandledRejection. Cheap, idempotent, no-ops when DSN unset.
2. Add the require line to these high-value unattended entry points:
   - `scripts/run-report-cycle.js` (weekly/monthly/quarterly reports)
   - `scripts/health-monitor-cron.js` (cron-launched health monitor)
   - `scripts/monitor-fills.js` (fill-watcher loop)
   - `scripts/send-dashboard-digest.js` (digest emails)
   - `scripts/ibkr-native-keepalive.js` (IBKR connection keepalive)
3. Write `scripts/test-sentry-bootstrap.js` covering:
   - bootstrap is a no-op when DSN unset
   - bootstrap initializes Sentry when DSN set (mock injection via env)
   - global error handlers route through captureError
   - re-requiring bootstrap does not double-register handlers
4. Verify zero regressions via `npm test` and `npm run test:safe`.

## Risks / Dependencies
- Global handlers must not change exit semantics. Default Node behavior:
  uncaughtException → exit(1). We will capture-then-rethrow via process.exit
  with a small flush window, matching @sentry/node's recommended pattern.
- `bootstrap.js` must be importable BEFORE any script work so first errors
  in the script are captured. Place the require line as the very first
  statement after 'use strict' (or first line if no directive).
- Some scripts already top-load other libraries; placing require at the
  top guarantees init before those libraries throw.
- Pre-commit verification hooks must remain green.

## Checklist
- [ ] Create `lib/observability/bootstrap.js`.
- [ ] Add require line to the 5 entry-point scripts above.
- [ ] Create `scripts/test-sentry-bootstrap.js`.
- [ ] Regenerate test manifest via `scripts/discover-test-suites.js`.
- [ ] Run new test in isolation — passes.
- [ ] Run `npm test` — passes.
- [ ] Run `npm run test:safe` — passes (no regressions).
- [ ] Commit + push.

## Acceptance Criteria
- `require('./lib/observability/bootstrap')` is safe to call with no env set
  (returns without errors; isInitialized() === false).
- With SENTRY_DSN set, bootstrap calls `initSentry()` exactly once even if
  required from multiple scripts.
- `process.on('uncaughtException', ...)` and `process.on('unhandledRejection', ...)`
  are each registered exactly once across multiple requires.
- The 5 modified scripts still pass their existing tests where applicable.
- All discovered safe-lane tests still pass.
