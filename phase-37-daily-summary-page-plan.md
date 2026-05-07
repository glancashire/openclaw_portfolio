# Phase 37 — One daily summary page plan

## Goal
Add a single daily summary page artifact that gives the operator one compact surface for overall portfolio health, cash waiting to deploy, biggest drift, approval status, broker/reporting health, and the recommended next step.

## Why this next
The expanded specification still explicitly calls for "one daily summary page" that says:
- portfolio healthy / warning / blocked
- cash waiting to deploy
- biggest drift today
- whether any trade needs approval
- whether broker/reporting is healthy
- what I should do next

The repo already has most of the underlying ingredients across summary artifacts, dashboards, overview pages, and approval/recovery surfaces, but it does not yet expose them as one dedicated daily operator page.

## Scope checklist
- [ ] Update roadmap/progress docs to record Phase 37 as the new current focus
- [ ] Define a stable daily summary artifact shape from existing summary/overview/approval signals
- [ ] Generate a repo-level daily summary JSON artifact
- [ ] Generate Markdown and HTML daily summary page outputs
- [ ] Include health, cash-to-deploy, biggest drift, approval state, broker/reporting health, and next-step sections
- [ ] Keep the page compact and skimmable for daily operator use
- [ ] Add focused verification for daily summary generation/content
- [ ] Generate and inspect at least one representative daily summary page artifact

## Implementation notes
- Reuse current per-portfolio summary and overview artifacts instead of adding hidden state.
- Prefer one repo-level daily page that highlights the most important active portfolio actions.
- Keep terminology aligned with dashboard, operator queue, approvals queue, and recovery checklist surfaces.
- Render deterministically without a JS runtime.

## Verification
- [ ] extend focused overview/reporting tests for daily summary outputs
- [ ] regenerate overview artifacts and inspect the daily summary HTML directly
- [ ] verify daily summary values stay aligned with portfolio summaries and approval queue state

## Exit criteria
Phase 37 is complete when the repo can generate a compact daily summary page artifact that matches the explicit spec bullets and focused verification passes.
