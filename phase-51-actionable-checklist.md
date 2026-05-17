# Phase 51 Actionable Checklist

## Phase goal
Ensure trade submissions during open hours either succeed or fail with one explicit primary blocker and next action.

## Checklist
- [x] Classify execution blockers with stable codes in `src/execution/portfolioExecution.js`
- [x] Return `primaryBlocker`, `submitReady`, and `nextAction` from policy evaluation
- [x] Preserve blocked-submission context in `src/execution/tradeState.js`
- [x] Emit structured blocked-trade runtime events
- [x] Print actionable blocker output in `scripts/submit-orders-at-open.js`
- [x] Print actionable blocker output in `scripts/execute-trades.js`
- [x] Keep blocked-not-submitted orders distinct in `scripts/resync-portfolio-orders.js`
- [x] Surface blocked-vs-pending state in dashboard/overview data where available this phase
- [x] Add tests for broker readiness, approval backlog, safety gates, and success path
- [x] Run the targeted tests
- [x] Fix failures until green
- [x] Commit and push

## Test gates
- `node tests/test-portfolioExecution.js`
- `node tests/test-tradeState.js`
- `node scripts/test-portfolio-execution-gates.js`
- `node scripts/test-trade-blocking-safety-hardening.js`
- `node scripts/test-staged-order-approval-guard.js`
- `node scripts/test-resync-idempotent-open-order-filter.js`
- `node scripts/test-portfolio-order-lifecycle-e2e.js`

## Done when
- Every blocked trade has one primary reason and next action.
- Approval backlog and broker readiness are visibly distinct.
- Blocked rows are not confused with submitted/open orders.
- All targeted tests pass.
