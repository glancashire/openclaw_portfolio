# Phase 212 Plan — Operator Docs Refresh

## Objectives
- Bring operator docs up to date with the implemented dashboard/reporting/email/self-heal/runtime-cleanup behavior.
- Add the missing Phase 212 documentation promised in the roadmap so a new operator can understand the current system from docs alone.
- Refresh `TOOLS.md` local invariants where implementation reality has advanced beyond the old phase notes.
- Keep docs concrete and operational: commands, data sources, safety gates, and expected outputs.

## Risks / Dependencies
- The repo contains both historical phase plans and newer implementation; docs must describe current behavior, not roadmap intent that changed during delivery.
- Execution and broker docs can become unsafe if they imply automation beyond the implemented approval gates.
- Some older runbook examples may still reference earlier basket flows; updates should preserve the explicit approval boundary and read-only/dry-run posture where applicable.
- Documentation contract tests already exist, so wording/section changes need to remain compatible with current doc expectations.

## Actionable Checklist
- Inspect current implementation surfaces for dashboard/reporting/self-heal/email-digest/runtime cleanup commands and outputs.
- Update `docs/basket-execution-runbook.md` to reflect the current dashboard/recovery/reporting context and current helper commands.
- Add `docs/dashboard-v2.md` covering overview, daily summary, delivery status, approvals queue, cron health, instrument health, and data sources.
- Add `docs/self-heal-recipes.md` documenting classification, healed/open issue outputs, recipes, and conservative boundaries.
- Add `docs/email-digest.md` covering digest CLI, schedule, subject lines, sections, and dry-run/send behavior.
- Update `TOOLS.md` notes for the Phase 204c sandbox invariant, delivery caveats, and the new runtime cleanup command/scope.
- Run doc contract tests plus full `npm test`.

## Acceptance Criteria
- The missing Phase 212 docs exist and describe the implemented system accurately.
- The basket execution runbook reflects current operator-visible flows and helper commands.
- `TOOLS.md` captures the validated cron/runtime cleanup invariants now in force.
- Doc contract tests and the full test suite pass.
- Phase plan is committed before documentation edits; final doc changes are committed and pushed after verification.
