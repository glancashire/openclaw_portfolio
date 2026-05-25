# Phase 57 — Market-open close loop

## Goal
Finish the market-open close loop so open-runner queued/retry rows and their closure states remain consistent from selection through final lifecycle reconciliation.

## Current hypothesis
The close loop is likely already implemented, but the remaining checklist tail may need reconciliation against current row-selection and lifecycle behavior.

## In scope
- verify queued/retry rows flow correctly through open-runner and close states
- verify lifecycle reconciliation closes rows cleanly without reintroducing ambiguity
- add only missing glue/tests if a real mismatch remains

## Out of scope
- new order-routing behavior
- changing broker submission policy
- relaxing open-runner safety gates

## Implementation steps
1. Inspect the close-loop and lifecycle reconciliation surfaces.
2. Run focused close-loop verification.
3. Patch only if a real mismatch remains.
4. Re-run verification until green.
5. Commit and push completion.

## Verification gates
- `node scripts/test-market-open-queue-command.js`
- `node scripts/test-market-open-requeue-command.js`
- `node scripts/test-open-runner-retry-state.js`
- `node scripts/test-trade-status-open-runner-visibility.js`
- `node scripts/test-portfolio-order-lifecycle-e2e.js`

## Success criteria
- queued/retry rows close out consistently
- lifecycle reconciliation stays deterministic
- safety remains fail-closed
