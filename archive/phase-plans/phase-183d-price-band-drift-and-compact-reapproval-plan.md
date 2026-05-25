# Phase 183D — Price-Band Drift and Compact Reapproval Plan

## Objectives
- Detect when a previously approved basket leg is no longer executable within its approved price band.
- Generate a compact reapproval artifact that asks only for the minimal price-band update needed.
- Keep the reapproval scope bounded to the affected leg(s) instead of requiring a full new basket approval.
- Preserve the original approval and execution audit trail.

## Risks / dependencies
- Price drift can happen between proposal, approval, and live submission.
- The reapproval artifact must be compact but still explicit enough for safe operator review.
- Reapproval logic must not mutate the original approval envelope.
- Drift checks must be deterministic and testable offline.

## Actionable checklist
- [ ] Add price-band freshness / drift evaluation helpers.
- [ ] Add compact reapproval artifact generation for affected legs.
- [ ] Add persistence path for pending reapproval requests.
- [ ] Add unit tests for band drift, within-band, and stale-band states.
- [ ] Add regression tests that keep unaffected legs executable.
- [ ] Run targeted tests, then repo verification.

## Acceptance criteria
- The system can detect stale or unrealistic price bands at the leg level.
- A minimal reapproval request is generated only for the affected leg(s).
- Unaffected legs remain eligible for execution.
- Original basket approval remains intact and auditable.
