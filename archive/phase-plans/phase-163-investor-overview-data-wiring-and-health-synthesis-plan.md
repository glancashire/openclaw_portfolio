# Phase 163 — Investor Overview Data Wiring and Health Synthesis Plan

## Objectives
- Fix the ETF weekly investor overview so the management summary always includes meaningful numeric facts when holdings totals are available.
- Fix the held-instruments section so it renders the actual held instruments instead of an empty list when source holdings data exists.
- Redesign the health report to be shorter and more synthesized for an investor audience:
  - consolidate sections
  - avoid itemized trend lists
  - infer and describe trends in plain words such as stable, improving, worsening, or unchanged
- Preserve the already-approved fill / purchase notification behavior.

## Evidence / Current Findings
- `portfolio/etf/summary.json` already contains investor-usable numeric inputs, including:
  - `holdings.totalValueChf = 22209.4831212`
  - `holdings.investedChf = 22209.4831212`
  - `holdings.cashChf = 0`
  - `holdings.holdingCount = 3`
- That means the empty-feeling management summary is not caused by missing top-line numbers upstream; it is most likely a renderer/data-selection issue in the investor email layer.
- The empty held-instruments rendering is also likely a data-wiring or identity-matching issue rather than a true absence of holdings.
- The current health-report source data is rich and verbose, so the investor-facing problem is now primarily synthesis and presentation, not collection.

## Risks / Dependencies
- The held-instruments rows may be available in a different source than the currently loaded summary model, which may require reading or threading holdings-derived rows into the report email path more explicitly.
- Fixing holdings rendering may touch shared summary/model code and could affect artifact-generation tests.
- Health-report shortening must not discard important unresolved operator actions when a real issue exists.
- Trend synthesis should avoid inventing conclusions when historical evidence is thin; fallback wording should stay honest.

## Actionable Checklist
- [ ] Inspect the current generated weekly summary model and the investor email model at runtime to identify why numeric management summary content is not surfacing as intended.
- [ ] Trace the held-instruments data path from holdings source through summary artifacts into the investor email renderer; identify where rows are dropped or mismatched.
- [ ] Add regression tests that require:
  - numeric management-summary output when holdings totals exist
  - non-empty held-instruments output when holdings rows exist
  - no fake “empty sample” fallback when real holdings data is available
- [ ] Fix the investor overview data wiring so management summary and held instruments use the actual available portfolio data.
- [ ] Redesign health-report copy/tests to consolidate sections and replace itemized trend bullets with short interpreted trend statements.
- [ ] Run focused reporting/health tests until green.
- [ ] Run full `npm test`, clean unrelated generated/runtime churn, then commit and push the finished phase.

## Acceptance Criteria
- Weekly investor overview management summary contains concrete numbers whenever holdings totals are available.
- Weekly investor overview held-instruments section lists the actual held instruments when holdings source data exists.
- Empty fallback text appears only when source data is truly unavailable.
- Health report is shorter, more consolidated, and expresses trends as interpreted summaries rather than itemized lists.
- Fill / purchase notification behavior remains unchanged.
- Focused tests pass, then full `npm test` passes with no regressions.
