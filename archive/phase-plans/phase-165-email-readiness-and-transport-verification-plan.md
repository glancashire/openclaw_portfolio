# Phase 165 — Email readiness surface and guarded transport verification

## Goal
Finish the operator-facing email readiness and verification layer so live email can be enabled safely and audibly without widening execution or delivery risk.

## Current state
The repo already contains several pieces that may partially satisfy this phase:
- delivery policy and readiness classification
- a readiness CLI surface
- delivery executor and Mailgun-backed transport
- guardrail tests around verification behavior

This phase should only add missing operator-facing readiness/reporting or controlled verification behavior that is not already implemented. If the current code/tests already satisfy the contract, reconcile the checklist and move on.

## In scope
- verify whether the canonical email-readiness CLI/report is already complete
- verify whether docs for safe live email enablement already exist and are accurate
- verify whether a controlled transport-verification script exists and respects policy/guardrails
- add only the missing pieces required for a truthful, safe operator flow
- extend or tighten focused tests where the phase contract is not yet explicit

## Out of scope
- enabling live email by default
- bypassing delivery readiness or pending-action gates
- sending real verification mail unless policy/readiness explicitly allows it and the phase requires it

## Implementation steps
1. Inspect the current readiness CLI, verification script surface, and supporting docs.
2. Compare the implementation to the Phase 165 checklist contract.
3. If a gap exists, add the smallest canonical surface needed rather than inventing a parallel path.
4. Add or tighten focused readiness/verification tests.
5. Run focused delivery/email regressions until green.
6. If all requirements were already met, reconcile the checklist and move on.

## Verification gates
- `node scripts/test-email-readiness-cli.js`
- `node scripts/test-email-verification-guardrails.js`
- `node scripts/test-report-delivery-readiness.js`
- `node scripts/test-delivery-executor.js`

## Success criteria
- a canonical email-readiness operator surface exists
- transport verification remains policy-gated and safe
- docs match the implemented behavior
- focused email/delivery checks pass
