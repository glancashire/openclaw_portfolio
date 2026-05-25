# Phase 203 — Surface envelope annotations in operator overview

## Objective
Phases 200–202 added rich annotations to the proposal envelope (`quoteQuality`, `requiresOperatorAttention`, `currencyDeployment`). Right now those only appear in the CLI preview; the operator overview surfaces (`approvals-queue.md`, `pending-actions.json`) don't include them.

Wire these into:
- `reproposalSurface.describeReproposalItem` — add quote-quality summary if reproposal envelope has it.
- `summaryArtifacts.buildApprovalsQueue` — when surfacing approved baskets, include currency deployment + attention summary.

## Risks / dependencies
- Existing `test-approvals-queue-basket-first.js` and `test-multi-portfolio-overview.js` may need loosening to tolerate the new fields.
- Avoid bloat: keep the surface output to a few lines per item, not a full dump.

## Actionable checklist
- [ ] Identify what an "approved basket" surface item currently looks like in `summaryArtifacts.buildApprovalsQueue`.
- [ ] Read the latest approval envelope (or proposal envelope) for that portfolio and pull `quoteQualitySummary`, `requiresOperatorAttention`, `currencyDeployment`.
- [ ] Append these as fields on the surface item.
- [ ] Add tests:
  - `test-approvals-queue-includes-envelope-annotations.js`.
- [ ] Update existing tests if they assert exact field shapes.

## Acceptance criteria
- Approvals queue items for approved baskets include `quoteQualitySummary` (when present), `requiresOperatorAttention`, `currencyDeployment`.
- New test passes.
- All 25 existing focused tests stay green.
