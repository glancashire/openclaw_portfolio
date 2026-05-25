# Phase 28 — Portfolio command-center dashboard plan

## Goal
Turn the per-portfolio dashboard into a true operator command center with clearer health posture, blockers, pending actions, material events, and one explicit best-next-step recommendation.

## Scope checklist
- [ ] Replace the current generic dashboard summary with the expanded command-center structure from `EXPANDED_PORTFOLIO_SPECIFICATION.md`
- [ ] Add a `Health Snapshot` section covering portfolio status, strategy status, broker health, sync/freshness, execution posture, delivery posture, pending approvals, and active blockers
- [ ] Add clearer `Portfolio Value Snapshot` fields using latest history/holdings state
- [ ] Keep allocation and instrument action sections, but make their labels more skimmable and action-oriented
- [ ] Add `Safety / Risk Diagnostics` with visible pause/degraded/stale states
- [ ] Add a unified `Pending Operator Actions` section with actionable text
- [ ] Add a `Recent Material Events` section derived from runtime events
- [ ] Add `Report / Delivery Status`
- [ ] Add one explicit `Recommended Next Step` section
- [ ] Improve severity/status labeling for readability
- [ ] Update roadmap/progress docs to reflect Phase 28 completion
- [ ] Add focused regression tests for dashboard structure/content

## Implementation notes
- Reuse existing freshness, delivery, lifecycle, safety, and runtime-event helpers where possible.
- Prefer adding normalized helper functions rather than embedding more formatting logic inline.
- Keep output Markdown-first and audit-friendly.

## Verification
- [ ] `node scripts/test-dashboard-command-center.js`
- [ ] `node scripts/test-dashboard-execution-summary.js`
- [ ] `npm run check:generated-state`
- [ ] direct regeneration of `portfolio/etf/dashboard.md`

## Exit criteria
Phase 28 is complete when the generated dashboard visibly matches the command-center intent, tests pass, and status docs are updated.
