# Phase S1 — Repo truth & test gates

**Goal:** Get `npm test` (the 25-check `verifyRepoChecks` suite) green, fix the one known pre-existing failure, refresh truth surfaces, regenerate the market-calendar artifact with new holiday fields.

## Objectives
1. `npm test` exits 0
2. The new `todayStatus` and `holidays` fields are populated in `runtime/market-calendar/etf.json`
3. Top-level truth docs (`SPEC_PROGRESS.md`, `PROGRESS_REPORT.md`, `ROLLUP_OUTSTANDING_PLAN.md`) reflect the bugfix lane completion
4. `master-plan-204-212*.md` and other historical "next steps" docs carry a `> [HISTORICAL]` banner

## Risks / dependencies
- Fixing `test-market-calendar-readiness.js` requires understanding whether the test's expectation or the artifact's filename is the source of truth. Plan: keep filename `etf.json` (matches artifact-policy contract); update the test.
- `npm test` may surface additional pre-existing failures we don't yet know about. Plan: fix or annotate them.
- Market-calendar re-sync hits the broker; broker must be ready (it is, gateway up).

## Actionable checklist
- [ ] Inspect `tests/test-marketHours.js` and `tests/test-ibkr-readiness.js` (they run as part of npm test) for any surprises
- [ ] Fix `scripts/test-market-calendar-readiness.js` — update wrong artifact filename
- [ ] Run `npm test` — capture failures
- [ ] Iterate until green
- [ ] Re-run `node scripts/sync-market-calendar.js portfolio/etf --json` and confirm new `holidays` and `todayStatus` fields appear in `runtime/market-calendar/etf.json`
- [ ] Add a test asserting `marketCalendar.holidays` and per-instrument `todayStatus` exist in the persisted artifact (regression guard)
- [ ] Update `ROLLUP_OUTSTANDING_PLAN.md` — check off A's "Full closeout verification" item; add bug-fix lane entry
- [ ] Update `SPEC_PROGRESS.md` — note today's fixes
- [ ] Update `PROGRESS_REPORT.md` — same
- [ ] Add HISTORICAL banner atop `master-plan-204-212-refined.md`, `master-plan-204-212.md`, and `consolidated-roadmap-checklist.md`
- [ ] Commit + push

## Acceptance criteria
- `npm test` exits 0 with all 25 checks passing
- `runtime/market-calendar/etf.json` contains `marketCalendar.holidays` and each instrument has `todayStatus`
- New regression test passes
- Truth docs reference 2026-05-25 bug-fix
- Historical docs banner-flagged
- One commit with a clear message, pushed to master

## Test strategy
- Test type: regression (artifact-contract)
- New file: `scripts/test-market-calendar-artifact-has-holiday-fields.js`
- Asserts: artifact JSON has `marketCalendar.holidays` array and each `instruments[*]` has a `todayStatus` field
- Wire it into `verifyRepoChecks.js`

## Out
Green test suite + refreshed truth docs, committed and pushed.
