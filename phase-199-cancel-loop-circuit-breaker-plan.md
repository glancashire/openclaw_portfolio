# Phase 199 — Cancel-Loop Circuit Breaker

## Objective
Stop the assistant from emitting endless reproposals when an instrument repeatedly cancels (as observed today with SPMCHA: 4 consecutive cancellations from 129.00 → 129.50 → 130.15 → 130.85, all auto-cancelled by IBKR's order-routing engine). After N consecutive cancellations on the same instrument across a reproposal lineage, the circuit breaker:

1. Skips the failing instrument when building the next reproposal.
2. Writes a `circuit-breaker.json` marker to `runtime/circuit-breakers/<portfolio>/` with the instrument identity, parent approval id, cancellation count, and last seen broker order ids.
3. Surfaces the breaker in `peng-actions.json` and `approvals-queue.md` with severity `critical` and a `recommendedOperatorAction` that explains the next step (fix upstream issue, then run the operator-side `clear-circuit-breaker` CLI).

This means a single problematic instrument never starves the rest of the basket and never produces a runaway approve-cancel loop.

## Risks / dependencies
- Lineage walking must follow `parentApprovalId` chains across both active and `.superseded/` reproposal files. Easy to miss archived ancestors.
- Threshold must be conservative; 3 consecutive cancellations is enough signal but 2 may produce false positives.
- A fill on the same instrument in a later round (manual operator override or different broker conditions) must reset the counter.
- A circuit breaker only blocks reproposals; operator can still manually approve a one-shot via `propose-basket --save-as-approved` if they want to override.

## Actionable checklist
- [ ] New module `src/execution/cancelLoopBreaker.js`:
  - `walkReproposalLineage({ portfolio, approvalId, rootDir })` → returns ordered list of run-state files (oldest → newest) following parent chain through both active and `.superseded/`.
  - `countConsecutiveCancellations({ portfolio, instrument, latestApprovalId, rootDir })` → walks lineage starting at latest, counts consecutive cancellations on `instrument` until it hits a fill or the lineage end.
  - `loadCircuitBreaker({ portfolio, instrument, rootDir })` / `saveCircuitBreaker(...)` / `clearCircuitBreaker(...)`.
  - `evaluateCircuitBreaker({ portfolio, instrument, latestApprovalId, rootDir, threshold = 3 })` → returns `{ tripped, count, threshold, marker? }`.
- [ ] Wire into `basketReproposalBuilder.buildReproposalForCancelledLegs`:
  - For each cancelled leg, call `evaluateCircuitBreaker`.
  - If tripped, write/update the breaker marker, exclude the leg from the reproposal output, push it to a new `excludedLegs[]` array on the envelope.
  - If `excludedLegs.length === input.length` (every leg excluded), return `{ skipped: true, reason: 'all_legs_circuit_broken' }`.
- [ ] New CLI `scripts/clear-circuit-breaker.js`:
  - `--portfolio --instrument`.
  - Calls `clearCircuitBreaker` and prints what was cleared.
- [ ] Surface in approvals queue / pending actions:
  - New surface `circuitBreakerSurface.js` that lists trip markers.
  - Wire into `summaryArtifacts.buildPendingActionsOverview` and `buildApprovalsQueue`.
  - Severity `critical`, urgency `high`.
- [ ] Tests:
  - `test-cancel-loop-breaker.js`: lineage walking, counting (with fills resetting), tripping, archive lookup, idempotent save/load/clear.
  - Integration: `buildReproposalForCancelledLegs` correctly excludes tripped legs and produces `excludedLegs[]`.
  - Regression: existing focused tests stay green.
- [ ] Update runbook: document circuit breaker behavior and `clear-circuit-breaker` CLI.

## Acceptance criteria
- After 3 consecutive cancellations on the same instrument, the next reproposal cycle does NOT include that instrument.
- A circuit-breaker marker exists at `runtime/circuit-breakers/etf/<instrument>.json` with `count`, `threshold`, `lastBrokerOrderIds`, `firstTrippedAt`.
- A pending-actions item with `kind: 'circuit_breaker_tripped'` and severity `critical` surfaces in the operator overview.
- `node scripts/clear-circuit-breaker.js --portfolio=etf --instrument=CH0130595124` clears the marker and the next reproposal cycle includes the instrument again.
- Existing focused suite stays green; new tests pass.
