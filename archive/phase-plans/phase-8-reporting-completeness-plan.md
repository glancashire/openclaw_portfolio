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
- [x] Inspect current report generator, report cycle script, and existing reporting tests for remaining gaps.
- [x] Add explicit completeness/failure metadata to report-generation outputs.
- [x] Tighten weekly/monthly/quarterly report narrative consistency.
- [x] Add focused tests for:
  - [x] required report sections are present
  - [x] narrative text reflects execution/freshness state consistently
  - [x] report generation exposes render mode/failure metadata clearly
- [x] Run the targeted reporting test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused `scripts/test-reporting-completeness.js`
- Existing dashboard/report/execution summary tests

## Verified outcomes
- Report outputs now include explicit generation-status metadata covering markdown/pdf/html/render warning state.
- Weekly/monthly/quarterly report narratives now describe execution, freshness, and broker-readiness state more consistently.
- The report-generation CLI now awaits async completion correctly instead of printing a raw Promise.
- Existing reporting and execution verification remain green after the changes.
