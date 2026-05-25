# Phase 183 — Ordering Hardening Master Plan

## Goal
Reduce live-order friction so the operator can approve one bounded basket and have the system execute the basket leg-by-leg with independent failure handling, automatic venue/contract validation, compact reapproval when price bands drift, and immediate broker-truth reconciliation.

## Target operator flow
1. System analyses holdings, targets, cash, approved instruments, contract identity, venue status, and live pricing posture.
2. System proposes one bounded basket with per-leg instrument, quantity, venue, and price band.
3. Operator gives one approval envelope for the basket.
4. Execution runs leg-by-leg.
5. Failures on one leg do not block the others.
6. If a price band is no longer realistic, the system proposes a compact revised band for approval.
7. The repo state and reports reconcile automatically after execution.

## Planned phases

### Phase 183A — Basket approval envelope
- Add a durable approval artifact to store one basket approval with per-leg bounds, attempts, and execution policy.
- Acceptance: a single approved basket can be loaded as execution input independently of `trades.md` row ambiguity.

### Phase 183B — Basket proposal artifact generation
- Add a proposal generator that emits a technically executable basket only after contract/venue/readiness checks pass.
- Acceptance: the proposed basket contains per-leg identity, quantity, price band, and venue metadata ready for operator approval.

### Phase 183C — Per-leg execution runner
- Add a runner that executes approved basket legs independently and continues when unrelated legs fail.
- Acceptance: one failed/closed leg does not stop open/valid legs from executing.

### Phase 183D — Price-band drift and compact reapproval
- Add band realism checks and a compact reapproval artifact when the approved band is stale.
- Acceptance: the system requests a minimal band update instead of a full new basket approval.

### Phase 183E — Reconciliation and reporting hardening
- Automatically reconcile broker truth, trade logs, holdings, and dashboard after each basket run.
- Acceptance: broker truth becomes the durable source reflected across repo surfaces without manual cleanup.

## Cross-phase constraints
- Preserve explicit live-trading safety gates.
- Never exceed approved per-leg limits or attempt counts.
- Never let one leg failure poison the whole basket.
- Prefer broker truth over inferred repo state.
- Keep tests alongside implementation in every phase.
- Commit each phase plan before implementation.
- Push completed phase work to remote before continuing.

## Risks / dependencies
- Existing workspace is dirty; phase commits must be intentionally scoped.
- Current report-generation surfaces are noisy and may require additional reconciliation cleanup during later phases.
- Existing `trades.md` semantics are overloaded; new basket artifacts should coexist safely before any larger migration.

## Global acceptance criteria
- One operator approval can authorize a basket of independent legs.
- Execution can partially succeed cleanly.
- Out-of-band prices trigger compact reapproval, not chaotic retries.
- Broker rejections are classified per leg.
- Repo truth converges automatically after basket execution.
