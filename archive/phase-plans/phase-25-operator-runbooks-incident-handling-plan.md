# Phase 25 — Operator runbooks and incident handling plan

## Goal
Make the portfolio-manager operable during degraded broker conditions, stale state, and execution incidents without relying on tribal knowledge. Operator actions should be documented, auditable, and backed by small helper surfaces where the current CLI flow is awkward.

## Scope for this phase
- Inspect the current approve / reject / resync / cancel / broker-error pause flows, dashboard/report surfacing, and current docs for operational gaps.
- Add a root-level operator runbook that covers the core operational workflows and incident classes in the repo’s existing execution model.
- Document expected trade-state transitions and failure modes with concrete examples that match the current scripts and Markdown artifacts.
- Add lightweight CLI/helpful script surfaces where they materially reduce operator ambiguity without introducing unsafe defaults.
- Tighten operator-action audit visibility in dashboard/report/Markdown-facing outputs.
- Add verification that documented operator workflows produce the expected evidence where practical.
- Update roadmap/progress/checklist docs to reflect the completed operational maturity work.

## Actionable checklist
- [x] Inspect current branch/repo state and operator workflow surfaces.
- [x] Create this Phase 25 plan file in repo root.
- [x] Commit the Phase 25 plan file.
- [ ] Write operator runbooks for approve / reject / resync / cancel / broker-error pause / recovery.
- [ ] Document expected state transitions and common failure/incident paths with examples.
- [ ] Add helpful operator CLI/scripting surfaces where the current flow is awkward.
- [ ] Improve operator-facing audit trail visibility in dashboard/report/Markdown artifacts.
- [ ] Add or update regression coverage for documented operator workflows.
- [ ] Run targeted operator-workflow tests plus the affected execution verification bundle.
- [x] Update roadmap/checklist/progress/status docs to mark Phase 25 accurately.
- [x] Commit completed Phase 25 implementation.
- [ ] Push commits if remote push is possible.

## Intended verification
- Focused operator workflow regression coverage for approval, rejection, cancel, resync, and broker-error pause/recovery evidence.
- Direct inspection of the new runbook and any CLI/help additions.
- Execution verification bundle still passes after audit/report/dashboard changes.
- Git diff/status evidence plus updated roadmap/docs.

## Expected outcomes
- An operator can recover common execution incidents without guessing at repo internals.
- Approval/rejection/cancel/resync flows are documented with exact commands, expected state changes, and failure notes.
- Dashboard/report/trade artifacts make recent operator actions and automation-paused states obvious.
- Verification covers the operational evidence the runbooks depend on.
