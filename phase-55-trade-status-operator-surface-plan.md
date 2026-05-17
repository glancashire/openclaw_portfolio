# Phase 55 — Trade status operator surface

## Goal
Finish the operator-facing trade status surface so approval, queue, stale, blocked, and broker lifecycle truth all render clearly from the canonical state model.

## Current hypothesis
Most of this likely exists, but there may still be a reporting/status integration gap or stale checklist tail.

## In scope
- verify trade status visibility across approvals, blocked rows, queued rows, stale approvals, and broker-submitted rows
- verify dashboard/report summaries reflect the canonical row state truth
- add only missing glue/tests if a real mismatch remains

## Out of scope
- new execution modes
- changing safety policy
- broad reporting redesign outside status truth

## Implementation steps
1. Inspect status rendering and summary/report surfaces.
2. Run focused status/report verification.
3. Patch only if a real mismatch remains.
4. Re-run verification until green.
5. Commit and push completion.

## Verification gates
- `node scripts/test-trade-status-open-runner-visibility.js`
- `node scripts/test-structured-summary-artifacts.js`
- `node scripts/test-dashboard-open-runner-retry-visibility.js`
- `node scripts/test-stale-approval-refresh-command.js`
- `node scripts/test-portfolio-order-lifecycle-e2e.js`

## Success criteria
- trade status surfaces show the canonical execution truth clearly
- stale, queued, blocked, and broker-submitted states stay distinct
- operator guidance is explicit and consistent
