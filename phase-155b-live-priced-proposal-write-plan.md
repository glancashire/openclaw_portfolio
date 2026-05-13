# Phase 155B live-priced proposal write plan

## Goal
Persist fresh live-priced instrument proposals into `portfolio/etf/trades.md` using the repo's normal trade-log writer so stale approved rows can be superseded by a truthful pending approval row.

## Why
- `scripts/write-trade-proposals.js` currently writes draft-priced proposals only.
- We now have healthy IBKR connectivity and live quote recovery for `CH0032912732`.
- The next safe step toward execution is to record a fresh pending proposal row using live pricing, then approve that row via the existing approval workflow.

## Steps
1. [x] Add a `--live-priced` option to `scripts/write-trade-proposals.js`.
2. [x] When set, use `proposeInstrumentTradesLivePriced(...)` instead of `proposeInstrumentTrades(...)`.
3. [x] Verify with:
   - `node scripts/test-trade-proposal-cash-parse.js`
   - `node scripts/write-trade-proposals.js portfolio/etf --live-priced`
   - inspect `portfolio/etf/trades.md`
4. [x] Approve the fresh pending row using existing approval tooling.
5. [x] Rerun `trade.js preflight --json`.
6. [x] Only if preflight is clean, arm and submit via canonical CLI.

## Outcome
This lane was completed and led directly into the live execution retry work. The planner now writes truthful live-priced proposal rows through the canonical trade-log writer, making stale approvals refreshable through the normal approval path.
