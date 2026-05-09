# Phase 97: Overview HTML title contract plan

## Goal
Strengthen the generated overview HTML contract by explicitly asserting stable top-level page identity markers so the artifact remains easy to validate as a dedicated overview surface.

## Scope
- inspect current generated overview HTML identity assertions
- add focused checks for title/section anchors
- keep behavior unchanged

## Non-goals
- HTML redesign
- new overview behavior
- broker/runtime changes

## Implementation steps
1. Inspect the current generated overview HTML identity assertions.
2. Add focused checks for the page title and stable section labels.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Prefer stable section labels over brittle full-document HTML matching.
