# Phase 188 — Robust Monitor & Reconcile in Basket Runner

## Objective
Fix the silent-failure mode the live run exposed: the monitor loop cleared all
4 broker order ids on the first poll because they had not yet appeared on the
broker's open-orders feed. As a result a cancelled leg was indistinguishable
from a filled one, and per-leg state in the runs artifact stayed at
`submitted` even after fills/cancels.

## Risks / dependencies
- Broker open-orders feed is eventually-consistent right after placement.
- Skill-side executions and completed-orders lists are the source of truth for
  fill/cancel disambiguation.
- Runs artifact state shape is already shared with summary surfaces.

## Actionable checklist
- [ ] Add a settling delay before the first open-orders poll.
- [ ] Track `everSeenOpen` per order id; only treat ids as "cleared" once we
      have seen them open at least once or after a sufficient settle period.
- [ ] After clearing, classify each leg as filled / cancelled / unknown using
      the executions and completed-orders lists.
- [ ] Persist filled/cancelled status into the basket-runs artifact so
      summary surfaces can reflect terminal state.
- [ ] Add `reconcileBasketRunFromBroker(...)` helper exported from the runner
      module so it is callable from scripts and reconciliation paths.
- [ ] Add unit tests exercising:
   - settle-then-clear classification
   - filled vs cancelled disambiguation from executions+completed lists
   - persistence of terminal status in the runs artifact

## Acceptance criteria
- A leg that fills shows `status: 'filled'` in the runs artifact with
  `fillQuantity` and `avgFillPrice` populated.
- A leg that cancels shows `status: 'cancelled'` with the broker reason.
- `everSeenOpen` flag prevents premature "cleared" classification.
- Existing runner tests still pass.
- New unit tests pass.
