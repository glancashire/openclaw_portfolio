# Phase 158 — Portfolio Investor Email Redesign Plan

## Objectives

1. Integrate the new investor holdings normalization into the portfolio summary artifact model.
2. Add an explicit investor-facing holdings payload to `summary.json` for report rendering.
3. Redesign the portfolio investor email so it matches the requested casual-investor experience:
   - management summary first
   - no redundant repetition
   - clear next-step guidance
   - readable held-instruments table with symbol and name
   - total summary line
   - graceful handling when cost basis / gain fields are unavailable
4. Preserve compatibility with existing summary artifact generation and delivery flows.

## Risks / Dependencies

- `summaryArtifacts.js` is central and already broad; changes must stay additive and low-risk.
- Current holdings source data still lacks guaranteed per-holding cost basis in the canonical path, so rendering must clearly degrade without looking broken.
- Existing tests mostly validate artifact presence rather than investor readability; this phase needs stronger rendering assertions.
- Avoid duplicating information between headline metrics, management summary, and the holdings table.

## Actionable checklist

### Data-model integration
- [ ] Import the investor holdings normalization module into `summaryArtifacts.js`.
- [ ] Add an `investorHoldings` section to the structured summary model.
- [ ] Populate investor-facing row fields from holdings + history sources.
- [ ] Carry availability flags so rendering can choose clear fallbacks.

### Portfolio email redesign
- [ ] Add a dedicated investor holdings table renderer in `reportEmail.js`.
- [ ] Include requested columns where available:
  - [ ] symbol
  - [ ] name
  - [ ] quantity
  - [ ] average buy price
  - [ ] latest traded price
  - [ ] total value
  - [ ] gain since purchase
  - [ ] YTD
  - [ ] value in CHF
  - [ ] gains in CHF
- [ ] Add a total/summary line beneath the holdings table.
- [ ] Add a concise “next step to improve the portfolio” presentation.
- [ ] Keep the HTML mobile-friendly and visually consistent with the existing brand layer.
- [ ] Improve the text fallback version with the same investor-oriented structure.

### Tests
- [ ] Add unit/integration coverage for structured summary investor-holdings payload.
- [ ] Add rendering tests for the portfolio email HTML.
- [ ] Add regression coverage for missing-data placeholders.
- [ ] Re-run existing reporting artifact tests.

### Verification
- [ ] Run focused reporting/email tests until green.
- [ ] Run the full test suite.
- [ ] Clean unrelated generated/runtime artifacts before commit.

## Acceptance criteria

- `summary.json` exposes a stable investor-facing holdings payload.
- Portfolio email HTML includes a readable holdings table with symbol and name.
- The report includes a management summary, a next-step recommendation, and a total summary line.
- Missing average-buy-price / YTD / gain fields render clearly and safely rather than fabricating values.
- Focused reporting tests pass.
- Full test suite passes.
- Changes are committed and pushed cleanly.
