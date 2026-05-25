# Phase 55 — Command and Script Surface Cleanup

## Goal
Reduce stale command and script surface area so the active workflow is easier to find and harder to misuse.

## Focus
This phase targets obvious drift in `scripts/`, `docs/`, and the operator command path. It avoids risky feature rewrites and focuses on safe cleanup.

## Checklist
- [ ] Identify stale or obsolete command wrappers still visible to operators
- [ ] Replace or fail clearly any wrapper that should not be used
- [ ] Remove duplicate guidance from docs where a single active command already exists
- [ ] Tighten command help text so active paths are obvious
- [ ] Add/update tests for the intended command surface
- [ ] Run targeted tests
- [ ] Fix failures until green
- [ ] Commit and push

## Candidate cleanup areas
- `scripts/execute-trades.js`
- `scripts/trade.js`
- `scripts/submit-orders-at-open.js`
- `docs/trading-workflow.md`
- `docs/operator-runbooks.md`

## Acceptance criteria
- stale wrappers are clearly retired or removed
- docs point to the active entrypoints only
- tests covering the command surface pass
