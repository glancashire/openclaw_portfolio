# Phase 54 — Open runner and safety handshake

## Goal
Finish the remaining open-runner handoff and safety handshake surfaces so queued trades move through the canonical path without ambiguity.

## Current hypothesis
The core queue/retry mechanics likely exist already, but one or more operator-facing surfaces may still need reconciliation for the open-runner handoff contract.

## In scope
- verify queued-first-handoff vs queued-retry behavior
- verify the safety handshake surfaces preserve fail-closed behavior
- verify open-runner row selection and retry guidance are consistent
- add only missing glue/tests if a real mismatch remains

## Out of scope
- live execution changes
- relaxing approval gates
- broad refactors unrelated to the open-runner contract

## Implementation steps
1. Inspect open-runner queue/retry classification and related command surfaces.
2. Run focused open-runner and safety tests.
3. Patch only the missing surface if a real mismatch remains.
4. Re-run verification until green.
5. Commit and push completion.

## Verification gates
- `node scripts/test-market-open-trade-row-selection.js`
- `node scripts/test-trading-guards.js`
- `node scripts/test-open-runner-queue-classification.js`
- `node scripts/test-open-runner-retry-guidance.js`
- `node scripts/test-portfolio-order-lifecycle-e2e.js`

## Success criteria
- queued first-handoff and queued retry are distinct and correct
- retry guidance is explicit and consistent
- safety remains fail-closed
