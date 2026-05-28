# Phase next-1 — Stabilize proposal and timing fixes

## Objectives
- Promote the already-working target-gap deployment regression back into the active safe lane.
- Confirm the UBSPX proposal-distribution and timing-policy protections are covered by focused tests.
- Keep this phase source/test-only with no live-state or approval-gate changes.

## Risks / dependencies
- Removing a quarantine without re-verifying the broader suite could reintroduce noisy red builds.
- Timing-policy behavior is easy to protect at unit level but can drift if staging/integration coverage is skipped.
- This phase depends on leaving existing live-order safeguards untouched.

## Actionable checklist
- [ ] Re-run the focused proposal/timing tests and confirm current behavior matches the intended policy.
- [ ] Remove the stale quarantine for `scripts/test-target-gap-deployment.js`.
- [ ] Refresh the test manifest.
- [ ] Re-run safe lane and full verification.
- [ ] Commit and push the completed phase.

## Acceptance criteria
- `scripts/test-target-gap-deployment.js` is active in the safe lane again.
- Focused proposal/timing tests pass.
- `npm run test:all -- --lane=safe` passes with the reduced quarantine count.
- `npm test` passes with no regression in approval or execution safeguards.
