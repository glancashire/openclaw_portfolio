# Phase 7B — Cron health and guided remediation truth

Status: active  
Last updated: 2026-06-01 UTC

## Objectives
- Make cron-health surfaces truthful even when gateway cron inspection fails or returns partial data.
- Tighten operator-facing remediation language so conservative/advisory behavior is explicit instead of implying broad autonomous healing.
- Preserve existing self-heal internals where useful, but improve dashboard/reporting wording and status classification at the human-facing edge.
- Reconcile roadmap/open-phase docs so Phase 7 reflects the actual remaining scope rather than aspirational automation.

## Risks / dependencies
- Cron inspection currently fails closed to an empty list; changing that must not break existing dashboard/report generation.
- Operator-facing wording appears in multiple generated surfaces; over-broad renames could create churn without improving clarity.
- Runtime artifact tests may be sensitive to small wording changes and will need targeted fixture refreshes or assertion updates.
- Keep the automation boundary conservative: no new autonomous trading, approval bypass, login forcing, or destructive recovery actions.

## Actionable checklist
- [ ] Inspect cron-health fetch + summary/reporting seams for missing degraded-state detail.
- [ ] Add tests first for cron fetch failure/partial-state visibility and guided-remediation wording.
- [ ] Implement bounded cron-health status reporting that distinguishes unavailable/empty/healthy/degraded states.
- [ ] Update human-facing summary/reporting text from implied self-heal automation toward guided remediation where that is more truthful.
- [ ] Reconcile roadmap/open-phase docs to mark completed vs still-evaluative work accurately.
- [ ] Run targeted verification, then broader regression checks.
- [ ] Commit the phase plan before implementation.
- [ ] Commit completed implementation and push.

## Acceptance criteria
- Cron-health surfaces no longer silently look healthy/empty when cron inspection failed.
- Operator-facing remediation wording is more truthful about advisory/manual boundaries.
- Tests cover the new cron-health status behavior and wording-sensitive reporting outputs.
- Phase docs reflect reality: conservative guided remediation is implemented; broader automation remains intentionally unshipped unless proven safe.
- No regressions in existing reporting/digest/dashboard generation.

## Notes
- Prefer targeted operator-facing wording changes over broad internal renames unless repo evidence shows rename value is worth the churn.
- If partial cron data cannot be represented safely, surface unavailability explicitly instead of fabricating job health.
