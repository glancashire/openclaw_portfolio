# Phase 130 — CSPX Entitlement Branch Clarity

## Goal
Make the CSPX market-data entitlement / delayed-data failure surface explicit and operator-useful across market-open execution and canonical preflight, instead of collapsing into a generic `limit_price_unavailable` block.

## Why this phase exists
After Phase 129, only CSPX remains excluded from executable approved rows. The underlying broker response is specific:
- `Requested market data is not subscribed. Displaying delayed market data.`

But the current operator-visible block reason often degrades into the generic:
- `Could not determine a smart limit price from broker quote data.`

That hides the real operational action: this is an entitlement/delayed-data issue, not a mysterious pricing parser failure.

## Scope
- Trace how IBKR pricing errors are surfaced into market-open block codes.
- Preserve specific entitlement/delayed-data semantics when quote fetch fails that way.
- Add focused regression coverage for this branch.
- Verify canonical preflight and dry-run surface the clearer reason.

## Non-goals
- Do not bypass broker entitlements.
- Do not synthesize unsafe limit prices for CSPX.
- Do not auto-submit live orders.

## Actionable checklist
- [ ] Trace quote-fetch error propagation from `pricing.js` into `submit-orders-at-open.js`.
- [ ] Define a dedicated operator-facing block code/reason for entitlement-delayed quote failures.
- [ ] Implement the smallest safe propagation change.
- [ ] Add focused regression tests for the entitlement branch.
- [ ] Verify dry-run surfaces the precise CSPX block reason.
- [ ] Verify preflight exposes the same blocked-row truth.
- [ ] Iterate until targeted checks pass.
- [ ] Commit Phase 130 plan + implementation.
- [ ] Push Phase 130.

## Verification gates
- focused pricing / runner regression tests
- `node scripts/submit-orders-at-open.js portfolio/etf --dry-run`
- `node scripts/trade.js preflight portfolio/etf --json`
- direct CSPX quote probe if needed

## Exit criteria
- CSPX remains safely blocked.
- The operator-facing reason clearly identifies the entitlement/delayed-data branch.
- Canonical truth surfaces agree on that reason.
