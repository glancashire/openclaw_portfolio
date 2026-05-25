# Phase 141 Plan — Fill-notification backfill operator workflow convergence

## Goal
Make reconciled-but-unnotified fills operator-clear and workflow-complete across status, delivery, and dashboard surfaces so the remaining EMUAA fill review does not read like an ambiguous delivery failure.

## Why this phase
Phase 139 separated truthful buckets (`notifiedFills` vs `reconciledUnnotifiedFills`). That was the right safety move, but the current operator experience still leaves a gap: the system tells the truth, yet the remaining action is not consistently framed as a specific backfill-review workflow item across all user-facing surfaces.

## Scope
Tighten only the operator-facing fill-notification review path for reconciled fills that were never actually sent. Do not fake sends. Do not auto-clear historical truth. Do not widen live-execution behavior.

## Actionable checklist
- [ ] Audit current status/delivery/dashboard wording for reconciled-but-unnotified fills.
- [ ] Normalize the next-action / recommendation text so operator surfaces consistently describe this as a backfill-review item, not a generic delivery failure.
- [ ] Ensure any queue / pending-action summaries count this state consistently.
- [ ] Add focused regression checks for the wording and surfaced action path.
- [ ] Regenerate relevant artifacts and verify the live `portfolio/etf` surfaces.
- [ ] Commit and push Phase 141 once the surfaces converge.

## Verification targets
- `node scripts/trade.js status portfolio/etf`
- `node scripts/trade.js delivery portfolio/etf --json`
- `node scripts/test-monitor-fills-real-orders.js`
- new focused regression(s) for dashboard/delivery/status wording

## Exit criteria
- A reconciled-but-unnotified fill is surfaced consistently as a backfill-review workflow item.
- No surface implies an email was sent when it was not.
- Operator next step is explicit and consistent across status, delivery, and dashboard outputs.
