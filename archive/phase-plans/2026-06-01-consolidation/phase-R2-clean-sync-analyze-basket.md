# Phase R2 plan — cleanup, live sync, diversification basket

## Objectives
- Clean up repo/runtime noise enough to work safely from a clear current-state view.
- Sync current holdings/cash from IBKR to capture the latest live broker-reported portfolio state.
- Analyse the ETF portfolio using only approved instruments and recommend a basket that broadens diversification with minimal overlap.
- Produce the basket in the repo’s normal approvable/executable form without bypassing approval or safety gates.

## Constraints
- Do not place live orders.
- Keep ETF-only / approved-instruments-only scope.
- Preserve approval and execution safety controls.
- Do not overwrite intentional source-of-truth files blindly during cleanup.

## Risks / dependencies
- IBKR auth/readiness may be degraded or require a fresh session.
- Tracked generated artifacts and runtime churn may obscure whether changes are source vs derived.
- Basket quality depends on approved instrument metadata and current holdings truth.

## Checklist
- [ ] Inspect current git/runtime churn and classify what to ignore vs refresh.
- [ ] Capture a clean before-state snapshot (`git status`, current dashboard/holdings/trades context).
- [ ] Verify IBKR readiness.
- [ ] Sync live holdings/cash from IBKR.
- [ ] Regenerate portfolio/reporting artifacts needed for analysis.
- [ ] Analyse diversification gaps and overlap using approved instruments only.
- [ ] Generate an approvable basket in the project’s standard workflow.
- [ ] Verify the produced basket is dry-run only / approval-gated / executable in normal flow.
- [ ] Summarize exact recommended basket, rationale, and any blockers.

## Acceptance
- Current broker-reported cash is reflected in repo artifacts.
- Recommended basket uses approved instruments only and is materially diversification-broadening.
- Basket lands in the normal approval/execution path rather than as an ad-hoc suggestion.
- No live execution occurs.
