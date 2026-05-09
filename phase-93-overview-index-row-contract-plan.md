# Phase 93: Overview index row contract plan

## Goal
Strengthen the `portfolio-index.json` row contract by explicitly asserting key row fields for active and demo-like portfolios, including the open-runner queue/retry counters already threaded into the index.

## Scope
- inspect current generated index-row assertions
- add focused checks for row shape and selected field values
- keep behavior unchanged

## Non-goals
- index schema redesign
- new overview behavior
- broker/runtime changes

## Implementation steps
1. Inspect the current `portfolio-index.json` assertions.
2. Add focused row-level checks for representative active/demo-like portfolios.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Assert stable fields and types, not every volatile recommendation string.
