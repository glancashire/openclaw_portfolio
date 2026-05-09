# Phase 39 — Report history and navigation plan

## Goal
Add a generated report-history surface so operators can quickly see what reports exist per portfolio, when they were generated, and which artifacts are available, instead of navigating raw folders manually.

## Why this next
This phase is directly grounded in the expanded specification's UI requirements, which explicitly call out report history as a renderable control-UI surface. The repo already generates markdown/html/pdf reports, but there is not yet a dedicated report-history artifact that summarizes them cleanly.

## Scope checklist
- [ ] Mark Phase 39 as current in progress docs
- [ ] Build a report-history collector that scans generated report artifacts per portfolio
- [ ] Generate structured report-history JSON for UI/digest consumption
- [ ] Generate Markdown and HTML report-history views for operator review
- [ ] Thread report-history links/summary into overview surfaces where helpful
- [ ] Add focused tests for collection, rendering, and generated artifacts
- [ ] Generate and inspect representative report-history artifacts

## Implementation notes
- Reuse existing report directories and naming conventions; do not invent hidden storage.
- Prefer a simple summary model: portfolio, period, basename/date, available formats, paths.
- Keep the first version static and auditable.
- Avoid mutating report content itself in this phase; focus on discoverability/navigation.

## Verification
- [ ] test direct report-history collection helpers
- [ ] test generated JSON/Markdown/HTML artifacts
- [ ] inspect representative output against current report folders

## Exit criteria
Phase 39 is complete when operators can open one generated report-history surface and understand what recent report artifacts exist across portfolios without browsing the filesystem directly.
