# Phase 32 — Decision-oriented reporting uplift plan

## Goal
Make generated portfolio reports faster to scan for decisions by separating decision-ready content from audit detail, highlighting changes since the previous report, assigning urgency to recommendations, and surfacing blocker/incident posture more explicitly.

## Scope checklist
- [ ] Update roadmap/progress docs to record Phase 31 completion and Phase 32 as current focus
- [ ] Separate executive decision content from audit/reference detail more clearly in report output
- [ ] Add a clear "what changed since last report" section based on current vs previous report-relevant state
- [ ] Add urgency labels to recommendations / next actions
- [ ] Add a stronger incident / blocker summary section in reports
- [ ] Keep report output deterministic and compatible with current generation flow
- [ ] Add focused tests for report structure, change-summary content, urgency labels, and blocker surfacing
- [ ] Regenerate a representative report artifact and inspect it directly

## Implementation notes
- Prefer additive report sections over destructive report-format churn.
- Reuse already available execution, delivery, queue, freshness, and summary signals before deriving new state.
- If prior-report comparison data is sparse, produce an explicit "no prior comparison available" style output instead of silently omitting the section.

## Verification
- [ ] node scripts/test-reporting-completeness.js
- [ ] node scripts/test-dashboard-command-center.js
- [ ] node scripts/test-structured-summary-artifacts.js
- [ ] node scripts/test-multi-portfolio-overview.js
- [ ] generate at least one representative report artifact and inspect it directly

## Exit criteria
Phase 32 is complete when reports clearly separate decision vs audit layers, summarize what changed since the previous report, label urgency, surface blockers/incidents prominently, and all focused verification passes.
