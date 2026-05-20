# Phase 5 plan — explicit retry preparation surface

## Objectives
- Create an explicit reusable retry-preparation helper for broker orders instead of relying on implicit staging-time mutation.
- Make session-aware retry defaults inspectable and reusable for previews, reports, and future automation.
- Preserve existing approval gates and dry-run behavior.

## Risks / dependencies
- Refactoring preparation logic can subtly change staged/live order fields.
- New helper output must stay aligned with approved-instrument metadata resolution.
- The surface should remain narrow: preparation only, not silent execution.

## Actionable checklist
- [ ] Introduce a reusable prepare-order helper that merges approved instrument metadata with timing policy
- [ ] Add unit coverage for metadata/timing preparation
- [ ] Add integration-style staging coverage that uses the helper path
- [ ] Ensure no new writes or gate bypasses are introduced
- [ ] Run focused tests until green
- [ ] Run full repo verification
- [ ] Commit and push phase 5

## Acceptance criteria
- A caller can prepare a retry-ready order without invoking broker submission.
- Prepared orders preserve conid / symbol / localSymbol / primaryExchange / exchange and timing defaults.
- `stagePortfolioOrder` uses the shared preparation path.
- Full verification remains green.
