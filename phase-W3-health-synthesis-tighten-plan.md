# Phase W3 — Health synthesis tightening (Roll-up D)

**Goal:** Make `summarizeHealthTrends` accurately classify and describe the system's health trajectory, including the `degraded` state that currently falls through to a misleading "stable + healthy" summary.

## Objectives
1. Handle `degraded` health state in the direction classifier (it's a distinct state between `healthy` and `blocked`)
2. Produce accurate plain-language trend summaries that don't claim "healthy" when the system is consistently degraded
3. Add regression tests covering all direction classifications
4. Keep the existing `direction` taxonomy: `stable`, `improving`, `worsening`, `watching`, `unknown`
5. Tick Roll-up D "tighten" item

## Risks / dependencies
- Other code (dashboards, email templates, investor reports) consumes `trends.direction` and `trends.summary`. Changes must be backward-compatible (same field names, same direction values).
- `degraded` with `severity: low` and `nextAction: "No immediate operator action"` is intentionally NOT `blocked`. The classifier should reflect that: a consistent `degraded` run should be `watching` or `stable-degraded`, not `worsening`.

## Actionable checklist
- [ ] Read the health classifier to understand the full `health` taxonomy (healthy, degraded, attention_needed, blocked)
- [ ] Patch `summarizeHealthTrends`:
  - Count `degraded` separately (currently lumped into neither healthy nor blocked)
  - If all recent events are `degraded` with low severity → direction = `watching` (not `stable`)
  - If latest is `degraded` and improving from `blocked` → direction = `improving`
  - Summary text must mention the actual state, not claim "healthy"
- [ ] Write `scripts/test-health-trend-synthesis.js`:
  - All-healthy → `stable` + correct summary
  - All-degraded → `watching` + correct summary
  - Mix blocked/degraded → `worsening` + correct summary
  - Improving (blocked → healthy) → `improving`
  - Edge: empty events → `unknown`
- [ ] Wire test into verifyRepoChecks
- [ ] Run npm test to ensure green
- [ ] Close Roll-up D item
- [ ] Commit + push

## Acceptance criteria
- Real health report now says `watching` (not `stable`) given all-degraded input
- Summary text accurately describes the degraded posture
- 5+ new assertions in the trend synthesis test
- `npm test` exit 0
- Roll-up D checked off
