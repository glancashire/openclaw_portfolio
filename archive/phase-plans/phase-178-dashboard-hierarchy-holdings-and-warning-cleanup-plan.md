# Phase 178 — Dashboard Hierarchy, Holdings Detail, and Warning Cleanup

## Goal
Refine the investor dashboard so it reads cleanly and truthfully: remove duplicated top-of-page information, add an effective holdings table with quantity/price/value/CHF value plus total, move allocation lower in the page hierarchy, and eliminate obsolete warning language related to CSPX.

## Scope
- Remove redundant repetition between the hero, KPI cards, and management summary
- Add an effective holdings section that shows per-holding quantity, local price, local value, CHF value, and a portfolio total
- Move allocation visuals/details below the more immediately useful holdings and action sections
- Remove obsolete or misleading CSPX warning content when it no longer reflects the current effective state
- Preserve required operational contract sections and keep the artifact test suite green

## Implementation plan
1. Inspect the current summary model to find the best source for effective holding rows and obsolete warning text
2. Simplify the top hero/KPI/management summary hierarchy so each block has a distinct purpose
3. Add an effective holdings table to `src/reporting/summaryArtifacts.js`
4. Move allocation bars/table below the holdings and action sections
5. Suppress or rewrite obsolete CSPX warning/event surfacing so the dashboard reflects current truth rather than stale noise
6. Regenerate ETF artifacts and validate both contract tests and rendered output

## Verification
- `node scripts/test-structured-summary-artifacts.js`
- Add or update focused summary-artifact assertions if needed
- Regenerate `portfolio/etf/summary.html` and inspect the holdings section and warning cleanup

## Out of scope
- Changing portfolio execution logic beyond what is needed to present truthful current dashboard state
- Reworking report-email templates in this phase
