# Phase 3 plan — session-aware retry ergonomics

## Objectives
- Refactor session-aware retry timing from ad hoc inline logic into an explicit reusable helper.
- Make retry-order preparation behavior testable by value, not only by source-text presence.
- Preserve all live approval and dry-run no-side-effect safeguards.

## Risks / dependencies
- Refactoring execution preparation can accidentally change live order fields.
- Retry timing defaults are instrument/venue specific; over-generalizing could be unsafe.
- Existing tests currently rely on source inspection and should be upgraded carefully.

## Actionable checklist
- [ ] Extract a reusable execution timing helper module with explicit input/output behavior
- [ ] Add unit tests for default pass-through behavior
- [ ] Add unit tests for UBSPX/IBIS session-aware retry defaults
- [ ] Add integration-style test proving `stagePortfolioOrder` sends prepared timing fields to the broker client in dry-run mode
- [ ] Preserve dry-run no-write behavior in staging path
- [ ] Run focused tests until green
- [ ] Run broader regression suite / repo verification
- [ ] Commit and push phase 3

## Acceptance criteria
- Timing policy behavior is covered by executable assertions, not just string-matching tests.
- UBSPX/IBIS retry preparation yields deterministic DAY / outsideRth / goodAfterTime defaults.
- Non-UBSPX orders remain pass-through unless already explicitly populated.
- Existing stage/dry-run behavior remains intact and side-effect free.
