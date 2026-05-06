# Phase 4 — history, dashboard, and reporting freshness plan

## Goal
Make generated portfolio artifacts trustworthy after execution and reporting activity by guaranteeing material-event history snapshots, dashboard regeneration on execution/reporting events, and clear stale-state detection/reporting.

## Scope for this phase
- Guarantee `history.md` captures material execution/report events consistently.
- Guarantee dashboard regeneration after execution transitions and report cycles.
- Detect and surface stale dashboard state from holdings/history/trades drift.
- Surface freshness metadata in dashboard/report outputs where it helps operators trust the artifacts.
- Add focused automated tests for each new freshness guarantee.
- Update progress docs when verified.

## Verified outcomes
- Dashboard output now includes a dedicated freshness section plus stale-state warnings when source Markdown is newer.
- Report output now includes freshness metadata tied to dashboard/source drift.
- Report-cycle script now returns explicit history-append and dashboard-regeneration evidence.
- Targeted freshness tests and the broader execution verification bundle both pass.

## Actionable checklist
- [x] Inspect current history-writing, dashboard-generation, and report-cycle code paths.
- [x] Identify the minimum shared freshness metadata/helpers needed.
- [x] Implement material-event freshness guarantees in execution/report flows.
- [x] Implement dashboard stale-state detection/reporting.
- [x] Add focused tests for:
  - [x] dashboard regeneration after execution material events
  - [x] report-cycle history/dashboard refresh behavior
  - [x] stale dashboard detection when source files are newer than dashboard
  - [x] freshness metadata surfacing in dashboard/report output
- [x] Run the targeted freshness test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Verification gate
This phase is complete only when:
1. Targeted freshness tests pass.
2. Existing execution/report verification still passes.
3. Dashboard/report outputs clearly surface freshness state.
4. Docs reflect the verified guarantees.

## Expected follow-on
After this phase, move directly into rebalancing hardening unless new evidence shows a smaller remaining acceptance blocker.
