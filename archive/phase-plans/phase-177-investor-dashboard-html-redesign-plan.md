# Phase 177 — Investor Dashboard HTML Redesign Plan

## Goal
Replace the current plain `portfolio/*/summary.html` rendering with a true investor-grade dashboard surface that is visually appealing, hierarchy-driven, CHF-first, and still preserves the operational detail and testable contract required by the existing portfolio-manager workflow.

## Scope
- Add a dedicated HTML renderer for portfolio summary artifacts in `src/reporting/summaryArtifacts.js`
- Keep `summary.md` / markdown generation intact while decoupling `summary.html` from the generic markdown-to-basic-html styling
- Lead with investor-facing headline metrics and management summary
- Add color, card hierarchy, and allocation visual bars / mini-chart treatment
- Preserve required operational sections so existing diagnostics remain visible
- Update tests to validate the new HTML surface honestly
- Regenerate the live ETF summary artifact and send a test version by email

## Design requirements
- Investor-first visual hierarchy: headline value, CHF gain since purchase, cash, top blocker, next action
- Strong but restrained color palette with clear positive / warning / blocked semantics
- Card-based layout with spacing and readability suitable for email/web viewing
- Allocation visuals that are understandable at a glance
- Important summary and next action first; lower-priority diagnostics later
- Maintain required contract signals: queue summary, execution posture, observability, contract intelligence, and explanatory sections

## Implementation plan
1. Add a dedicated `renderPortfolioSummaryHtml(summary)` renderer in `src/reporting/summaryArtifacts.js`
2. Route `summary.html` generation through that renderer instead of `markdownToBasicHtml(markdown)`
3. Preserve or reintroduce required sections/phrases covered by `scripts/test-structured-summary-artifacts.js`
4. Update/add tests only where expectations must change for the improved surface
5. Regenerate artifacts and verify the live ETF summary HTML renders the new hierarchy
6. Send a test email preview to `lancashire@swift.ch`

## Verification
- `node scripts/test-structured-summary-artifacts.js`
- Any adjacent targeted tests needed if the HTML contract changes
- Direct inspection of `portfolio/etf/summary.html`
- Test email delivery confirmation via Mailgun response

## Out of scope
- Reworking health-report HTML in this phase
- Reworking multi-portfolio overview pages unless needed for shared helper safety
- Changing portfolio semantics or execution logic unrelated to dashboard presentation
