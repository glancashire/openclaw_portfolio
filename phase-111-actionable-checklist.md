# Phase 111 — Actionable Checklist

## Writable live-ready acceptance
- [ ] Re-check the current writable acceptance lane against the remaining spec gaps
- [ ] Harden writable submission behavior where the current acceptance test still falls short
- [ ] Ensure staged/submitted/transmitted states remain explicit and truthful

## Transmitted reconciliation
- [ ] Add or harden transmitted-live reconciliation coverage for fill / cancel / failure
- [ ] Ensure `trades.md`, `history.md`, and dashboard state stay aligned after each transition
- [ ] Keep all behavior fail-closed when broker results are ambiguous

## Verification
- [ ] Run focused writable acceptance tests
- [ ] Run focused transmitted reconciliation tests
- [ ] Run full repo verification
- [ ] Iterate until all checks pass
