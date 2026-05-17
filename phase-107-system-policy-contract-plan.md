# Phase 107 — System policy contract

## Goal
Make the execution-policy boundaries explicit in a stable repo-local system-policy contract that matches implemented behavior.

## Current hypothesis
The document and contract test probably already exist, leaving this phase mostly as stale checklist drift.

## In scope
- verify `system-policy.md` exists and covers authority boundaries, approval requirements, automation/messaging boundaries, and fail-closed posture
- verify linked docs remain aligned with the current behavior
- add only missing wording/tests if a real mismatch exists

## Out of scope
- changing policy behavior
- widening execution permissions

## Implementation steps
1. Inspect `system-policy.md` and linked docs.
2. Run focused policy/documentation contract verification.
3. Patch only if the implemented behavior and docs disagree.
4. Re-run verification until green.
5. Commit and push completion.

## Verification gates
- `node scripts/test-system-policy-contract.js`
- `node scripts/test-execution-command-surface-doc.js`
- `node scripts/test-trading-workflow-doc-contract.js`

## Success criteria
- system policy contract exists and is test-covered
- wording matches implemented behavior
- safety posture remains explicit and fail-closed
