# Phase 140 — Open-Runner Queue and UBSSLI Quote Recovery

## Goal
Resolve the last remaining open-runner queue residue for UBSSLI by making the blocked-row reason, retry posture, and quote-reference recovery path converge across execution, status, and dashboard surfaces.

## Why this phase exists
After Phase 139, the remaining live-execution residue is concentrated in a single approved row queued for market-open handling:
- UBSSLI remains queued for first handoff.
- The system previously lacked a safe smart-limit reference for this row.
- Operator surfaces should make it crystal clear whether the row is retryable, what exact quote data is missing, and what the next safe action is.

## Scope
1. Reproduce the current queued/truth surfaces for the remaining UBSSLI row.
2. Trace the exact quote-reference failure path and queued-row metadata.
3. Tighten operator-facing block reason / next-action text if still vague.
4. Verify retryability and open-runner selection behavior for the remaining queued row.
5. Ensure dashboard/status/delivery stay aligned after the fix.

## Actionable checklist
- [ ] Re-run canonical preflight, status, authority, and delivery for the remaining queued row.
- [ ] Inspect queued-row state and retry/open-runner selection metadata for UBSSLI.
- [ ] Trace the quote-reference failure path in market-open submission / pricing code.
- [ ] Implement the smallest conservative fix to improve queued-row truth and/or quote recovery.
- [ ] Add or extend focused regression tests for queued blocked-row truth and retryability.
- [ ] Re-run tests and canonical commands; iterate until green.
- [ ] Commit and push once Phase 140 passes.

## Verification target
- The remaining queued row has precise operator-visible block reason and next action.
- Retry/open-runner selection remains safe and deterministic.
- If quote recovery is fixable locally, the row either becomes executable or remains blocked with exact truth.
- Dashboard/status/delivery/preflight agree on the remaining state.

## Out of scope
- Submitting new live orders without a fresh operator go-ahead.
- Any external notification sends.
