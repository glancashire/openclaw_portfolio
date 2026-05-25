# Phase 162 — Investor Report Follow-up Fixes Plan

## Objectives
- Fix the weekly investor overview so the top management summary and held-instruments section do not render empty when real summary data is sparse or missing.
- Remove the `Supporting detail` section from the investor-facing portfolio email output.
- Make the management-summary pills in the fill / purchase notification render at a consistent visual height.
- Preserve health report behavior unchanged, since that report was approved.

## Risks / Dependencies
- The weekly investor overview currently depends on generated summary artifacts; sparse upstream fields may require fallback logic rather than template-only changes.
- Removing `Supporting detail` could affect tests or downstream assumptions that still expect the summary body to be present in email output.
- Pill-height normalization in the fill notification should not break responsive layout or wrap behavior.
- Generated artifacts may drift during verification and should only be committed if they are clearly phase-owned.

## Actionable Checklist
- [ ] Inspect the current weekly report generation path to determine why management summary and held instruments are empty in the sample email.
- [ ] Add/update regression tests covering non-empty fallback summary text, non-empty held-instruments output when holdings data exists, omission of `Supporting detail`, and consistent fill-summary pill styling.
- [ ] Implement fallback logic in the investor portfolio email path so missing summary fields degrade gracefully instead of rendering empty sections.
- [ ] Remove the `Supporting detail` card/section from the investor-facing portfolio email HTML/text output.
- [ ] Update fill notification badge/pill styling so the management-summary pills share the same visual height.
- [ ] Run focused report/notification tests until green.
- [ ] Run full `npm test`, clean unrelated churn, and commit/push the finished phase.

## Acceptance Criteria
- Weekly investor overview management summary is never blank and gives a useful fallback message.
- Held instruments section no longer appears empty when holdings exist in the available source data; otherwise it states unavailability clearly instead of looking broken.
- `Supporting detail` is omitted from the investor-facing portfolio email output.
- Fill notification management-summary pills render at consistent height.
- Focused tests pass, followed by a successful full `npm test` run with no regressions.
