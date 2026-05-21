# Phase 183C — Per-Leg Execution Runner Plan

## Objectives
- Execute approved basket legs independently from a stored approval envelope.
- Continue through the basket when one leg fails for venue, permission, or contract reasons.
- Keep execution bounded by per-leg quantity, price, venue identity, and attempt count from the approval envelope.
- Record leg-level outcomes cleanly for later reconciliation and reporting.

## Risks / dependencies
- Existing execution code is trade-row-centric, so basket execution must avoid corrupting current trade-state assumptions.
- Broker submission failures can arrive asynchronously; the runner must preserve per-leg truth even when statuses race.
- Attempt tracking must be durable so retries do not exceed the approved envelope after restart.
- Closed or blocked venues must not abort unrelated open legs.

## Actionable checklist
- [ ] Define durable basket-run state artifact and leg-attempt tracking.
- [ ] Add envelope-to-executable-leg selection helpers.
- [ ] Add per-leg execution loop that continues on unrelated failures.
- [ ] Persist leg-level submitted / blocked / failed / filled-ready states.
- [ ] Add unit tests for selection, attempt caps, and continue-on-failure behavior.
- [ ] Add regression tests for one blocked leg not poisoning the rest.
- [ ] Run targeted tests, then repo verification.

## Acceptance criteria
- A stored basket approval can be executed leg-by-leg without relying on all-or-nothing portfolio state.
- One failed leg does not stop independent executable legs.
- Attempt counts are enforced durably per leg.
- Leg outcomes are persisted in a machine-readable artifact for later reconciliation.
