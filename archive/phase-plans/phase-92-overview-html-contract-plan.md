# Phase 92: Overview HTML contract plan

## Goal
Strengthen the generated overview HTML contract by explicitly asserting that the rendered HTML contains the open-runner first-handoff and retry labels together with populated portfolio row content.

## Scope
- inspect current generated overview HTML assertions
- add focused HTML-level checks for headings/row content
- keep behavior unchanged

## Non-goals
- HTML redesign
- new overview behavior
- broker/runtime changes

## Implementation steps
1. Inspect the current generated overview HTML assertions.
2. Add focused checks for open-runner column labels and populated row content.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Prefer stable labels and row snippets over brittle full-table HTML matching.
