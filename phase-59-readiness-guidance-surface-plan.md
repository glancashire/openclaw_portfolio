# Phase 59 — Readiness guidance surface

## Goal
Finish the readiness guidance surfaces so operator-facing commands and reports explain the exact broker state and the next safe action consistently.

## Current hypothesis
Most readiness work is already present, but this phase may still need a small surface reconciliation for operator guidance or checklist closure.

## In scope
- verify readiness commands/reports show the canonical broker state and next action
- verify waiting/down/ready paths stay distinct and truthful
- add only missing glue/tests if a real mismatch remains

## Out of scope
- changing readiness semantics without need
- auto-retrying broker/login flows beyond current safety policy
- live execution policy changes

## Implementation steps
1. Inspect readiness guidance surfaces and linked status/report paths.
2. Run focused readiness verification.
3. Patch only if a real mismatch remains.
4. Re-run verification until green.
5. Commit and push completion.

## Verification gates
- `node tests/test-ibkr-readiness.js`
- `node scripts/test-broker-readiness-guidance.js`
- `node scripts/test-live-readiness-preflight.js`
- `node scripts/test-readiness-surface-integration.js`
- `node scripts/test-structured-summary-artifacts.js`

## Success criteria
- readiness surfaces clearly distinguish ready, waiting, and down states
- next-step guidance is explicit and consistent
- operator surfaces remain fail-closed
