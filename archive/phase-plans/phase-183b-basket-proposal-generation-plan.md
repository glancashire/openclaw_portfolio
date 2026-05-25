# Phase 183B — Basket Proposal Artifact Generation Plan

## Objectives
- Generate a single operator-facing basket proposal from portfolio targets, holdings, cash, approved instruments, and live contract identity.
- Emit a technically executable basket only after contract, venue, and readiness checks pass.
- Include per-leg instrument identity, quantity, price band, venue, retry policy, and rationale.
- Keep proposal generation separate from live execution so the operator approves a clean basket, not ad hoc rows.

## Risks / dependencies
- Basket pricing must not silently drift beyond reasonable bounds before approval.
- Contract resolution can fail for individual instruments, and that should block only the affected leg.
- The current repo already has multiple proposal sources; the new artifact should be additive and unambiguous.
- Proposal generation must not mutate live trade state.

## Actionable checklist
- [ ] Define basket proposal artifact shape and storage path.
- [ ] Build proposal generation from approved instruments + holdings + cash.
- [ ] Incorporate live contract/readiness checks before marking a leg executable.
- [ ] Carry forward leg-level retry policy and approval bounds from the envelope model.
- [ ] Add unit tests for proposal shaping and leg inclusion/exclusion.
- [ ] Add regression tests for contract-missing, venue-blocked, and stale-price cases.
- [ ] Run targeted tests, then repo verification.

## Acceptance criteria
- The system can create a single basket proposal with multiple independent legs.
- Each leg has an explicit limit band, venue, and rationale.
- Unresolved contract/venue issues exclude only the affected leg and are explained clearly.
- Proposal generation does not alter live execution state or trade logs.
