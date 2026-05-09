# Phase 98: Overview markdown identity contract plan

## Goal
Strengthen the generated overview markdown contract by explicitly asserting stable page identity and section-anchor labels in `portfolio-overview.md`.

## Scope
- inspect current generated overview markdown identity assertions
- add focused checks for title/section labels
- keep behavior unchanged

## Non-goals
- markdown redesign
- new overview behavior
- broker/runtime changes

## Implementation steps
1. Inspect the current generated overview markdown identity assertions.
2. Add focused checks for page title and stable section labels.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Prefer stable section labels over brittle full-document markdown matching.
