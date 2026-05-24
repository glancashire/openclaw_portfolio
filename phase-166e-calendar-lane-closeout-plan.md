# Phase 166e: Market-Calendar Lane Closeout

## Objectives
1. Final verification that the entire market-calendar lane works end-to-end (model → store → sync → readiness → diagnostics → cron).
2. Update ROLLUP_OUTSTANDING_PLAN.md to mark section A fully complete and refresh the recommended execution order.
3. Add the market-calendar key files to SPEC_PROGRESS.md and IMPLEMENTATION_PLAN.md references.
4. Run full test suite to confirm no regressions.

## Risks / Dependencies
- Doc-contract tests may need small updates if SPEC_PROGRESS or IMPLEMENTATION_PLAN content changes trip assertions.
- The calendar cron job won't fire until Monday 06:30 UTC; first live test will be deferred.

## Actionable Checklist
- [ ] Run sync-market-calendar.js --dry-run to confirm real portfolio parsing works.
- [ ] Update ROLLUP_OUTSTANDING_PLAN.md section A to mark all items complete, update recommended execution order.
- [ ] Update SPEC_PROGRESS.md to mention market-calendar capability.
- [ ] Update IMPLEMENTATION_PLAN.md to mention market-calendar module.
- [ ] Run full focused test suite.
- [ ] Commit and push.

## Acceptance Criteria
- Section A of ROLLUP_OUTSTANDING_PLAN.md is fully checked.
- SPEC_PROGRESS.md and IMPLEMENTATION_PLAN.md reference market-calendar.
- All tests pass.
