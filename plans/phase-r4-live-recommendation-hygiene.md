# Phase R4 plan — live recommendation hygiene after autonomous basket execution

## Objectives
1. Remove stale dry-run/broker-disabled wording from dashboard and summary recommendations once live execution has already occurred.
2. Make recommendation generation reflect current execution posture, recent filled trades, and live broker readiness more honestly.
3. Add targeted regression coverage for recommendation text and operator queue behavior after live fills.

## Risks / dependencies
- Recommendation logic is shared across dashboard and summary artifacts; careless changes can create wording regressions elsewhere.
- Runtime-generated markdown/json/html artifacts are noisy; verification should focus on source logic and a small grounded regeneration pass.
- Trade-log history contains mixed legacy states, so tests need tight fixtures rather than depending on current live runtime files.

## Actionable checklist
- [ ] Inspect recommendation logic in dashboard/summary reporting modules.
- [ ] Define a clearer rule set for post-fill/live-broker recommendations.
- [ ] Add unit/regression tests covering live-posture and stale-block suppression behavior.
- [ ] Implement the recommendation updates in source modules.
- [ ] Regenerate the ETF dashboard and inspect the resulting next-step text.
- [ ] Run focused tests, then the full suite, and iterate until green.

## Acceptance criteria
- Dashboard/summary recommendations no longer tell the operator to approve dry-run proposals when the portfolio is already in live mode with no in-flight orders.
- Regression tests cover the corrected wording and stale queue suppression paths.
- Full test suite passes with no new failures.
