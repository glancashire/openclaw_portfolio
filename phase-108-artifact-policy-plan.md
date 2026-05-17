# Phase 108 — Artifact policy

## Goal
Define a truthful repo-local artifact policy that distinguishes source files, derived versioned artifacts, and runtime ephemeral state.

## Current hypothesis
The policy doc and contract test may already exist, with the checklist left open after later repo cleanup work.

## In scope
- verify a repo-local artifact policy document exists
- verify it covers portfolio summaries, overview outputs, runtime state, and event logs
- verify docs/tests do not pretend the repo is cleaner than reality
- add only missing policy wording or focused tests if a real gap remains

## Out of scope
- changing artifact generation behavior
- mass file cleanup unrelated to the contract

## Implementation steps
1. Inspect the artifact policy doc and references.
2. Run focused artifact-policy verification.
3. Patch only if wording/tests lag the implemented repo behavior.
4. Re-run verification until green.
5. Commit and push completion.

## Verification gates
- `node scripts/test-artifact-policy-contract.js`
- `node scripts/test-dashboard-report-freshness.js`
- `node scripts/test-structured-summary-artifacts.js`

## Success criteria
- artifact policy exists and matches reality
- source vs derived vs runtime artifacts are clearly classified
- focused policy checks are green
