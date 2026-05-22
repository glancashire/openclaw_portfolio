# Phase 195 — Dynamic Basket Proposal from Live Holdings/Cash

## Objective
Replace the hardcoded `NEW_BASKET` constant in `scripts/execute-approved-basket-end-to-end.js` with a dynamic basket proposal generated from:
1. Current portfolio holdings (read via the existing holdings sync output).
2. Current settled cash (broker truth).
3. Target sleeve allocations from `portfolio.md`.
4. Live quote refresh for each instrument.

The resulting flow is a single "propose-and-prepare" command the assistant runs that produces the operator-ready basket envelope at `runtime/basket-proposals/<portfolio>/...` plus a friendly preview that includes per-leg price brackets and a clear "Reply approve to transmit" hint.

This converts execution from "edit the script before each round" to "review and approve the proposal".

## Risks / dependencies
- Existing `scripts/propose-instrument-trades-live-priced.js` only sees ETF-sleeve cash (per the earlier finding) — it must be replaced or extended to consider the broker-side settled cash.
- Tick rounding from Phase 194 must apply to proposal limits.
- The proposal must NOT auto-promote into `approved-order-baskets/`; only the operator approval triggers promotion (handled by an existing or new helper).

## Actionable checklist
- [ ] Create `src/execution/basketProposalGenerator.js` exporting `generateBasketProposal({ portfolioDir, rootDir, holdings, cashChf, targetAllocations, liveQuoteFn, now })` returning `{ envelope, deploymentChf, residualChf, summary }`.
- [ ] Use the same tick-rounding helpers from `basketReproposalBuilder.js`.
- [ ] Add `scripts/propose-basket.js` CLI that:
  - Reads `portfolio/etf/portfolio.md` for sleeve targets.
  - Reads `portfolio/etf/holdings.md` for current positions.
  - Asks the broker for refreshed quotes via `client.native.fetchMarketSnapshot`.
  - Calls `generateBasketProposal(...)` and writes the envelope at `runtime/basket-proposals/etf/basket-etf-<timestamp>.json`.
  - Prints a clear human-readable preview.
- [ ] Add an explicit `--save-as-approved` flag (off by default) for the rare case the operator wants to skip the proposal-review step. Default is proposal-only.
- [ ] Tests:
  - Unit: `generateBasketProposal` honors target sleeves, never proposes a leg when residual cash too low.
  - Tick rounding: limit prices land on instrument tick.
  - Integration: dry-run with stubbed quote function produces a valid envelope.

## Acceptance criteria
- Running `node scripts/propose-basket.js --portfolio=etf` (no other args) produces a fresh proposal envelope reflecting the current live state.
- The envelope includes per-leg currency, exchange, primaryExchange, and a tick-rounded limitPrice that's a small markup above ask (or close).
- The CLI ends with "Reply approve and the assistant will save this as an approved basket and run the canonical runner."
- `execute-approved-basket-end-to-end.js` is updated to read the most recent proposal envelope rather than carrying a hardcoded constant.
- All focused tests pass; new generator tests pass.
