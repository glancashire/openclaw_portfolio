# Phase 179A Plan — Canonical Venue/Contract Diagnostics and Pre-Submit Truth Surface

## Objectives
- Remove generic `EBS` assumptions from the ETF market-open submit path when instrument metadata specifies another primary venue.
- Create a reusable pre-submit diagnostic surface that shows exact approved-instrument metadata, resolved contract venue fields, timing policy, and final live payload.
- Parse and expose IBKR `tradingHours` / `liquidHours` for executable rows before live submit.
- Strengthen preflight so operator warnings appear before submission instead of after a broker reject.

## Current state analysis
- `portfolioExecution.prepareOrderForSubmission()` already respects `instrument.ibkrPrimaryExchange`.
- `scripts/submit-orders-at-open.js` still derives `primaryExchange` from `instrument.exchange.includes('EBS')`, which is wrong for UBSPX (`IBIS / SMART`).
- `scripts/submit-orders-at-open.js` and `liveReadinessPreflight.evaluateMarketWindow()` still use `EBS` as the generic market-open gate.
- We have a local markdown exchange-hours reference, but it is not yet structured or used by code.
- Native client now preserves late broker error detail for `Inactive`, but diagnostics before submit are still weak.

## Risks / dependencies
- Timezone/venue-hours parsing can be subtly wrong.
- Contract details may differ from approved metadata and need explicit mismatch handling.
- We must avoid breaking already-working SIX/Xetra-adjacent paths while generalizing venue handling.
- Repo is already dirty, so phase commits must be scoped carefully and verified by diff/test evidence.

## Actionable checklist
- [ ] Add reusable execution diagnostic helper(s) to synthesize:
  - approved instrument metadata
  - prepared order payload
  - resolved exchange / primaryExchange
  - contract details (when available)
  - parsed liquid/trading hours
- [ ] Patch `scripts/submit-orders-at-open.js` to use approved metadata fields directly (`ibkrPrimaryExchange`, exchange metadata) instead of the current `EBS` heuristic.
- [ ] Extend preflight/readiness with per-executable-row venue truth and hours-based warnings.
- [ ] Persist pre-submit diagnostic artifacts under `runtime/`.
- [ ] Add tests for:
  - venue resolution from approved metadata
  - hours parsing
  - UBSPX payload synthesis
  - no regression for UBSSLI / EMUAA
- [ ] Run targeted tests continuously until green.
- [ ] Run full test suite before phase close.

## Acceptance criteria
- A diagnostic output exists for executable ETF rows showing conid, symbol, exchange, primaryExchange, timing flags, and parsed IBKR hours.
- UBSPX no longer inherits an `EBS`-shaped submission assumption in the market-open path.
- Preflight can explain venue-open / closed / outside-liquid-hours state per executable row.
- Targeted tests and full suite pass.
