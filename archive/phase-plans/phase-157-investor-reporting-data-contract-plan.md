# Phase 157 — Investor Reporting Data Contract Plan

## Objectives

1. Create a normalized **investor reporting data contract** for held instruments and fill notifications.
2. Add a shared parser/service that can extract the best available per-holding data from current portfolio artifacts.
3. Support the portfolio report redesign with explicit, reliable fields for:
   - symbol
   - name
   - quantity held
   - average buy price when available
   - latest price
   - total value
   - gains since purchase when derivable
   - CHF value
   - CHF gains when derivable
   - YTD when available, otherwise safe fallback
4. Support the fill/purchase report redesign with explicit fields for:
   - symbol
   - name
   - quantity purchased
   - unit price
   - total cost
   - CHF cost including commission when available
   - resulting total held when available
5. Preserve compatibility with existing summary/report generators and degrade gracefully when source data is incomplete.

## Risks / Dependencies

- The canonical `holdings.md` format does not currently include average buy price or unrealized gain in the normal generated path.
- Some tests and older fixtures use alternate holdings table formats; parser logic must tolerate these without breaking current behavior.
- YTD data does not appear to have a single current canonical source, so phase 157 must treat it as optional rather than fabricated.
- Fill commission is currently partially implicit (`fees` in notification paths, `Actual CHF` in trade rows) and may require cautious normalization rules.
- Reporting code is already broad; avoid invasive rewrites before the shared contract is proven by tests.

## Actionable checklist

### Discovery-to-contract
- [ ] Define a shared `investorReportingData` module under `src/reporting/` or `src/lib/`.
- [ ] Specify normalized shapes for:
  - [ ] held instrument rows
  - [ ] fill / purchase summary rows
  - [ ] optional availability flags / notes

### Holdings normalization
- [ ] Parse current canonical holdings table format from `holdings.md`.
- [ ] Tolerate older/alternate holdings table variants seen in existing tests.
- [ ] Normalize quantity, latest price, currency, CHF value, allocation, target, drift.
- [ ] Detect and capture cost-basis / unrealized P&L fields when present in alternate formats.
- [ ] Derive average buy price from cost basis + quantity when possible.
- [ ] Emit safe `null`/`—` compatible values when unavailable.

### Fill / purchase normalization
- [ ] Parse relevant trade row data for fills/purchases.
- [ ] Normalize symbol, instrument name, filled quantity, unit price, gross cost, actual CHF.
- [ ] Prefer commission-inclusive CHF cost when it can be inferred safely.
- [ ] Expose resulting total held when derivable from holdings state.
- [ ] Include explicit flags when totals/cost basis are estimates vs confirmed values.

### Tests first / alongside
- [ ] Add unit tests for canonical holdings parsing.
- [ ] Add unit tests for alternate-format holdings parsing.
- [ ] Add unit tests for average-buy-price derivation.
- [ ] Add unit tests for safe missing-data fallbacks.
- [ ] Add unit tests for fill normalization and commission-inclusive cost handling.
- [ ] Add regression tests to ensure existing summary/report generators still work with the new module present.

### Integration safety
- [ ] Wire the new module into at least one non-user-facing reporting path or direct test harness to prove compatibility.
- [ ] Run focused existing reporting tests.
- [ ] Run the full test suite before phase completion.

## Acceptance criteria

- A shared investor-reporting data module exists and is covered by comprehensive tests.
- Held-instrument normalization works for the current canonical holdings snapshot format.
- Older/alternate holdings formats used by existing tests do not regress.
- Average buy price and CHF gain are derived only when supported by input data.
- Missing YTD / cost basis / commission data is handled explicitly and safely, without invented values.
- Fill normalization exposes the fields needed for the later fill/purchase report redesign.
- Existing reporting tests pass, and the full suite passes before completion.
