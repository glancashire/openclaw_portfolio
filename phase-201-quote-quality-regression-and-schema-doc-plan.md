# Phase 201 — Quote-quality regression + envelope schema doc

## Objective
Add a regression test that ensures the basket proposal generator correctly stamps `quoteQuality` on legs for both:
- a healthy snapshot (live ask + last) → `tier: 'live'`,
- a degraded snapshot (only close, no ask, no live last) → `tier: 'stale_only'`,
- a one-sided snapshot (live ask but no live last timestamp) → `tier: 'one_sided'`.

Also: write a brief schema reference doc that captures every field on the proposal/approval envelope and its semantics. We've added enough fields across phases 184-200 that the schema is no longer self-evident.

## Risks / dependencies
- Tests must use the proposal generator's existing public surface (quoteFn).
- Docs must stay terse; this isn't a contract spec, just a helpful reference for future operators / agents.

## Actionable checklist
- [ ] Write `scripts/test-proposal-generator-quote-quality.js`:
  - generateBasketProposal called with stub quoteFn that returns 3 different shapes.
  - assert each leg has the expected `quoteQuality.tier`.
  - assert `requiresOperatorAttention` is true if any stale_only leg is included.
  - assert `quoteQualitySummary.tiers` counts are correct.
- [ ] Write `docs/basket-envelope-schema.md`:
  - For each top-level field (approvalId, parentApprovalId, status, legs, etc.), one-line description.
  - Per-leg fields including the Phase 200 additions.
  - Cross-reference to the canonical phases that added each.

## Acceptance criteria
- New regression test passes.
- All 24 focused tests pass.
- `docs/basket-envelope-schema.md` exists and accurately reflects the current envelope shape.
