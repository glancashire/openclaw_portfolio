# Phase 166d: Market-Calendar Readiness Integration, Cron Automation & Documentation

## Objectives
1. Wire the persisted market-calendar artifact into the readiness preflight so market-open evaluation prefers real IBKR trading-hours data over the heuristic fallback when available.
2. Surface market-calendar coverage in execution diagnostics output.
3. Register a cron job for periodic market-calendar sync (daily when IBKR is available).
4. Update operator runbooks and the outstanding-work rollup.

## Risks / Dependencies
- Calendar artifact may not exist on first run → must fall back gracefully to existing heuristic.
- Artifact staleness: if the artifact is older than 7 days, treat it as unreliable and fall back.
- Cron sync depends on IBKR broker being reachable → the sync module already handles this gracefully (marks rows as `ibkr_error`).
- Must not break existing readiness behavior when no calendar data exists.

## Actionable Checklist
- [ ] Add `evaluateMarketWindowFromCalendar(portfolioDir, { now })` helper in `marketCalendar.js` or a new adapter that reads the persisted artifact + evaluates state using `evaluateHoursState`.
- [ ] In `liveReadinessPreflight.js` `evaluateMarketWindow`, consult the calendar artifact first; if it has recent data for the primary exchange, use it; otherwise fall back to `lib/marketHours`.
- [ ] Add a `calendarCoverage` field to the diagnostics output from `executionDiagnostics.js`.
- [ ] Write a test for the new calendar-aware market window evaluation.
- [ ] Write a test for the fallback behavior when artifact is missing/stale.
- [ ] Register the cron job via `cron add` with a schedule of weekdays 06:30 UTC (before market open).
- [ ] Update `ROLLUP_OUTSTANDING_PLAN.md` to mark items complete.
- [ ] Update `docs/operator-runbooks.md` with sync-market-calendar guidance.
- [ ] Run full test suite, commit, push.

## Acceptance Criteria
- `evaluateMarketWindow` returns accurate state when calendar data is fresh, falls back transparently when missing.
- Execution diagnostics include a `calendarCoverage` summary object.
- Cron job is registered and validates successfully.
- All existing tests pass without regression.
- New tests cover both fresh-artifact and missing-artifact code paths.
