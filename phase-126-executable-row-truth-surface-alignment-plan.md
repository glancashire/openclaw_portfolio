# Phase 126 — Executable Row Truth-Surface Alignment

## Goal
Make the remaining partial-executability state explicit and consistent across canonical operator surfaces so approved-but-non-executable rows are explained clearly and auditable without ambiguity.

## Why this phase exists
Phase 125 restored broker pricing readiness and authority convergence, but canonical preflight still reports 3 approved rows vs 2 executable rows. The system is healthy enough to transmit live orders, yet the operator-facing surfaces do not fully explain why one approved row is excluded. That is a truth-surface gap.

## Scope
- Trace how executable rows are derived in canonical preflight.
- Identify why the approved CSPX row is excluded from executable rows.
- Add explicit reason classification for approved-but-non-executable rows.
- Ensure the market-open submission path records/surfaces the same reason.
- Verify canonical CLI surfaces present that reason clearly enough for operator use.

## Non-goals
- Do not widen broker permissions or disable quality gates.
- Do not silently submit live orders.
- Do not alter existing approved trade intent unless needed for truthful status recording.

## Actionable checklist
- [ ] Inspect canonical preflight/executable-row derivation code and current row model.
- [ ] Inspect market-open submission path and blocked-row persistence behavior.
- [ ] Define one clear status/reason contract for approved-but-non-executable rows.
- [ ] Implement the smallest code changes needed to expose that reason in preflight and/or related surfaces.
- [ ] Add/update focused tests for the new truth surface.
- [ ] Run verification gates for preflight, authority, and market-open dry-run behavior.
- [ ] Iterate until all targeted checks pass.
- [ ] Commit Phase 126 plan + implementation.
- [ ] Push Phase 126.

## Verification gates
- `node tests/test-ibkr-readiness.js`
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/submit-orders-at-open.js portfolio/etf --dry-run`
- any new/updated focused regression tests for executable-row reason reporting

## Exit criteria
- Approved-but-non-executable rows have an explicit operator-visible reason.
- Canonical preflight truth is clearer, not merely numerically correct.
- Market-open dry-run and canonical preflight do not disagree about why a row is skipped.
- All verification gates pass.
