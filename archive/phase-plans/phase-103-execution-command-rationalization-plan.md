# Phase 103 — Execution command rationalization

## Goal
Consolidate the operator-facing execution command surface into one canonical family so readiness, approval, stage, cancel, resync, and status flows are clear, documented, and machine-readable where it matters.

## Current hypothesis
The repo already has a working command surface, but older wrappers and docs may still be ambiguous. This phase should only add the minimum missing glue or documentation required to make the canonical surface obvious and unambiguous.

## In scope
- inventory execution-related scripts and classify them by role
- choose and document one canonical operator command family
- ensure help/usage is clear and JSON output exists where operationally useful
- mark obsolete scripts clearly without breaking compatibility where needed
- add or tighten focused tests for routing/output and docs alignment

## Out of scope
- changing live-execution safety gates
- widening authority or bypassing policy checks
- removing compatibility if callers still need it and the canonical path is already explicit

## Implementation steps
1. Inventory execution-related scripts and docs.
2. Compare the surface against the phase checklist.
3. Add the smallest missing canonical glue/documentation/test coverage.
4. Re-run focused verification until green.
5. Commit and push the completed phase.

## Verification gates
- `node scripts/test-trade-cli-surface.js`
- `node scripts/test-execution-command-surface-doc.js`
- `node scripts/test-operator-runbooks-contract.js`
- `node scripts/test-trading-workflow-doc-contract.js`
- `node scripts/test-transmitted-live-operations-doc-contract.js`
- `node scripts/test-system-policy-contract.js`

## Success criteria
- one canonical execution command family is documented and test-covered
- operator users can discover the right commands without ambiguity
- safety gates remain unchanged
- old wrappers are either clearly compat or clearly obsolete
