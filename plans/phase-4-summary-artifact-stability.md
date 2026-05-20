# Phase 4 plan — summary artifact stability and verification hardening

## Objectives
- Diagnose why `test-structured-summary-artifacts.js` fails on explanation text expectations during full repo verification.
- Stabilize summary artifact generation so explanation text is consistently present under realistic portfolio states.
- Keep the fix narrow and avoid changing unrelated portfolio execution behavior.

## Risks / dependencies
- Summary generation may depend on live/generated runtime artifacts, so tests can be brittle if assumptions are implicit.
- Tightening explanation rendering could mask missing upstream data if handled sloppily.
- Repo verification must stay meaningful; avoid weakening the test without restoring the intended guarantee.

## Actionable checklist
- [ ] Inspect summary artifact generation paths and explanation-field construction
- [ ] Reproduce the failing summary condition directly
- [ ] Add/adjust regression coverage for explanation rendering stability
- [ ] Implement the minimal code fix so generated summary HTML always includes the expected explanatory text when summary data supports it
- [ ] Re-run the failing structured-summary test
- [ ] Re-run full repo verification
- [ ] Commit and push phase 4

## Acceptance criteria
- `scripts/test-structured-summary-artifacts.js` passes reliably.
- `scripts/verify-repo.js` passes end-to-end.
- The fix preserves existing dashboard/summary semantics while making explanation rendering deterministic.
