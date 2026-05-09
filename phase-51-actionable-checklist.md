# Phase 51 Actionable Checklist

## Objective
Make open-hours trade submission deterministic: either submit, or fail with one explicit actionable reason.

## Checklist
- [ ] Add structured blocker classification in `src/execution/portfolioExecution.js`
- [ ] Return `primaryBlocker`, `submitReady`, and `nextAction` from execution policy evaluation
- [ ] Persist blocked submission context in `src/execution/tradeState.js`
- [ ] Emit structured blocked-submission runtime events
- [ ] Surface blocker state in CLI output for execution scripts
- [ ] Prevent blocked-not-submitted orders from being confused with broker-open orders
- [ ] Surface blocker state in dashboard/overview data where practical for this phase
- [ ] Add focused unit/integration tests for blocker classification and submission behavior
- [ ] Run targeted test suite
- [ ] Fix failures until green
- [ ] Commit phase implementation
- [ ] Push phase implementation

## Verification gates
- `node tests/test-portfolioExecution.js`
- `node tests/test-tradeState.js`
- `node scripts/test-portfolio-execution-gates.js`
- `node scripts/test-trade-blocking-safety-hardening.js`
- `node scripts/test-staged-order-approval-guard.js`
- `node scripts/test-resync-idempotent-open-order-filter.js`

## Done criteria
- Every blocked trade attempt reports one primary reason.
- Submission scripts print actionable next steps.
- Blocked rows are not mistaken for submitted/open broker orders.
- All Phase 51 targeted tests pass.
