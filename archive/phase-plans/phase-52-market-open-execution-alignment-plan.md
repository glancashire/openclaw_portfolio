# Phase 52 — Market-Open Execution Alignment

## Goal
Ensure the market-open execution path submits the latest approved/improved portfolio trades rather than a hard-coded order list.

## Problem
`scripts/submit-orders-at-open.js` currently uses a static `TRADES` array and bypasses the staged/approved trade lifecycle. That means improved proposals can exist without ever being the orders sent at market open.

## Desired outcome
- Market-open execution reads the latest approved/staged trade records for the target portfolio.
- It applies live pricing and smart limits to those actual approved trades.
- It refuses to submit trades that are blocked, stale, unapproved, or already in-flight.
- It leaves an auditable trail in `trades.md` and runtime events.

## Actionable checklist
- [ ] Replace hard-coded market-open trade list with portfolio-backed approved/staged trade loading
- [ ] Add helper(s) to read executable approved trades from `trades.md`
- [ ] Ensure blocked / rejected / already-submitted rows are excluded
- [ ] Preserve smart pricing logic for executable rows only
- [ ] Wire submission through execution-policy-aware path instead of bypassing it
- [ ] Add tests for market-open runner using approved trade rows
- [ ] Add tests proving hard-coded drift from proposal is no longer possible
- [ ] Run targeted tests
- [ ] Fix failures until green
- [ ] Commit and push

## File targets
- `scripts/submit-orders-at-open.js`
- `src/execution/tradeState.js`
- `src/execution/portfolioExecution.js` if needed
- `scripts/test-trading-guards.js`
- `scripts/test-writable-live-lane-acceptance.js`
- new test for approved-trade market-open selection

## Acceptance criteria
- Market-open execution uses the latest actionable trade rows from the portfolio lifecycle.
- Improved approved trades are the ones prepared for submission.
- No stale hard-coded trade list remains in the live path.
- Tests pass.
