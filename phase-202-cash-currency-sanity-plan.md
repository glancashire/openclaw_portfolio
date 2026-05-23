# Phase 202 — Native-currency deployment annotation

## Objective
The proposal generator currently outputs CHF-equivalent estimates per leg, but most legs are non-CHF (EUR for SXR8/EMUAA, CHF for CHSPI/SPMCHA). Graham's broker account is base CHF, so every non-CHF buy implies an automatic FX conversion. Today's basket added 3 EUR.CHF FX trades around the EMUAA/SXR8 fills.

Make this visible at proposal time:
- Add `nativeAmount` to each leg (qty × limitPrice in native currency).
- Add `currencyDeployment` summary to envelope (`{ CHF: 0, EUR: 1234.56 }`).
- Print it in the CLI preview.

This isn't a hard sanity gate — it's transparency. Operator can see at a glance: "this basket needs ~EUR 12k of FX conversion" before approving.

## Risks / dependencies
- None significant. Pure annotation.

## Actionable checklist
- [ ] Add `nativeAmount` (qty × limitPrice, no FX) to each leg in `buildLeg`.
- [ ] Compute `currencyDeployment` aggregate over legs and stamp on envelope.
- [ ] CLI prints currency deployment line above legs.
- [ ] Tests:
  - Proposal has `nativeAmount` per leg.
  - `currencyDeployment` aggregates correctly across multi-currency legs.

## Acceptance criteria
- Proposal envelope leg has `nativeAmount`.
- Envelope has `currencyDeployment: { <ccy>: amount }`.
- 24+ focused tests still pass.
