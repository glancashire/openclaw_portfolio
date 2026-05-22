# Phase 193 — Surface Reproposal State in Operator Overview

## Objective
Ensure reproposal envelopes (`runtime/basket-reproposals/etf/*.json`) are surfaced in the operator's standard views (`runtime/overview/portfolio-overview.md`, `runtime/overview/approvals-queue.md`, `runtime/overview/pending-actions.json`) so the operator can see at a glance:
- Which portfolios have a pending reproposal awaiting `approve`.
- The leg(s) involved with previous limit and proposed new limit.
- The exact command to run after typing `approve`.

This closes the autonomous loop: assistant generates reproposal (Phase 190) → operator sees it surfaced in overview (Phase 193) → operator approves → assistant runs `approve-and-execute-reproposal.js` (Phase 192).

## Risks / dependencies
- Existing `summaryArtifacts.js` and `overviewBoard.js` already render the approvals queue. We need to add a "reproposal pending" item type without disrupting existing tests.
- The pending-actions.json schema is consumed by external consumers (TUIs, dashboards). Schema additions must be backward-compatible (`schemaVersion` stays `1.1`; new fields are optional).
- Reproposals are tied to a parent approval id; we need to detect them by scanning `runtime/basket-reproposals/<portfolio>/`.

## Actionable checklist
- [ ] Add `src/reporting/reproposalSurface.js` exporting `listPendingReproposals({ rootDir, portfolio })` returning `[{ parentApprovalId, version, path, legs, createdAt }]`.
  - A reproposal is "pending" if no matching `runtime/approved-order-baskets/<portfolio>/<approval-id>.json` exists yet.
- [ ] Wire pending reproposals into the approvals queue items emitted by `buildApprovalsQueue` in `src/reporting/summaryArtifacts.js`. Surface them as a new item kind `basket_reproposal_pending` with priority above "review-and-approve dry-run" but below already-approved baskets.
- [ ] Wire pending reproposals into the pending-actions.json items list with a clear `summary` and `recommendedOperatorAction`.
- [ ] Surface a "Reproposal pending" tag in `portfolio-overview.md` (one column flag per portfolio).
- [ ] Tests:
  - Unit: `listPendingReproposals` returns `[]` when no reproposals exist; returns the right reproposals when only some are pending.
  - Integration: regenerating overview artifacts surfaces the SPMCHA reproposal as a pending item with command hint.
  - Regression: existing `test-multi-portfolio-overview.js` and `test-approvals-queue-basket-first.js` still pass.

## Acceptance criteria
- After running `generateOverviewArtifacts(...)` with the live SPMCHA reproposal in place, `runtime/overview/pending-actions.json` contains an item with `kind: 'basket_reproposal_pending'`, `portfolio: 'etf'`, summary including `SPMCHA` and `129.5`, and `recommendedOperatorAction: 'Reply approve to transmit; assistant will run scripts/approve-and-execute-reproposal.js'`.
- Promoting the reproposal (Phase 191) makes the item disappear from the pending list on next regeneration.
- All existing focused tests pass; new reproposal-surface tests pass.
