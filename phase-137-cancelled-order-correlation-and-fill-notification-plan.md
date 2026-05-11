# Phase 137 — Cancelled Order Correlation and Fill Notification Truth

## Goal
Close the remaining post-submit truth gap by making cancelled broker outcomes operator-visible with precise correlation evidence, and verify fill-notification surfaces reflect reconciled fills/cancellations without pretending unmatched broker rows are exact matches.

## Why this phase exists
Phase 136 made execution reconciliation materially better, but one important gap remains:
- SPYL (`9105`) is surfaced only as `not_found` with completed-order hints because IBKR completed orders expose `permId`/symbol/status but not the original order id.
- Operator surfaces should distinguish:
  1. exact reconciliation,
  2. probable broker-cancelled evidence,
  3. genuinely unknown/missing broker state.
- Fill notification / delivery truth should be rechecked now that EMUAA is correctly reconciled as filled.

## Scope
1. Audit current cancelled-order correlation and lifecycle rendering paths.
2. Add a conservative evidence-based correlation path for completed-order cancellations when exact order-id matching is unavailable.
3. Keep automatic row mutation conservative unless the evidence is strong enough.
4. Verify operator surfaces clearly distinguish matched, hinted, and unresolved outcomes.
5. Verify fill-notification / delivery state reflects the reconciled fill and does not misreport cancellation ambiguity.

## Actionable checklist
- [ ] Inspect reconciliation and lifecycle surfaces for cancelled/not-found broker outcomes.
- [ ] Define conservative correlation rules for completed-order hints (symbol/quantity/side/recency/permId evidence where available).
- [ ] Implement exact-vs-probable cancelled outcome representation.
- [ ] Add focused regression tests for:
  - exact fill still wins over completed-order hints
  - probable cancelled evidence is surfaced distinctly from generic not_found
  - unresolved rows remain unresolved when evidence is weak
- [ ] Re-run canonical status / preflight / relevant reporting surfaces.
- [ ] Inspect notification/delivery/report outputs for truthful post-fill state.
- [ ] Commit and push once passing.

## Verification target
- `trade status` and related operator surfaces should no longer flatten SPYL into an unqualified generic miss if broker-cancelled evidence exists.
- EMUAA remains correctly filled.
- UBSSLI remains executable / ready.
- Notification truth surfaces remain internally consistent.

## Out of scope
- New live submissions without renewed operator intent.
- Aggressive heuristic auto-matching that could mutate the wrong trade row.
