# Phase A1 — history.md "Net deposited CHF" column

Date: 2026-06-03
Owner: bb8 / Graham
Status: ACTIVE
Source: `CURRENT_PLAN.md` Phase A

## Objective

Add a new `Net deposited CHF` column to `history.md` so each daily/end-of-day row carries the cumulative net-deposited capital as-of that date. This makes the user-visible "value vs money put in" math reconcilable at every point in the history, not just in the latest digest send.

## Why additive (not repurposing `Invested CHF`)

The existing `Invested CHF` column means "cost basis of currently-held positions in CHF" and is consumed by:

- `src/reporting/historyDigest.js` (parses index 4 of each row)
- `scripts/propose-basket.js` (parses index 4 of each row)
- Implicit assumption baked into `src/analysis/historyWriter.js` ("Invested value CHF" → column 4)

Repurposing that column would silently break every consumer. **Additive** keeps backward compatibility and gives readers a clean new field.

## Risks / dependencies

- `src/markdown/fileContracts.js` defines the canonical history header — must update to include the new column.
- `src/analysis/historyWriter.js` writes new history rows — must compute net-deposited as-of `today` from the deposits ledger.
- `src/reporting/historyDigest.js` parses rows — must read the new column when present, fall back to `null` for legacy rows.
- All existing `history.md` files (~1 row per portfolio with hundreds of historical rows) need a one-time backfill helper that walks each row's date through the deposits ledger.
- Breaking change risk: any test that asserts `history.md` header or row column counts.

## Implementation checklist

- [ ] Update `src/markdown/fileContracts.js` history header to add `Net deposited CHF` after `Invested CHF`.
- [ ] Add `lib/depositsLedger.js#netDepositedAsOf(entries, isoDate)` helper that sums deposits − withdrawals on or before a given date.
- [ ] Update `src/analysis/historyWriter.js#appendHistorySnapshot` to:
  - Accept optional `portfolioDir` / `depositsTotalsAsOf` hint
  - Compute net deposited as-of `today` and emit it as the new column
  - Default to empty string when no deposits ledger is present (backward-compatible, no breakage)
- [ ] Update `src/reporting/historyDigest.js#parseNetLiqRow` to read the new column at index 5 (Notes shifts to 8) and surface as `netDepositedChf`. Tolerate missing column for legacy rows.
- [ ] Update `scripts/propose-basket.js` reader if the column-index shift impacts it (verify first; many of these readers use named-column lookups).
- [ ] Add `scripts/backfill-history-net-deposited.js` (writes `Net deposited CHF` into existing rows, computed by walking the ledger as-of each row's date).
- [ ] Run backfill on `portfolio/etf/history.md`.
- [ ] Add regression test `scripts/test-history-net-deposited-column.js` covering:
  - New header includes the column
  - `appendHistorySnapshot` writes the new column
  - `historyDigest` parses the new column
  - Backfill helper computes correct cumulative deposits for sample dates
  - Missing-ledger path is no-op (empty value, no crash)
- [ ] Update `scripts/discover-test-suites.js` manifest.

## Acceptance criteria

- `portfolio/etf/history.md` contains a `Net deposited CHF` column populated with cumulative net deposited as-of each row's date.
- 2026-04-27 row shows 5,000 (first deposit landed that day).
- 2026-06-03 latest row shows 120,000 (all deposits landed).
- `npm test` 23/23 still green.
- `npm run test:safe` 238/238 still green.
- New `test-history-net-deposited-column.js` passes.
- No downstream consumer breaks.
