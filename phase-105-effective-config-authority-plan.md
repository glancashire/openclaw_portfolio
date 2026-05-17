# Phase 105 — Effective config / authority surface

## Goal
Expose a canonical operator-facing effective-config / execution-authority view so the current execution posture, approvals, broker readiness, and live-arm state can be inspected consistently.

## Current hypothesis
The surface likely already exists, but the checklist may still be open due to stale admin tasks or missing docs/test alignment.

## In scope
- verify the canonical effective-config / authority summary module
- verify the CLI surface and JSON/human-readable output
- verify docs point operators to the canonical surface
- add only missing glue/tests if any contract gap remains

## Out of scope
- changing authority policy
- widening live execution access
- duplicating policy logic in tests or docs

## Implementation steps
1. Inspect the authority summary module and CLI entrypoint.
2. Verify current output matches the checklist contract.
3. Add or adjust tests/docs only if there is a real mismatch.
4. Re-run targeted verification until green.
5. Commit and push completion.

## Verification gates
- `node scripts/test-execution-authority.js`
- `node scripts/test-trade-cli-surface.js`
- `node scripts/test-execution-command-surface-doc.js`
- `node scripts/test-system-policy-contract.js`

## Success criteria
- operators can inspect effective execution authority from one canonical surface
- JSON output is stable and machine-readable
- docs point to the right command
