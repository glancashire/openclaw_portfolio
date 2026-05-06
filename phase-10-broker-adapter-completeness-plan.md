# Phase 10 — Broker adapter completeness audit plan

## Goal
Harden the Interactive Brokers adapter surface by auditing remaining edge cases, making unsupported live-write behavior more explicit, and improving operator-facing normalization/diagnostics without breaking the read-only-first MVP posture.

## Scope for this phase
- Inspect broker client, readiness, and related workflow callers for spec gaps.
- Tighten normalization or diagnostics around broker-path responses where ambiguity remains.
- Surface intentionally unsupported or degraded live-write behavior more clearly.
- Add focused tests for audited broker edge cases.
- Update progress docs when verified.

## Actionable checklist
- [ ] Inspect broker adapter surface and existing broker-path tests for remaining gaps.
- [ ] Tighten adapter normalization / diagnostics where operator-facing ambiguity remains.
- [ ] Surface unsupported or degraded live-write paths more explicitly.
- [ ] Add focused tests for:
  - [ ] normalized broker-path edge-case reporting
  - [ ] explicit unsupported live-write behavior surfacing
  - [ ] compatibility with existing execution/readiness flows
- [ ] Run the targeted broker audit test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused broker-audit regression test(s)
- Existing Interactive Brokers / execution verification scripts
