# Phase 38 — Better why explanations plan

## Goal
Improve operator-facing explanation quality so summary, approval, recovery, and reporting surfaces say why drift exists, why no trade was proposed, and why execution is blocked in plain English instead of relying mostly on terse status labels.

## Why this next
The expanded specification explicitly calls for better "why" explanations, including examples like:
- why a drift is outside bounds
- why no trade was proposed
- why execution is blocked because data is stale

The repo already has the raw signals needed for these explanations:
- allocation drift status
- execution posture and approvals
- safety blockers
- broker/reporting freshness posture
- recovery and approval queue artifacts

But those surfaces still lean too much on compact status summaries and not enough on explicit explanation text.

## Scope checklist
- [ ] Update roadmap/progress docs to record Phase 38 as the new current focus
- [ ] Define explanation helpers for the core operator cases: drift, no-trade posture, stale/blocking execution, and approval backlog
- [ ] Add explicit "why" text into structured summaries where it can be reused by other artifacts
- [ ] Surface those explanations in daily summary, approvals queue, recovery checklist, and/or reports where most useful
- [ ] Keep explanations deterministic and grounded in already-available data
- [ ] Add focused verification for explanation generation and rendering
- [ ] Generate and inspect representative artifacts showing the improved explanations

## Implementation notes
- Prefer a small shared explanation helper layer over hard-coded strings scattered across many files.
- Reuse existing summary data instead of adding hidden reasoning state.
- Keep wording plain-English and operator-friendly.
- Avoid inventing causes that are not supported by current artifact state.

## Verification
- [ ] extend focused summary/overview/reporting tests to assert explanation text presence and alignment
- [ ] regenerate representative artifacts and inspect the explanation rendering directly
- [ ] verify explanation text stays consistent with queue/blocker/summary state

## Exit criteria
Phase 38 is complete when the main operator-facing artifacts include clearer plain-English why explanations for drift, blocked execution, approval backlog, and no-trade / degraded posture where applicable, and focused verification passes.
