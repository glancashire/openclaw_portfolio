# Phase 106 — CLI verification coverage

## Goal
Make the canonical trade CLI and execution-authority surfaces part of stable repo verification so regressions show up automatically.

## Current hypothesis
Coverage may already be present through the current CLI surface tests and authority tests, leaving this as another stale checklist tail.

## In scope
- verify canonical trade CLI coverage is already wired into repo verification
- verify authority command coverage and machine-readable output checks exist
- add only missing deterministic coverage if the contract is not yet encoded

## Out of scope
- changing business logic
- widening test assumptions beyond blocked/non-live deterministic states

## Implementation steps
1. Inspect current CLI and authority tests.
2. Confirm deterministic blocked-state coverage.
3. Add or adjust the smallest missing verification hook if needed.
4. Re-run focused verification until green.
5. Commit and push completion.

## Verification gates
- `node scripts/test-trade-cli-surface.js`
- `node scripts/test-execution-authority.js`
- `node scripts/test-live-readiness-preflight.js`

## Success criteria
- canonical CLI and authority surfaces are test-covered
- machine-readable outputs remain stable
- verification stays deterministic in blocked real-portfolio conditions
