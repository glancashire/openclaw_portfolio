# Phase 200 — Streaming-mode quote enrichment + liquidity preflight

## Objective
Surface liquidity-quality signals during basket proposal generation so we can warn (or block) before transmitting orders against thin instruments. Today's SPMCHA cancellations would have been caught earlier because the snapshot helper returned only a stale close.

Specifically:
1. Add a quote-quality classifier that takes the raw market-snapshot and returns `{ tier: 'live' | 'one_sided' | 'stale_only', missingFields[] }`.
2. Annotate each leg in the proposal envelope with `quoteQuality` so operators see liquidity tier at a glance.
3. When a leg's quote is `stale_only` (no live last/bid/ask), automatically flag the proposal with `requiresOperatorAttention = true` and add a friendly summary line.
4. Surface in approvals queue the per-leg quote tier so operator can spot risky orders before approving.

This is non-blocking by default — operators can still approve `stale_only` legs (perhaps the instrument always trades thin). Conservatism comes from visibility, not refusal.

## Risks / dependencies
- The current `propose-basket.js` uses `client.native.fetchMarketSnapshot([conid])` which (as we observed today) returns degraded fields for thin instruments. We don't change that wire format yet — we add a classifier that interprets whatever shape we get back.
- Changing leg envelope schema risks downstream consumers breaking. We add fields, never remove. Existing tests should keep passing.

## Actionable checklist
- [ ] New module `src/execution/quoteQuality.js`:
  - `classifyQuoteQuality(snapshot)` → `{ tier, missingFields, observedFields }`.
  - Tier rules: `live` if both 86 (ask) and 31 (last) present; `one_sided` if only one of them; `stale_only` if just close.
- [ ] Update `src/execution/basketProposalGenerator.js` to call the classifier and stamp `leg.quoteQuality`.
- [ ] Update `propose-basket.js` CLI to print the quote tier per leg in thedable preview.
- [ ] Surface `quoteQuality` in `reproposalSurface.describeReproposalItem` so the approvals queue shows it.
- [ ] Tests:
  - `test-quote-quality-classifier.js` — every tier branch.
  - Integration: proposal generator stamps `quoteQuality` correctly.
  - Regression: existing `test-basket-proposal-generator.js` continues to pass with the additional field.

## Acceptance criteria
- Proposal envelope leg objects carry `quoteQuality: { tier, missingFields, observedFields }`.
- `propose-basket.js` prints quote tier in preview.
- Stale-only quotes produce a `requiresOperatorAttention: true` flag at envelope level.
- 22 existing focused tests stay green; new tests pass.
