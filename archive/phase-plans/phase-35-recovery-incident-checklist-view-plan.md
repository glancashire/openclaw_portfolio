# Phase 35 — Recovery / incident checklist view plan

## Goal
Add a generated recovery / incident checklist view that turns existing blockers, operator queue items, broker/reporting posture, and recent material events into an explicit operator-facing incident workflow artifact.

## Why this next
The expanded specification still explicitly calls for:
- recovery / incident outputs that clearly tell the operator what to do next
- a recovery / incident checklist view
- simpler operator recovery paths
- daily operating flow that includes inspecting blockers and pending approvals before acting

The repo already has the underlying signals:
- structured per-portfolio summaries (`summary.json`)
- unified operator queue items
- decision-oriented reports
- multi-portfolio overview artifacts
- per-portfolio static HTML summary pages

What is still missing is a dedicated recovery-oriented surface that translates those signals into a concrete step-by-step checklist for operators.

## Scope checklist
- [ ] Update roadmap/progress docs to record Phase 35 as the new current focus
- [ ] Define a stable recovery checklist artifact shape from existing summary/operator-queue inputs
- [ ] Generate a per-portfolio recovery checklist artifact in Markdown
- [ ] Generate a per-portfolio recovery checklist HTML page for control-UI/operator consumption
- [ ] Include explicit sections for incident summary, active blockers, queue-driven actions, verification checks, and completion criteria
- [ ] Ensure the checklist degrades cleanly when a portfolio has no active incidents
- [ ] Add focused verification for recovery checklist generation/content
- [ ] Generate and inspect at least one representative recovery checklist artifact

## Implementation notes
- Reuse the existing summary and operator-queue model instead of creating a separate hidden incident state store.
- Keep the checklist deterministic and static; do not require a JS runtime.
- Prefer explicit operator language: what happened, why it matters, what to do now, and how to confirm recovery.
- Keep the artifact aligned with dashboard/report/summary terminology so operators do not need to translate concepts.
- Treat broker degradation, stale reporting, blocked activation, and pending approvals as distinct incident/action patterns when deriving checklist steps.

## Verification
- [ ] extend focused reporting/summary tests for recovery checklist artifacts
- [ ] regenerate representative portfolio artifacts and inspect checklist HTML directly
- [ ] verify checklist output remains aligned with summary/operator queue state

## Exit criteria
Phase 35 is complete when each portfolio can produce a static recovery / incident checklist artifact that clearly explains operator actions and recovery verification steps, and focused verification passes.
