# Phase 51: Why Trades Did Not Execute — Fix Plan

## Status
Investigated. The trades were blocked before submission by layered safety/readiness gates, not by market hours alone.

## Root causes found
- Interactive Brokers readiness was not healthy in multiple runs (`authenticated:false`, `reachable:false`).
- Live execution still required explicit approval in `require_confirmation` mode.
- Approval backlog remained open for proposed trades.
- Portfolio safety controls still blocked execution when limits/questions/pricing were unresolved.
- Some orders were also blocked by instrument approval / account-reference constraints.

## Fix goal
Make every trade attempt end in one of two states:
1. submitted during open hours, or
2. blocked with one clear primary reason and next action.

## Implementation plan

### 1) Centralize blocker classification
**File:** `src/execution/portfolioExecution.js`
- Add stable blocker codes.
- Return `primaryBlocker`, `submitReady`, and `nextAction`.
- Keep the full blocker list for diagnostics.
- Ensure the submit path uses the centralized readiness result.

### 2) Persist blocked-submission context in trade rows
**File:** `src/execution/tradeState.js`
- Add fields for `blockCode`, `blockReason`, `blockedAt`, `nextAction`.
- Preserve blocked context through later state transitions when relevant.
- Distinguish `blocked_before_submission` from `submitted`.

### 3) Surface blocked state in runtime events
**File:** execution event writer / `src/observability/runtimeEvents.js` if needed
- Emit `trade_blocked` records with code, reason, broker readiness, and recommended operator action.

### 4) Make scripts print actionable failures
**Files:**
- `scripts/submit-orders-at-open.js`
- `scripts/execute-trades.js`
- `scripts/resync-portfolio-orders.js`
- `scripts/approve-portfolio-trade.js` if needed
- `scripts/stage-portfolio-order.js` if needed

Update output so operators can immediately see:
- why the order was blocked
- whether approval is pending
- whether broker readiness is the issue
- whether the order can be retried

### 5) Update dashboard/overview visibility
**Files:**
- `src/reporting/dashboardGenerator.js`
- `src/reporting/portfolioData.js`
- `runtime/overview/*` generators if used

Show:
- `ready_to_submit` status
- current blocker reason
- approvals pending vs blocked-before-submission
- required next action

### 6) Add tests
**Files:**
- `tests/test-portfolioExecution.js` (new)
- `tests/test-tradeState.js` (new or extend)
- `scripts/test-portfolio-execution-gates.js`
- `scripts/test-trade-blocking-safety-hardening.js`
- `scripts/test-staged-order-approval-guard.js`
- `scripts/test-resync-idempotent-open-order-filter.js`
- `scripts/test-portfolio-order-lifecycle-e2e.js`

Test cases:
- broker not ready blocks submission
- approval backlog blocks submission
- stale/simulated pricing blocks submission
- unapproved instrument blocks submission
- unresolved account reference blocks submission
- success path submits
- blocked orders are not misclassified as open broker orders
- blocked orders preserve a single primary reason

## Checklist
- [ ] Add blocker codes and primary blocker selection
- [ ] Persist blocked state in trade rows
- [ ] Emit blocked trade events
- [ ] Update open-hours submission scripts
- [ ] Update dashboard/overview summaries
- [ ] Add and extend tests
- [ ] Run targeted tests
- [ ] Iterate until green
- [ ] Commit and push

## Acceptance criteria
- No silent stalls.
- Every failed submission has one primary reason and next action.
- Approval backlog and broker readiness failures are distinct.
- All targeted tests pass.
