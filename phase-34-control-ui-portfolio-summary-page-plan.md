# Phase 34 — Control UI portfolio summary page plan

## Goal
Add a generated per-portfolio HTML summary page that renders the existing structured summary artifact into a future-control-UI-friendly operator view, so each portfolio has a directly consumable HTML surface alongside Markdown and JSON outputs.

## Why this next
The repo now has:
- structured per-portfolio summary JSON (`portfolio/<name>/summary.json`)
- repo-level overview JSON artifacts
- a multi-portfolio HTML overview page
- decision-oriented report output
- grouped onboarding workflow metadata

But the spec’s short-term UI artifact list still calls for "a renderable HTML summary page per portfolio," and that is the clearest remaining concrete UI/control-surface gap still named by the expanded specification.

## Scope checklist
- [ ] Update roadmap/progress docs to record Phase 34 as the new current focus
- [ ] Add a per-portfolio HTML summary generator that renders from `summary.json` / existing summary inputs
- [ ] Include operator-facing sections for status, holdings, queue, blockers, execution posture, recommendations, and onboarding workflow when present
- [ ] Keep the HTML output deterministic and readable without requiring a JS app runtime
- [ ] Wire generation into existing portfolio summary/reporting flow so the artifact is easy to refresh
- [ ] Add focused verification for the HTML summary output shape/content
- [ ] Generate and inspect at least one representative per-portfolio HTML summary artifact

## Implementation notes
- Reuse the existing summary artifact shape instead of creating a parallel page-only data model.
- Keep styling self-contained and lightweight.
- Prefer serverless/static rendering over interactive JS.
- Treat onboarding workflow as optional data: render it when present, degrade cleanly when absent.
- Keep dashboard/report/summary terminology aligned so operators are not forced to translate between surfaces.

## Verification
- [ ] node scripts/test-structured-summary-artifacts.js
- [ ] add and run a focused per-portfolio HTML summary verification test
- [ ] regenerate a representative portfolio summary artifact set and inspect the HTML directly

## Exit criteria
Phase 34 is complete when each portfolio can produce a static HTML summary page from the structured summary surface, the page exposes the key operator state cleanly, and focused verification passes.
