# Fill HTML Mail Follow-Up Plan

Date: 2026-06-02
Scope: Investor-facing `... filled` HTML/text email
Status: completed (2026-06-02)

## Goal
Remove the last low-trust fill-email states:
- `Resulting total held` must not render as `Unavailable` for a normal live fill
- `Portfolio after fill` must not render placeholder `—` values or an effectively empty snapshot

## Current state
The fill-email flow is already on the right path:
- `basketLifecycle.js` no longer sends the investor email with zero-placeholder portfolio data
- `monitor-fills.js` is the canonical sender
- `tradeNotificationEmail.js` already enriches trade and holdings context from `portfolio.md` and `holdings.md`
- `monitor-fills.js` now passes `portfolioDir` so the renderer can use approved instruments and holdings snapshot data

The remaining problem is not architecture. It is readiness and fallback discipline.

## Observed gaps
### 1. `Resulting total held` is still allowed to fall back to `Unavailable`
Today `normalizeFilledTrade(...)` resolves `resultingTotalHeld` from the best available holding match. If the fill arrives before the refreshed holdings snapshot is trustworthy, or the identity match still misses, the renderer emits `Unavailable`.

That is the wrong user-facing fallback for a normal post-fill receipt.

### 2. `Portfolio after fill` can still render with low-trust values
`buildTradeEmailHtml()` and `buildTradeEmailText()` always render the `Portfolio after fill` section. If `totalValueChf`, `cashChf`, or holdings rows are missing or partially hydrated, the section can degrade into dashes or a thin/empty snapshot.

That weakens trust in the whole message.

## Recommendation
Keep `monitor-fills.js` as the only investor-facing sender, but add a strict readiness gate:
- if `resultingTotalHeld` is not known, do not send the investor email yet
- if `Portfolio after fill` is not backed by trusted totals plus at least a minimally hydrated holdings snapshot, do not render that section yet
- prefer a short retry/delay over sending a low-trust investor email

For investor mail, delayed-and-correct is better than immediate-and-vague.

## Implementation plan
### Phase A — define a trust contract for post-fill emails
Primary files:
- `lib/tradeNotificationEmail.js`
- `lib/tradeExecutionNotifier.js`
- likely new helper in `src/reporting/` if the readiness logic grows

Tasks:
1. Add explicit readiness flags to the normalized context:
   - `hasResultingTotalHeld`
   - `hasTrustedPortfolioTotals`
   - `hasTrustedPortfolioHoldings`
   - `portfolioAfterFillReady`
2. Define `portfolioAfterFillReady` conservatively:
   - total value is finite
   - cash is finite
   - holdings array is non-empty
   - at least the filled instrument row is present with symbol, name, units, and value
3. Define the investor-email send rule:
   - normal live fill mail requires `hasResultingTotalHeld`
   - normal live fill mail requires `portfolioAfterFillReady`

Acceptance:
- the code can distinguish between `data missing but likely coming shortly` and `data trustworthy enough to send`

### Phase B — tighten `resultingTotalHeld` resolution
Primary files:
- `src/reporting/investorReportingData.js`
- `lib/tradeNotificationEmail.js`
- `scripts/monitor-fills.js`

Tasks:
1. Extend holding matching priority for the filled instrument:
   - broker local symbol
   - broker symbol
   - ISIN / `tickerOrIsin`
   - conid
   - approved-instrument metadata aliases
2. When a portfolio holding row already contains `quantityHeld` / `quantity` / `position`, prefer that row before falling back to snapshot-only matching.
3. In `monitor-fills.js`, ensure the filled instrument can be matched even if IBKR returns only symbol-level position data and the disk snapshot still uses ISIN/local symbol naming.
4. Add a specific regression case where the trade symbol and the holdings snapshot identifier differ but still refer to the same instrument.

Acceptance:
- a normal live fill no longer reaches the renderer with `resultingTotalHeld == null`
- `Resulting total held` is populated for symbol/local-symbol/ISIN mismatch cases

### Phase C — gate or suppress low-trust `Portfolio after fill`
Primary files:
- `lib/tradeNotificationEmail.js`
- `lib/tradeExecutionNotifier.js`

Tasks:
1. Stop unconditional rendering of `Portfolio after fill`.
2. Apply this behavior order:
   - if portfolio snapshot is trusted: render the section normally
   - if portfolio snapshot is not trusted but likely pending: do not send the investor email yet
   - only for explicit backfill/debug cases, allow a reduced receipt without the section
3. Remove any path that can produce `Portfolio value: CHF —`, `Cash balance: CHF —`, or an effectively empty portfolio table in a live investor mail.

Acceptance:
- a live investor fill email never contains placeholder dashes in `Portfolio after fill`
- a live investor fill email never contains the section with no meaningful holdings snapshot

### Phase D — add retry behavior in the canonical sender
Primary files:
- `scripts/monitor-fills.js`
- maybe `src/reporting/fillNotificationState.js` if retry state needs a small extension

Tasks:
1. When readiness fails, do not mark the fill as notified.
2. Log a structured reason such as:
   - `pending_resulting_total_held`
   - `pending_portfolio_after_fill_snapshot`
3. Allow the next monitor pass to retry automatically after holdings/account state settles.
4. If needed, add a short local re-fetch inside the same pass before giving up:
   - refresh positions
   - refresh account summary
   - rebuild context once

Acceptance:
- normal races between execution and holdings refresh resolve on the next monitor pass without sending a degraded email

### Phase E — tests
Primary files:
- `tests/test-tradeNotificationEmail.js`
- `tests/test-tradeExecutionNotifier.js`
- `tests/test-monitorFills.js`
- add a focused script-level regression if needed

Add tests for:
1. `Resulting total held` is present when the filled instrument exists in hydrated holdings
2. local-symbol / ISIN / conid cross-match still resolves the position quantity
3. live investor email is skipped or deferred when `resultingTotalHeld` is missing
4. live investor email is skipped or deferred when portfolio totals/holdings are not trusted
5. `Portfolio after fill` never renders `—` in the live-ready path
6. backfill mode behavior is explicit and separated from live investor guarantees

Acceptance:
- regression tests pin the no-`Unavailable` / no-`—` contract for live fill mail

## File targets
Likely touch list:
- `lib/tradeNotificationEmail.js`
- `lib/tradeExecutionNotifier.js`
- `scripts/monitor-fills.js`
- `src/reporting/investorReportingData.js`
- `src/reporting/fillNotificationState.js` only if retry metadata becomes necessary
- `tests/test-tradeNotificationEmail.js`
- `tests/test-tradeExecutionNotifier.js`
- `tests/test-monitorFills.js`

## Verification
1. Unit tests for matching and readiness logic
2. Rendered HTML/text fixture where the filled instrument exists and all values are present
3. Rendered HTML/text fixture where data is not ready yet and the send is deferred
4. Safe-lane test run after implementation

## Success criteria
A normal live investor fill email should always satisfy both:
- `Resulting total held` shows the real post-fill position size
- `Portfolio after fill` shows real total value, real cash, and a meaningful holdings snapshot

If those values are not ready yet, the email should wait rather than guess.
