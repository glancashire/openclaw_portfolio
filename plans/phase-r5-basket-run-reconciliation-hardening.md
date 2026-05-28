# Phase R5 — Basket run reconciliation hardening

## Objectives
- Make basket-run reconciliation trust broker-completed evidence by order id instead of leaving stale `submitted` legs behind.
- Ensure reconciliation can close old run artifacts cleanly when the broker reports terminal outcomes but executions are absent.
- Keep dashboard/reporting surfaces aligned with the reconciled basket-run truth.

## Risks / dependencies
- Reconciliation logic sits on the live execution path; avoid changing approval gates or submission behavior.
- Completed-order payloads may vary across native/client surfaces, so matching must tolerate field-name drift while still preferring exact order-id evidence.
- Historical run artifacts may lack some newer fields; reconciliation must stay backwards-compatible.

## Actionable checklist
- [ ] Inspect current basket reconciliation and identify why terminal broker outcomes can remain `submitted`.
- [ ] Add focused unit tests for `classifyBrokerOutcome()` covering exact order-id cancellation matching, fill precedence, and non-matching completed orders.
- [ ] Add integration/regression coverage for `reconcileBasketRunFromBroker()` so stale submitted legs are converted to terminal states in persisted run artifacts.
- [ ] Implement the smallest fix that makes reconciliation deterministic and idempotent.
- [ ] Run targeted tests, then safe lane, then full suite; iterate until green.
- [ ] Commit and push the phase once verification is clean.

## Acceptance criteria
- A completed-order record for a specific broker order id can reconcile a basket leg away from `submitted` without requiring a fill execution.
- Non-matching completed-order rows do not accidentally cancel unrelated basket legs.
- Existing fill reconciliation behavior still wins when executions are present.
- Automated tests cover the new matching logic and the full repo test suite passes.
