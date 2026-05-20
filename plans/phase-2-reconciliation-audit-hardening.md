# Phase 2 plan — reconciliation and audit-trail hardening

## Objectives
- Prevent misleading cancellation reconciliation when exact broker order-id lookup fails.
- Tighten completed-order hint matching so unrelated historical rows are not contaminated.
- Preserve existing successful status-sync behavior for exact matches and legitimate probable-cancelled cases.

## Risks / dependencies
- Reconciliation touches live-trade history behavior, so false positives are dangerous.
- Existing not-found fallback depends on partial broker hint surfaces; over-tightening may reduce useful cancellation recovery.
- Need to avoid changing generated portfolio artifacts as part of this source/tests-only phase.

## Actionable checklist
- [ ] Inspect current not-found fallback and hint matching logic in `syncPortfolioOrderStatus`
- [ ] Add regression tests for ambiguous historical order-id reuse / weak hint correlation
- [ ] Add regression tests for legitimate probable-cancelled matching with strong evidence
- [ ] Patch reconciliation to require stronger selector/instrument/quantity alignment before applying probable-cancelled state
- [ ] Run targeted reconciliation tests until green
- [ ] Run broader regression suite to confirm no behavior breaks
- [ ] Commit phase 2 implementation
- [ ] Push phase 2

## Acceptance criteria
- Ambiguous completed-order hints do not mutate unrelated rows.
- Strongly aligned completed-order hints still reconcile a not-found order as probable cancelled.
- Existing order-status regression tests pass.
- Source/tests-only commit is pushed successfully.
