# Phase 189 — Reconcile + Trade-Log Update + Reproposal Hook

## Objective
After the basket runner returns and the monitor cycle ends, automatically:
1. Pull broker executions/completed-orders.
2. Run `reconcileBasketRunFromBroker` against the runs artifact.
3. Mirror final per-leg state back into `trades.md` (status, fill qty, avg fill price, broker order id).
4. Surface a clear reproposal hook for cancelled legs (proposal artifact + actionable next step) without auto-transmitting.

## Risks / dependencies
- Trade-log writes must be idempotent and preserve existing rows.
- The reproposal hook must NOT transmit; only produce artifacts.
- The orchestration script must remain runnable after a basket has already been transmitted (so a partial run can be reconciled without re-transmitting).

## Actionable checklist
- [ ] Add `--reconcile-only` mode to the orchestration script that skips runner submission.
- [ ] After the monitor loop, fetch broker evidence and call `reconcileBasketRunFromBroker`.
- [ ] Append/update trade rows for each leg using broker evidence:
  - filled: status=filled, actualChf, broker order id
  - cancelled: status=cancelled, broker reason
- [ ] Build a reproposal artifact for cancelled legs with refreshed quotes (band recomputed from current ask).
- [ ] Print a clear summary at the end of the run.
- [ ] Add a unit test exercising the trade-row mirroring helper.

## Acceptance criteria
- Running with `--reconcile-only` against an existing approval id updates the runs artifact and trade-log without invoking the runner again.
- Trade rows reflect final fill/cancel status with broker order id and average fill price.
- A reproposal artifact lists the cancelled legs with current ask reference and a fresh limit suggestion.
- New helper tests pass; existing focused suite stays green.
