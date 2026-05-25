# Phase 53 Actionable Checklist

## Goal
Reduce duplicate/hard-coded code and consolidate docs into a clearer maintained set.

## Checklist
- [x] Scan `src/`, `lib/`, and `scripts/` for obvious duplicate or hard-coded logic
- [x] Refactor the safest duplicate logic into shared helpers
- [x] Remove remaining hard-coded live-path trade source patterns where applicable
- [x] Review all files under `docs/`
- [x] Consolidate active docs into clear topical documents
- [x] Remove or archive obsolete docs
- [x] Add/update `docs/migration_learnings.md` only if it is relevant to this repo
- [x] Add or update tests for refactored logic
- [x] Run targeted tests
- [x] Fix failures until green
- [x] Commit and push

## Target test gates
- `node tests/test-tradeState.js`
- `node tests/test-portfolioExecution.js`
- `node scripts/test-market-open-trade-row-selection.js`
- `node scripts/test-trading-guards.js`
- `node scripts/test-writable-live-lane-acceptance.js`

## Done when
- duplicated core logic is reduced safely
- docs are clearer and smaller
- no tested behavior regresses
- all targeted tests pass
