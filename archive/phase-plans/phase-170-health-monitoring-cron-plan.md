# Phase 170 — Health-monitoring cron scheduling and operational guardrails

## Goal
Wire the health-check + self-heal + highlighted email report flow into a durable scheduled health-monitoring job, with safe operational guardrails and operator-friendly status surfaces.

## Scope
- Add a scriptable cron registration/update path for the portfolio health check.
- Define a default health-monitoring schedule suitable for ongoing email reporting.
- Add guardrails for scheduled operation, including overlap avoidance where feasible and clear dry-run/real-send distinctions.
- Add a status/check surface so the operator can inspect the configured health-monitoring schedule.
- Add focused tests for cron payload/config creation and status reporting.
- Run a real cron registration/update flow and a real immediate health-monitoring execution for evidence.

## Non-goals
- No broker mutation or automated clearing of broker pause states.
- No bulk resend of historical events.
- No provider changes.

## Guardrails
- Scheduled job must call the canonical `scripts/run-health-check.js` surface.
- Unresolved/non-fixable issues must remain highlighted in the email report.
- Safe self-heal remains limited to local/reporting/runtime hygiene actions only.
- Scheduling should be auditable and easy to disable or update.

## Verification plan
- Add focused tests for schedule/config generation and status reporting.
- Verify cron registration/update behavior through the first-class cron tool.
- Run one immediate health-monitoring execution after registration and confirm result visibility.
