# Phase 194 — Latest-Version Reproposal Surface + Stale Sweep

## Objective
1. Surface only the latest-version reproposal per parent approval id so the operator sees one item per cancelled basket, not one per historical iteration.
2. Add a stale-reproposal sweep: when a newer version exists for the same parent, the older versions are marked superseded (file moved into `runtime/basket-reproposals/<portfolio>/.superseded/`) so the surface stays clean and audit trail is preserved.

## Risks / dependencies
- Surface change must not regress existing tests for `listPendingReproposals` (those tests assume multiple versions remain visible).
- The sweep must NOT touch promoted reproposals (which already live as approved baskets).
- File moves must be atomic and idempotent.

## Actionable checklist
- [ ] Add `listLatestPendingReproposals({ rootDir, portfolio })` to `src/reporting/reproposalSurface.js` that returns only the highest version per parent.
- [ ] Update overview wiring to use the latest-only helper.
- [ ] Add `sweepSupersededReproposals({ rootDir, portfolio, dryRun })` to `src/execution/basketReproposalBuilder.js` (or new `basketReproposalArchiver.js`) that:
  - Groups un-promoted reproposals by parent.
  - For each parent with N>1 un-promoted versions, moves versions < max into `.superseded/`.
  - Returns the list of moved files.
- [ ] Wire the sweep into `buildReproposalForCancelledLegs` so the act of building a new reproposal automatically archives old ones for the same parent.
- [ ] Unit tests for `listLatestPendingReproposals` and `sweepSupersededReproposals`.
- [ ] Integration test confirming the overview surface only shows one item per parent after the sweep.

## Acceptance criteria
- After regenerating overview artifacts with both `basket-A-reproposal-1.json` and `basket-A-reproposal-2.json` pending, `pending-actions.json` shows exactly one `basket_reproposal_pending` item for `basket-A` (the v2 one).
- After calling `sweepSupersededReproposals`, `runtime/basket-reproposals/etf/.superseded/` contains the older versions; the active directory contains only the latest per parent.
- Existing tests pass; new tests cover both helpers.
