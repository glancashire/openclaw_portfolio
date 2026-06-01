# Phase J — Quote identity reconciliation and cost-basis fallback hardening

## Objective
Fix remaining rows that still show degraded quote posture or cost-basis gaps by reconciling holdings rows to approved instruments more reliably, preferring filled-trade-derived cost basis first and IBKR avg-cost sidecar fallback second when broker sync is unavailable.

## Current diagnosis
- EMUAA does have cost basis (`trades.md`) and a resolved unrealized P/L.
- The remaining degraded row is caused by quote-identity mismatch: the holdings row is keyed as IBKR conid `243939970` / display name `EMUAA`, while the approved instrument is keyed under ISIN `LU0950668870` with symbol `EMUAA`.
- The current quote resolver does not match this row back to the approved instrument strongly enough, so Yahoo symbol mapping never activates.

## Risks / dependencies
- Identity reconciliation touches symbol/conid/ISIN matching, so false-positive joins would be dangerous.
- Must preserve current successful cost-basis behavior.
- Need regression tests for conid/symbol/ISIN cross-matching and fallback ordering.

## Action checklist
- [ ] Strengthen approved-instrument lookup for quote resolution using conid, symbol, local symbol, ISIN, and normalized display-name candidates.
- [ ] Ensure cost-basis fallback ordering stays: filled trades first, then avg-cost sidecar/IBKR-derived fallback.
- [ ] Fix the card renderer summary counts so coverage is read from the right summary fields.
- [ ] Add regression tests for EMUAA-style conid keyed holdings rows.
- [ ] Regenerate summary/dashboard artifacts and verify EMUAA resolves to market-close fallback when available.
- [ ] Run focused tests, safe lane, and repo verification.

## Acceptance criteria
- EMUAA-style rows resolve to the approved instrument identity and pick up market-close fallback quotes when available.
- Cost-basis is derived from filled trades when present, otherwise from avg-cost sidecar fallback.
- Card view coverage/P&L summary fields are correct.
- Verification passes and the phase is committed/pushed.
