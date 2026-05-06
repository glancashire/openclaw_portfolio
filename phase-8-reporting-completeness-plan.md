# Phase 8 — Reporting completeness and polish plan

## Goal
Make weekly, monthly, and quarterly reports more trustworthy by ensuring all required sections are present, tightening narrative consistency, and surfacing report-generation failure details more clearly.

## Scope for this phase
- Verify report section coverage against the current reporting template expectations.
- Improve operator-facing narrative text so reports describe current execution/reporting state more consistently.
- Surface PDF/render fallback or failure details directly in report-generation outputs.
- Add focused tests for section completeness, narrative consistency, and failure metadata.
- Update progress docs when verified.

## Actionable checklist
- [ ] Inspect current report generator, report cycle script, and existing reporting tests for remaining gaps.
- [ ] Add explicit completeness/failure metadata to report-generation outputs.
- [ ] Tighten weekly/monthly/quarterly report narrative consistency.
- [ ] Add focused tests for:
  - [ ] required report sections are present
  - [ ] narrative text reflects execution/freshness state consistently
  - [ ] report generation exposes render mode/failure metadata clearly
- [ ] Run the targeted reporting test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused `scripts/test-reporting-completeness.js`
- Existing dashboard/report/execution summary tests
