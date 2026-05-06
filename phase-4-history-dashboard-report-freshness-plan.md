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

## Actionable checklist
- [ ] Inspect current history-writing, dashboard-generation, and report-cycle code paths.
- [ ] Identify the minimum shared freshness metadata/helpers needed.
- [ ] Implement material-event freshness guarantees in execution/report flows.
- [ ] Implement dashboard stale-state detection/reporting.
- [ ] Add focused tests for:
  - [ ] dashboard regeneration after execution material events
  - [ ] report-cycle history/dashboard refresh behavior
  - [ ] stale dashboard detection when source files are newer than dashboard
  - [ ] freshness metadata surfacing in dashboard/report output
- [ ] Run the targeted freshness test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
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
