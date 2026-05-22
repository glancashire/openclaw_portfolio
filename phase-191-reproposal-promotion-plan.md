# Phase 191 — Promote Reproposal → Approved Basket (One-Command Approval)

## Objective
Close the loop between Phase 190 (reproposal generation) and existing canonical execution: a single helper command should promote a pending reproposal envelope into an approved-order-baskets envelope, ready for the runner to consume. This keeps the operator's interaction down to a single `approve` per round.

## Risks / dependencies
- The reproposal envelope already uses the approved-basket schema (Phase 190), but the basket runner reads only from `runtime/approved-order-baskets/`. We must NOT silently mutate state without operator consent.
- The promotion helper itself must be invoked by the assistant ONLY after the operator types `approve` (consistent with the user's "one approval per round" rule).
- The runner uses approval id as the artifact filename; we must guarantee uniqueness (no collision with parent approval id).

## Actionable checklist
- [ ] Add `src/execution/basketReproposalPromoter.js` with:
  - `promoteReproposalToApproval({ portfolio, parentApprovalId, version, rootDir, now })` — copies reproposal envelope into approved-order-baskets with status `approved`, idempotent if already promoted.
  - `latestReproposal({ portfolio, parentApprovalId, rootDir })` — returns the highest-version reproposal envelope.
- [ ] Add a CLI helper `scripts/promote-reproposal.js` accepting `--portfolio`, `--parent`, `--version` (defaults to latest).
- [ ] Add a `--auto-promote` flag to `execute-approved-basket-end-to-end.js` that, when set, promotes a freshly generated reproposal in the same run (so a `--reconcile-only --auto-promote` invocation, after operator approval, is the single autonomous post-approval action).
- [ ] Add status='approved' and approvedAt timestamp to the promoted envelope.
- [ ] Tests:
  - Unit: `promoteReproposalToApproval` writes the right artifact, sets `status: 'approved'`, preserves leg pricing.
  - Idempotency: re-running promotion does not duplicate or corrupt.
  - latestReproposal helper returns the right version among multiple.

## Acceptance criteria
- After Phase 190 emits a reproposal at `runtime/basket-reproposals/etf/<parent>-reproposal-<n>.json`, running `node scripts/promote-reproposal.js --parent=<parent>` creates `runtime/approved-order-baskets/etf/<parent>-reproposal-<n>.json` with `status: 'approved'`.
- The basket runner can execute that envelope without any other manual edits.
- A second invocation is a no-op (idempotent).
- All focused tests stay green; new tests cover the promoter end-to-end.
