# Phase 56 — Runtime and broker observability

## Goal
Make runtime and broker observability surfaces consistent with the canonical trade and open-runner state, so operator logs and summaries explain what happened without extra guessing.

## Current hypothesis
The observability plumbing exists, but one or more summaries may still need reconciliation with the canonical execution state model.

## In scope
- verify runtime event summaries include the important queue/retry/block state
- verify broker/runtime observability stays aligned with trade status truth
- add only missing glue/tests if a real mismatch remains

## Out of scope
- changing runtime event schema without need
- widening observability beyond portfolio-manager needs
- live execution policy changes

## Implementation steps
1. Inspect runtime event and broker observability surfaces.
2. Run focused observability verification.
3. Patch only if a real mismatch remains.
4. Re-run verification until green.
5. Commit and push completion.

## Verification gates
- `node scripts/test-runtime-event-open-runner-summary.js`
- `node scripts/test-open-runner-retry-summary-from-block-code.js`
- `node scripts/test-open-runner-block-persistence.js`
- `node scripts/test-structured-summary-artifacts.js`
- `node scripts/test-portfolio-order-lifecycle-e2e.js`

## Success criteria
- runtime summaries reflect queue/retry/block truth
- broker observability stays in sync with execution state
- no safety regressions
