# Live Recovery Postmortem — 2026-05-13

## Summary
The ETF portfolio was eventually balanced, but the path there was harder than it should have been because several truths were either split across layers or encoded too implicitly. The biggest problems were not one catastrophic bug; they were compounding mismatches between planner state, native IBKR behavior, CLI/documentation truth, and operator expectations.

## What broke
1. Native IBKR order ids were not seeded from `nextValidId`.
2. Market-data request ids and order ids incorrectly shared one counter.
3. Conid-based orders over-specified symbol/currency metadata and caused IBKR contract conflicts.
4. Tick-size snapping was too naive for live submission.
5. Holdings sync admitted zero-quantity FX helper rows and failed to derive sane fallback values from native positions.
6. Proposal generation parsed CHF cash incorrectly and initially ignored the cash sleeve in allocation math.
7. Stale approvals and excluded rows were not surfaced clearly enough as canonical execution states.
8. Native socket readiness and portal/browser-session readiness diverged, which made contract-lookup troubleshooting confusing.
9. CLI/docs drifted from the implemented reconciliation capability.

## Why it was painful
- Several failures only surfaced after the previous one was fixed, so the real path was hidden behind lower-level bugs.
- Some operator surfaces were truthful in isolation but misleading in priority.
- Native IBKR behavior around UCITS ETF contract resolution is sensitive to over-specified contract hints.
- The repo had enough generated/runtime state that it was easy for stale workflow assumptions to survive longer than they should.

## What fixed it
- Canonical execution-state classification and stale-approval truth.
- Live reconciliation support and safer row matching.
- Cash parsing and allocation fixes in the proposal engine.
- Native IBKR handshake/order-id/request-id separation.
- Minimal conid-contract submission.
- Tick-aware smart-limit snapping.
- Holdings normalization/filtering.
- Live-priced proposal writing through the canonical trade-log path.
- Replacement of SPYL with validated UBS Core S&P 500 line `IE00BD4TXW66` / conid `808613958`.

## Prevention rules
- Treat native socket state and portal session state as separate signals.
- Prefer native raw `contractDetails` before assuming portal login is required for a conid lookup.
- Never share request-id allocation with order-id allocation.
- Never force repo-side symbol/currency hints onto conid orders unless IBKR-confirmed.
- Preserve broker rejection reasons on the fresh row before attempting another live retry.
- Rebuild trade proposals from current holdings/cash after partial fills or cancellations rather than replaying stale intent.

## Still deferred
- A first-class health/self-healing lane with bounded retries and explicit operator-facing divergence reporting remains incomplete.
- Broader multi-portfolio hardening is still secondary to the now-working active ETF path.
