# Phase E plan — safe-lane timeout hardening

## Objectives
- Eliminate the remaining safe-lane verification failures caused by per-test timeouts.
- Keep coverage intact while making digest/overview tests deterministic and fast enough for the shared test runner budget.
- Preserve the behavioral contract of the digest and overview reporting paths.

## Risks / dependencies
- These tests touch reporting flows that can accidentally pull expensive model/report generation paths.
- A speed fix that weakens assertions too much would create false green builds.
- Multi-portfolio overview coverage is valuable and should not be dropped casually.

## Actionable checklist
- [ ] Inspect the four timing-out tests and identify the slow path in each.
- [ ] Decide whether the right fix is test isolation, stubbing, fixture reduction, or lane reclassification.
- [ ] Add/adjust tests so the same behavioral coverage stays under the safe-lane timeout budget.
- [ ] Rerun the affected focused tests.
- [ ] Rerun `npm run test:all -- --lane=safe` and `npm test`.
- [ ] Commit and push the hardening changes.

## Acceptance criteria
- [ ] All previously timing-out safe-lane tests complete successfully within the runner budget.
- [ ] Safe-lane run is green without adding unjustified quarantines.
- [ ] Full repo verification remains green.
