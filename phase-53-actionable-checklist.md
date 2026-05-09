# Phase 53 Actionable Checklist

## Goal
Reduce duplicate/hard-coded code and consolidate docs into a clearer maintained set.

## Checklist
- [ ] Scan `src/`, `lib/`, and `scripts/` for obvious duplicate or hard-coded logic
- [ ] Refactor the safest duplicate logic into shared helpers
- [ ] Remove remaining hard-coded live-path trade source patterns where applicable
- [ ] Review all files under `docs/`
- [ ] Consolidate active docs into clear topical documents
- [ ] Remove or archive obsolete docs
- [ ] Add/update `docs/migration_learnings.md` only if it is relevant to this repo
- [ ] Add or update tests for refactored logic
- [ ] Run targeted tests
- [ ] Fix failures until green
- [ ] Commit and push

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
