# Phase B plan — Rebalance analysis & cash requirements

## Objectives
- Produce a deterministic, testable analysis of the current ETF portfolio against the targets defined in `portfolio/etf/portfolio.md`.
- Calculate, per leg: current CHF value, current weight, target weight, drift (pp), gap CHF (target − actual).
- Calculate **three rebalance scenarios** and the cash impact of each:
  1. **No-sell.** Only buy under-weighted legs. How much new cash is needed?
  2. **Sell-overshoot.** Trim over-allocated legs (e.g. today's 2× SPMCHA) back to target, redeploy proceeds into under-weighted legs. Cash neutral if possible; net cash needed if a gap remains.
  3. **Sell-to-target.** Aggressive: sell every leg back to target weight, then buy where needed. Yields the largest free cash on the sell side.
- Deliver as a script `scripts/analyze-rebalance.js` with both `--portfolio=etf` and `--json` flags.
- Write a markdown report into `runtime/rebalance/etf/rebalance-<YYYYMMDD>.md` for Graham to read.

## Risks / dependencies
- The drift logic must not silently fall back to the stale `lib/portfolioDrift.js` `TARGET_ALLOCATIONS` (references VUSA/SLICHA — not in our approved instruments). Build a fresh pure function `computeRebalancePlan()` that takes `{holdings, targets, cashChf, fxRates}` and returns a structured plan. Hardcoded targets table stays untouched but unused by the new path.
- Live-price enrichment via IBKR is nice but not critical for the analysis. Default to avg-cost-based valuation (what holdings.md already has) with a `--with-live-quotes` flag for an optional refresh. Tests stay deterministic with avg-cost.
- `holdings.md` has FX rate blank for EUR. The new analyzer must accept an explicit `fxRates` map and surface "FX missing" as a structured warning rather than crashing.
- No execution / no broker writes. Read-only analysis. Safe.

## Actionable checklist
- [ ] New module `lib/rebalanceAnalyzer.js` exporting `computeRebalancePlan({ holdings, targets, cashChf, fxRates, scenario })`.
- [ ] Pure-function design: takes structured inputs, returns `{ legs[], totals, scenarios, warnings }`. No I/O.
- [ ] New parser `lib/portfolioPolicy.js` (or extend existing) to extract `Allocation Targets` and `Approved Instruments` tables from `portfolio.md` into a structured `{ targets, instruments }` object. Already implicit elsewhere — reuse where possible.
- [ ] CLI script `scripts/analyze-rebalance.js`:
  - reads `portfolio/<portfolio>/portfolio.md` and `holdings.md`
  - asks for FX (EUR→CHF, USD→CHF as needed) via flags or env, default to 1.0 with a warning if missing
  - runs `computeRebalancePlan()` for all 3 scenarios
  - prints a structured markdown report and writes a sibling JSON
  - `--json` outputs JSON to stdout
- [ ] Unit tests in `scripts/test-rebalance-analyzer.js`:
  - Drift math: target 40/20/12/8/20, holdings match → all drift = 0.
  - SPMCHA at 2× target → identifies overshoot, scenario-2 sells exact qty to revert.
  - Cash-needed scenario-1 = sum of positive gaps, capped at 0 (no negative cash needs).
  - FX-missing warning surfaces in `warnings[]` for EUR/USD legs.
  - Min-trade-size from portfolio.md (CHF 500) honoured: gaps below 500 dropped from action list with a `skipped_min_trade` reason.
  - Snapshot test on the actual current ETF portfolio (locked input fixture) to catch regression.
- [ ] Run tests until green; ensure no other adjacent suite regresses.
- [ ] Generate the actual current rebalance report into `runtime/rebalance/etf/rebalance-20260526.md` so this phase delivers a concrete artifact Graham can read.
- [ ] Wire the test into `src/reporting/verifyRepoChecks.js`.
- [ ] Commit, push.

## Acceptance criteria
- `lib/rebalanceAnalyzer.js::computeRebalancePlan()` is a pure function with full unit-test coverage of the math.
- `scripts/analyze-rebalance.js --portfolio=etf` runs against current state and writes a structured report.
- The report explicitly answers Graham's question: **"What additional cash would I need to rebalance under each scenario?"**
- Tests are deterministic (no live broker calls in the test path).
- All Phase A + adjacent tests still pass.
- Plan + code + tests + generated report committed and pushed.
