# Phase 40 — More beautiful and useful reports plan

## Goal
Improve the visual quality and readability of generated HTML reports so they feel like something an operator would actually want to read, not just archive. This addresses spec section 12.5 directly.

## Why this next
The expanded specification explicitly says: "I would want reports that feel like something I would actually read, not just archive." The current HTML reports use a minimal generic stylesheet and basic structure. This phase improves the presentation layer without changing the underlying data model.

## Scope checklist
- [ ] Improve the shared HTML template/stylesheet used by `markdownToBasicHtml()` in `pdfExport.js`
- [ ] Add visual hierarchy: better heading styles, spacing, color accents for status/severity
- [ ] Add status badges/indicators for health, drift, and queue severity in HTML output
- [ ] Improve table readability: alternating row colors, better padding
- [ ] Add a compact header/metadata bar at the top of reports
- [ ] Ensure the improved styling applies consistently across all generated HTML artifacts (summary, recovery, daily, approvals, report-history, reports)
- [ ] Add focused verification that the improved styling elements are present in generated HTML
- [ ] Generate and inspect representative artifacts

## Implementation notes
- Keep changes in the shared `markdownToBasicHtml()` stylesheet and structure so all HTML artifacts benefit.
- Do not add external dependencies (CDNs, JS frameworks). Keep it self-contained CSS.
- Prefer subtle, professional styling over flashy design.
- Use semantic color hints: green for healthy, amber for warning, red for blocked/high severity.
- Keep the HTML valid and accessible.

## Verification
- [ ] test that generated HTML contains improved style elements
- [ ] inspect representative artifacts visually (summary, daily, report-history)
- [ ] ensure existing tests still pass (no regressions)

## Exit criteria
Phase 40 is complete when generated HTML artifacts use a noticeably improved stylesheet with better visual hierarchy, status indicators, and table styling, and all existing tests pass.
