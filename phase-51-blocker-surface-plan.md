# Phase 51 — Blocker surface and submission safety

## Goal
Make blocked trade submissions explain the single primary blocker and next action consistently across the operator surfaces.

## Current hypothesis
The core blocker classification likely exists already, but one or more operator surfaces may still need reconciliation so they all render the same structured truth.

## In scope
- verify the canonical blocker classification and next-action output
- verify submit/preflight/resync surfaces expose the blocker clearly
- verify blocked rows remain distinct from submitted/open orders
- add only missing glue/tests if a real mismatch remains

## Out of scope
- changing live execution policy
- allowing blocked trades to submit
- duplicating business logic in tests

## Implementation steps
1. Inspect blocker classification and the relevant operator commands.
2. Run the focused blocker/safety tests.
3. Patch only the missing operator-surface glue if any mismatch remains.
4. Re-run verification until green.
5. Commit and push completion.

## Verification gates
- `node tests/test-portfolioExecution.js`
- `node tests/test-tradeState.js`
- `node scripts/test-portfolio-execution-gates.js`
- `node scripts/test-trade-blocking-safety-hardening.js`
- `node scripts/test-staged-order-approval-guard.js`
- `node scripts/test-resync-idempotent-open-order-filter.js`
- `node scripts/test-portfolio-order-lifecycle-e2e.js`

## Success criteria
- one clear blocker and next action are surfaced for blocked submissions
- blocked rows stay separate from submitted/open orders
- the safety contract remains fail-closed
