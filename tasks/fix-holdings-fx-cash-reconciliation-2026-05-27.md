# Fix holdings FX cash reconciliation (2026-05-27)

## Objective
Correct ETF holdings sync so non-CHF positions are converted into CHF before writing `portfolio/etf/holdings.md`, allowing totals to reconcile with IBKR NetLiquidation and preventing cash from appearing "missing".

## Findings
- IBKR account `U25624150` currently has:
  - CHF cash only: `CashBalance=7153.88 CHF`
  - EUR cash: `0.00`
  - `GrossPositionValue=43137.25 CHF`
  - `NetLiquidation=50291.13 CHF`
- Current holdings sync writes EUR market values directly into the `Value CHF` column without FX conversion.
- This overstates invested value (`45815.15`) vs IBKR gross position value (`43137.25`) by ~CHF 2.68k.
- Cash is not missing; display math is wrong.

## Plan
- Update holdings sync / snapshot pipeline to carry FX rate to CHF per holding.
- Convert non-CHF `marketValue` into CHF for output totals and `Value CHF` column.
- Show FX rate in the holdings table.
- If multiple cash currencies exist in ledger, surface them explicitly; otherwise keep a single CHF cash line.
- Add regression tests.

## Acceptance
- `portfolio/etf/holdings.md` shows EUR rows with FX rate + CHF-converted value.
- Total invested CHF approximately matches IBKR `GrossPositionValue`.
- Total portfolio CHF approximately matches IBKR `NetLiquidation`.
- Cash section clearly shows one CHF cash line unless multiple currencies exist.
- `npm test` passes.
