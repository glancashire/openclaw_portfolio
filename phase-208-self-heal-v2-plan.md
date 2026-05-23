# Phase 208 Plan — self-heal v2

## Objectives
- Replace the current text-only self-heal plan with structured classification output that can drive conservative, testable heal recipes.
- Add observability event logging for health-check runs and classified failures.
- Surface `classified`, `healed`, and `openIssues` in the health-check output contract.
- Keep all auto-remediation idempotent and bounded to safe local operations.

## Risks / Dependencies
- Existing health/reporting flows already write mutable runtime artifacts; new event logging must avoid breaking current dashboards or tests.
- Some intended remediations from the roadmap touch external systems or operator approval boundaries; those must remain recommendations/open issues rather than unsafe automation.
- Runtime directories may not exist in isolated tests; all recipes/logging must create directories lazily.

## Actionable Checklist
- [ ] Inspect current `portfolioHealth` and `healthReport` flow to find the smallest safe extension points.
- [ ] Implement structured failure classification and safe heal recipes.
- [ ] Add event-log append/read helpers under runtime observability.
- [ ] Extend health-check/report output to include `classified`, `healed`, and `openIssues`.
- [ ] Add focused unit/integration/regression tests for classification, heal recipes, event logging, and CLI output.
- [ ] Run focused tests, then full repo verification.
- [ ] Commit implementation and push.

## Acceptance Criteria
- `node scripts/run-health-check.js portfolio/etf --dry-run` returns structured self-heal classification data.
- A healing run returns explicit arrays for `classified`, `healed`, and `openIssues`.
- Safe recipes are idempotent and test-covered.
- Observability events are written to `runtime/observability/event-log.jsonl` without breaking existing flows.
- Focused self-heal tests and full `npm test` pass.
