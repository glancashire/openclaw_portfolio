# Phase next-3 — Session-aware retry ergonomics

## Objectives
- Make executable row → prepared-order conversion explicit and reusable instead of duplicating row parsing in multiple execution paths.
- Keep timing-policy injection and live safeguards exactly as they are while giving dry-run and diagnostics flows the same normalized order view as live submission.
- Prove the shared helper is side-effect free and preserves venue/session metadata.

## Risks / dependencies
- Refactoring shared order-preparation code can accidentally alter live submission defaults if field precedence changes.
- Diagnostics and market-open submission consume slightly different row shapes, so the helper must tolerate both without silently dropping metadata.
- This phase must stay source/tests-only and must not touch approval or execution-state behavior.

## Actionable checklist
- [ ] Add failing/coverage-improving tests for reusable executable-row order preparation.
- [ ] Extract a shared helper into `src/execution/orderPreparation.js`.
- [ ] Route diagnostics and market-open submission through the shared helper.
- [ ] Verify dry-run/diagnostic flows remain side-effect free.
- [ ] Run focused tests, then full safe lane and `npm test`.
- [ ] Commit and push the completed phase.

## Acceptance criteria
- Executable trade rows normalize through one shared helper used by both diagnostics and market-open submission.
- Prepared orders still include the expected conid/symbol/exchange/primaryExchange/timing fields.
- Tests cover helper behavior, integration reuse, and no-mutation/side-effect expectations.
- `npm run test:all -- --lane=safe` and `npm test` both pass.
