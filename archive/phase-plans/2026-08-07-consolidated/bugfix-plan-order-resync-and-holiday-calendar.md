# Plan — fix/order-resync-and-holiday-calendar

## Bug 1: Resync misses cross-client open orders (e.g., PreSubmitted GTC placed via TWS)
- Root cause: `waitForOpenOrders` calls `api.reqOpenOrders()` which only returns orders for the current API clientId. Orders placed via TWS UI / clientId 0 are never seen, so resync emits `not_found`.
- Fix:
  - In `src/brokers/interactive-brokers/nativeClient.js`, change `waitForOpenOrders` to call `api.reqAllOpenOrders()` (one-shot snapshot of all open orders across clients in the account). Keep the same openOrder/openOrderEnd event handling.
  - Ensure `normaliseOrder` keeps the raw status (e.g., `PreSubmitted`); status normalization in `lifecycleStatus.js` already maps PreSubmitted → submitted, which already counts as "still open at broker" downstream, so resync will correctly find/update the row instead of emitting `not_found`.
  - Status enum already covers PreSubmitted/PendingSubmit/ApiPending → submitted; leave that intact.
- Test: add `scripts/test-resync-classifies-cross-client-presubmitted.js`. Mocks `InteractiveBrokersClient` (via require cache override) so `getOrderStatus` returns a PreSubmitted GTC populated as `open_orders` source. Run `resyncPortfolioOrders` against a temp portfolio dir with a trades.md that has a `submitted` row whose Broker order id matches. Assert: result.ok === true, the row is updated to `submitted`/`Approval=submitted_to_broker`, and not classified as `not_found`/`probable_cancelled`.

## Bug 2: Market-calendar sync ignores exchange holidays
- Root causes:
  1. `parseHoursSegments` splits on `:` with destructuring `const [date, hours] = segment.split(':')`, but real IBKR strings look like `20260525:0730-20260525:2300;20260526:CLOSED`. The split yields `['20260525','0730-20260525','2300']`, so `hours = '0730-20260525'`, then `start='0730'`, `end='20260525'`. End time is wrong, but the `closed` detection still works for `:CLOSED` markers — so segments like `20260525:CLOSED` are correctly flagged.
  2. The current artifact does not surface a per-exchange `todayStatus` or `holidays` list, so downstream callers cannot ask "is venue X closed today?" without re-parsing.
  3. When IBKR returns segments only for trading days (skipping holidays entirely — i.e., today not present at all in `tradingHours`), `evaluateHoursState` returns `status: 'unknown'` rather than `closed_holiday`, and there's nothing recorded in any artifact field that calls out the holiday.
- Fix:
  - Harden `parseHoursSegments` to handle the canonical `YYYYMMDD:HHMM-YYYYMMDD:HHMM` form: split on the first `:` only, then parse the `start-end` half by allowing the end to itself be `YYYYMMDD:HHMM`. So a segment like `20260525:0730-20260525:2300` produces `{ date:'20260525', start:'0730', endDate:'20260525', end:'2300', closed:false }`.
  - Add a `parseTradingHoursStatus({ tradingHoursRaw, liquidHoursRaw, now, weekend })` helper that returns one of `open|closed_holiday|closed_weekend|pre_market|post_market|unknown`. Logic:
    - if today is Saturday/Sunday → `closed_weekend`
    - if today appears in segments AND is `closed:true` → `closed_holiday`
    - if today does NOT appear in `tradingHoursSegments` at all (and we have ≥1 segment ≤ today and ≥1 segment ≥ today) → `closed_holiday`
    - if today appears as an open trading window AND now ∈ liquid window → `open`
    - if before liquid open → `pre_market`; if after → `post_market`
    - otherwise `unknown`
  - Add per-instrument calendar row fields:
    - `todayStatus: open|closed_holiday|closed_weekend|pre_market|post_market|unknown`
    - `todayDateKey`
  - Add a derived top-level artifact field `holidaysByExchange: { "<exchange>": ["YYYY-MM-DD", ...] }` collected from any segments flagged `closed:true` plus inferred missing days within a sensible window (e.g., min..max date in supplied segments).
  - Add `holidays: ["YYYY-MM-DD", ...]` aggregated unique union across instruments.
- Test: extend / add `scripts/test-market-calendar-holidays.js`:
  - Feeds a mock tradingHours `'20260522:0900-20260522:1730;20260525:CLOSED;20260526:0900-20260526:1730'` into the parser; asserts the closed segment is detected, today=2026-05-25 yields `todayStatus='closed_holiday'`, the artifact's `holidays` includes `'2026-05-25'`.
  - Feeds tradingHours that simply omits today (gap test): `'20260522:0900-20260522:1730;20260526:0900-20260526:1730'` with today=2026-05-25 (Mon) → `todayStatus='closed_holiday'`.
  - Weekend: today=2026-05-24 (Sat) → `todayStatus='closed_weekend'`.

## Verification
- Run focused tests via .githooks/pre-commit (5 scripts) plus the new test files plus existing market-calendar tests.

## Commits
- One commit each (or one combined commit if cohesive). Branch already created `fix/order-resync-and-holiday-calendar`. No push.
