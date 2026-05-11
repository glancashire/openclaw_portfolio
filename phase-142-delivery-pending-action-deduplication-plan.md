# Phase 142 Plan — Delivery pending-action deduplication for reconciled fill backfill

## Goal
Remove duplicate operator-action surfacing for reconciled-but-unnotified fills so dashboard, queue, and delivery surfaces present one crisp backfill-review action instead of multiple overlapping variants.

## Why this phase
After Phase 141, the system truth is correct, but the dashboard now shows the same notification-backfill issue twice:
1. a generic delivery pending action
2. a delivery/backfill_review queue item

That creates avoidable noise and makes the operator queue feel less trustworthy. The next hardening step is to keep the truth while deduplicating the presentation.

## Scope
Tighten operator-facing deduplication and prioritization for reconciled fill backfill items only. Do not change execution behavior, fill-monitor semantics, or historical trade truth.

## Actionable checklist
- [ ] Audit how delivery pending actions and dashboard pending-action items are composed.
- [ ] Deduplicate reconciled-fill backfill review so it appears once in the pending operator action list.
- [ ] Preserve delivery posture readiness=false and the backfill-specific recommended next action.
- [ ] Ensure queue summaries stay correct after deduplication.
- [ ] Add focused regression coverage for the deduped dashboard/operator-queue behavior.
- [ ] Regenerate live artifacts and verify `portfolio/etf` surfaces.
- [ ] Commit and push Phase 142 once tests and live surfaces pass.

## Verification targets
- `node scripts/trade.js delivery portfolio/etf --json`
- `node scripts/test-delivery-backfill-review-readiness.js`
- new focused regression for dashboard/operator pending-action deduplication
- dashboard regeneration + grep inspection

## Exit criteria
- Reconciled-but-unnotified fills remain truthful and operator-visible.
- Delivery readiness remains degraded until review is handled.
- Dashboard/operator queue presents one clear backfill-review action, not duplicated variants.
