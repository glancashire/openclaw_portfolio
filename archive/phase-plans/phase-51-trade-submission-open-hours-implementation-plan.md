# Phase 51 Implementation Plan: Trade Submission Open-Hours Fix

## Goal
Ensure trades either submit during open hours or fail with one clear, actionable reason. No silent stalls.

## Root cause summary
The current execution path can be blocked by several independent gates before submission:
- broker readiness/auth/reachability
- pending approval
- execution mode restrictions
- portfolio safety limits
- approved instrument checks
- stale/simulated holdings pricing
- unresolved broker account reference

## Scope
This phase changes the execution pipeline and its visibility. It does **not** relax safety gates.

---

## Planned code changes by file

### 1) `src/execution/portfolioExecution.js`
**Change:** centralize pre-submit readiness evaluation.

Add a new helper such as:
- `buildExecutionBlockSummary(policy)`
- `isReadyToSubmit(policy, order)`
- `primaryBlockReason(blockers)`

Update `evaluateExecutionPolicy()` to return:
- `blockers` with stable `code` + `message`
- a single `primaryBlocker`
- a `submitReady` boolean
- `nextAction` text

Update `stagePortfolioOrder()` to:
- refuse submission when `submitReady=false`
- write the blocker reason into the trade row/log
- append a runtime event with the primary blocker code
- avoid ambiguous `policy_blocked` responses when a more specific code exists

Update `syncPortfolioOrderStatus()` / `cancelPortfolioOrder()` only if needed to reuse the same blocker summary format.

### 2) `src/execution/tradeState.js`
**Change:** persist and expose structured block reasons in trade rows.

Add support for trade-row metadata fields such as:
- `blockReason`
- `blockCode`
- `blockedAt`
- `nextAction`

Ensure approved/submitted/rejected/cancelled transitions preserve the original blocking context when applicable.

### 3) `src/observability/runtimeEvents.js` or event writer used by execution
**Change:** emit a structured “trade_blocked” event.

Event should include:
- portfolio
- order identifier/symbol
- primary block code
- all blocker codes
- execution mode
- broker readiness summary
- recommended operator action

### 4) `src/reporting/dashboardGenerator.js`
**Change:** surface open-hours submission blockers prominently.

Dashboard should show:
- whether the portfolio is `ready_to_submit`
- the current blocker reason if not ready
- whether the broker is ready
- whether approvals are pending
- what operator action is required next

### 5) `src/reporting/portfolioData.js` and/or overview generators
**Change:** aggregate blocked-trade state into overview pages.

Expose a concise summary for:
- blocked by broker readiness
- blocked by approval
- blocked by safety rules
- blocked by execution mode

### 6) `scripts/submit-orders-at-open.js`
**Change:** add a pre-open validation pass before attempting submission.

Behavior:
- check all queued orders
- call the centralized policy check
- submit only those with `submitReady=true`
- write blocked orders back with their explicit reason
- exit non-zero if open-hours submission was attempted but nothing could be submitted because of blockers

### 7) `scripts/execute-trades.js`
**Change:** ensure the operator-facing CLI prints the primary blocker and next step.

If a trade cannot submit, print:
- blocker code
- blocker message
- next action
- whether the order can auto-retry after remediation

### 8) `scripts/resync-portfolio-orders.js`
**Change:** keep blocked/pending orders from looking like submission failures.

Differentiate:
- never submitted
- blocked before submission
- submitted but not yet filled
- broker status unknown

### 9) `runtime/overview/approvals-queue.*`
**Change:** show explicit “blocked from submission” vs “awaiting approval.”

This prevents approval backlog from being mistaken for an execution failure.

---

## Tests mapped to files

### Core policy tests
#### `tests/test-portfolioExecution.js` (new)
Add cases for:
- broker not ready blocks submission
- pending approval blocks submission
- stale/simulated pricing blocks submission
- unapproved instrument blocks submission
- unresolved account reference blocks submission
- success path returns `submitReady=true`

### Trade state tests
#### `tests/test-tradeState.js` (new or extend existing)
Add cases for:
- blocked reason fields are preserved in trade rows
- approved → submitted transition preserves original block context only when applicable
- status parsing distinguishes blocked vs pending approval

### CLI / scheduler tests
#### `scripts/test-portfolio-execution-gates.js`
Extend to assert:
- primary blocker is emitted
- open-hours submission refuses blocked orders
- ready orders still submit

#### `scripts/test-portfolio-order-lifecycle-e2e.js`
Extend to cover:
- pre-open validation
- blocked order remains visible with correct reason
- successful submission path after remediation

#### `scripts/test-trade-blocking-safety-hardening.js`
Add/extend assertions for:
- no silent stalls
- one blocker reason chosen as primary
- no submission when approvals are pending

#### `scripts/test-staged-order-approval-guard.js`
Add assertion that approval backlog is surfaced distinctly from broker readiness failures.

#### `scripts/test-resync-idempotent-open-order-filter.js`
Add assertion that blocked-not-submitted orders are not misclassified as open broker orders.

### Reporting tests
#### `tests/test-tradeProposal.js` or a new reporting test
Add assertions that dashboard/overview data includes blocker state and next action.

---

## Verification sequence
1. Add structured blocker classification in execution policy.
2. Wire trade row persistence for blocked state.
3. Update scheduler/CLI output.
4. Update dashboard/overview visibility.
5. Add tests.
6. Run targeted tests for execution gates + lifecycle + reporting.

## Acceptance criteria
- Open-hours submission cannot silently stall.
- Every blocked trade has exactly one primary reason and a next action.
- Approval backlog and broker readiness failures are visibly distinct.
- Tests cover both blocked and success paths.
- Existing safety gates remain intact.
