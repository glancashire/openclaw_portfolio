# Phase 190 — Cancelled-Leg Reproposal Hook

## Objective
After reconciliation, automatically generate a fresh reproposal artifact for any cancelled legs:
- Pull the latest live quote for each cancelled instrument.
- Compute a fresh limit price (small bump above ask, or above last close if no ask).
- Emit a reproposal envelope at `runtime/basket-reproposals/etf/<approval-id>-reproposal-<n>.json`.
- Surface a clear "needs single new approve" signal.

The reproposal is NEVER auto-transmitted. Only the operator typing `approve` causes execution. This stays consistent with the one-approval-per-round rule.

## Risks / dependencies
- Live quote fetch requires the IB Gateway to be authenticated and within a market window.
- If the quote feed is unavailable, the reproposal must degrade gracefully (use last close + slightly larger bump).
- The reproposal artifact must use the same envelope schema as the canonical approval store so the existing runner can execute it directly once approved.

## Actionable checklist
- [ ] Add `src/execution/basketReproposalBuilder.js` with `buildReproposalForCancelledLegs({ portfolio, approvalId, runState, quoteFn, now })`.
- [ ] Quote fetch via the native client `fetchMarketSnapshot([conid])` with last-close fallback.
- [ ] Limit-price strategy: `ask × 1.005` (50bps) if ask available; otherwise `lastClose × 1.0075` (75bps).
- [ ] Tick-size rounding: round up to nearest 0.05 CHF for SIX-listed instruments (CH ISIN), nearest 0.01 EUR otherwise.
- [ ] Wire the builder into `execute-approved-basket-end-to-end.js` so reconcile-mode emits a reproposal whenever there are cancelled legs.
- [ ] Print the reproposal summary at end of run with the path and a one-line "approve" hint.
- [ ] Unit tests for the limit-price helper (`computeBumpedLimitPrice`), tick rounding helper, and the integration of the builder.
- [ ] No auto-transmit; operator must explicitly approve.

## Acceptance criteria
- After a reconcile run with at least one cancelled leg, a reproposal envelope exists at `runtime/basket-reproposals/etf/<approval-id>-reproposal-1.json` with one leg per cancelled order.
- Each leg's limit price is strictly higher than the previous attempt's limit price (so the reproposal has a chance of filling).
- Re-running reconciliation N more times with the same cancellation does not create duplicate reproposals; the latest reproposal version increments only when the cancelled-set changes or operator forces it.
- Tests for `computeBumpedLimitPrice`, `roundToTick`, and `buildReproposalForCancelledLegs` all pass.
- Existing focused suite stays green.
