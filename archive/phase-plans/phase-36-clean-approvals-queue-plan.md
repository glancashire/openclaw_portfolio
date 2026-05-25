# Phase 36 — Clean approvals queue plan

## Goal
Add a dedicated approvals queue artifact that groups pending approval items into one operator-facing surface with explicit urgency, explanation, effect if approved, and effect if ignored.

## Why this next
The expanded specification still explicitly calls for a clean approvals queue where pending approvals are grouped in one place with:
- urgency
- explanation
- effect if approved
- effect if ignored

The repo already has:
- unified operator queue items
- trade proposal / approval status in summaries
- multi-portfolio overview artifacts
- recovery checklist views

But it does not yet provide a dedicated approval-review surface that explains approval consequences cleanly for operators.

## Scope checklist
- [ ] Update roadmap/progress docs to record Phase 36 as the new current focus
- [ ] Define a stable approvals queue artifact shape using existing summary/operator-queue/proposal signals
- [ ] Generate a repo-level approvals queue JSON artifact
- [ ] Generate Markdown and HTML approvals queue views for operator/control-UI consumption
- [ ] Include urgency, explanation, effect if approved, and effect if ignored for each queue item
- [ ] Keep the queue focused on approval-gated actions rather than all operator tasks
- [ ] Add focused verification for approvals queue generation/content
- [ ] Generate and inspect at least one representative approvals queue artifact

## Implementation notes
- Reuse summary/operator-queue state instead of creating a separate approval state model.
- Limit the scope to approvals and approval-adjacent review items.
- Prefer plain-English consequence text over terse status labels alone.
- Keep artifacts deterministic and static.

## Verification
- [ ] extend focused artifact/reporting tests for approvals queue outputs
- [ ] regenerate representative overview artifacts and inspect approvals queue HTML directly
- [ ] verify approvals queue counts remain aligned with per-portfolio summaries

## Exit criteria
Phase 36 is complete when the repo can generate a dedicated approvals queue artifact with urgency and consequence framing, and focused verification passes.
