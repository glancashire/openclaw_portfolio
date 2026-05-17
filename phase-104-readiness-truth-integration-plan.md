# Phase 104 — Readiness truth integration

## Goal
Ensure reporting and dashboard surfaces consume one canonical live-readiness truth instead of re-deriving policy independently.

## Current hypothesis
The preflight/readiness integration likely already exists in current reporting code, but this phase may still require reconciliation if the dashboard and overview surfaces were added after the checklist was written.

## In scope
- verify canonical readiness summary derivation from the live preflight surface
- verify dashboard and overview surfaces expose readiness, arming, blockers, warnings, and next action
- add only the minimum missing propagation if any surface still reimplements policy or hides blocked truth
- tighten focused tests if the contract is not explicit enough

## Out of scope
- changing live readiness policy
- widening execution permissions
- introducing a second readiness model in reporting

## Implementation steps
1. Inspect readiness summary generation and reporting/dashboard consumers.
2. Run focused readiness/dashboard/overview tests.
3. Patch the smallest missing propagation gap if one exists.
4. Re-run verification until green.
5. Commit and push completion.

## Verification gates
- `node scripts/test-readiness-surface-integration.js`
- `node scripts/test-live-readiness-preflight.js`
- `node scripts/test-trade-cli-surface.js`
- `node scripts/test-structured-summary-artifacts.js`

## Success criteria
- reporting consumes canonical readiness truth
- blocked states are shown explicitly and fail closed
- dashboard/overview surfaces expose the required operator fields
