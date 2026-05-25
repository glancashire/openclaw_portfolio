# Phase 143 Plan — Operator next-step prioritization for backfill review vs queued retry

## Goal
Improve dashboard/operator next-step prioritization so the most actionable unresolved operator task is recommended first. In the current live state, notification backfill review should outrank the generic open-runner retry reminder.

## Why this phase
After Phase 142, the dashboard is no longer noisy, but its `Recommended Next Step` still favors the open-runner retry queue item over the more immediate post-trade workflow item: the reconciled fill notification backfill review for order `9107`.

The next hardening step is to make the recommendation ordering reflect operator actionability, not just generic queue sorting.

## Scope
Adjust pending-action prioritization / recommendation ordering only. Do not alter execution eligibility, queue counts, fill-notification state, or broker truth.

## Actionable checklist
- [ ] Audit how dashboard pending actions are sorted and how `bestNextStep` is selected.
- [ ] Add a prioritization rule so delivery `backfill_review` can outrank open-runner retry reminders when both are present.
- [ ] Preserve the existing explicit queue items and counts.
- [ ] Add focused regression coverage for the recommendation ordering.
- [ ] Regenerate live artifacts and verify the dashboard recommended step now matches the intended operator priority.
- [ ] Commit and push Phase 143 once tests and live surfaces pass.

## Verification targets
- `node scripts/trade.js delivery portfolio/etf --json`
- dashboard regeneration + `Recommended Next Step` inspection
- new focused regression for pending-action ordering / best-next-step behavior

## Exit criteria
- The live dashboard recommends the most actionable remaining operator step first.
- Delivery backfill review remains explicit and truthful.
- Queue counts and other surface truth remain unchanged.
