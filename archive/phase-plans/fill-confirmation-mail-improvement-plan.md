# Fill Confirmation Mail Improvement Plan

Date: 2026-06-02
Scope: Trade/fill confirmation email (`BUY/SELL ... filled`) sent after live executions
Status: complete
Completed: 2026-06-02

## Goal
Make the fill-confirmation email investor-usable:
- correct portfolio value and cash after the fill
- correct instrument name and resulting total held
- cleaner layout with tidy, equal-size stat tiles
- no empty or generic workflow wording
- no sections that add noise when there is nothing useful to say

## Observed problems

From the current LCUJ mail and the existing renderer/tests:
- `Portfolio value` and `Cash balance` can render as `CHF 0.00` even when the post-fill portfolio is known.
- `Investor take` repeats the same wrong totals and adds unhelpful workflow text like `no other open orders remain`.
- The stat tiles are uneven because the current grid is content-driven rather than layout-driven.
- `Name unavailable` appears when the fill path does not resolve the instrument name.
- `Cost in CHF including commission` repeats `Total cost` even when the values are identical.
- `Resulting total held` can show `Unavailable` even though the position exists after the fill.
- `What changed` is a generic template (`Cash decreased and the filled instrument weight increased`) rather than a useful post-fill summary.
- `Portfolio after fill` can render with empty totals and an empty list.
- `Execution detail` is low-signal and not useful for the investor version.
- Empty-state open-order language is still rendered when there are no remaining open orders.

## Root causes

### 1. Wrong data source in one notification path
The biggest correctness problem is upstream of the template.

`src/execution/basketLifecycle.js` currently calls `notifyTradeFill(...)` with a placeholder portfolio shell:
- `totalValueChf: 0`
- `cashChf: 0`
- `holdings: []`

That directly explains:
- wrong portfolio value
- wrong cash balance
- missing holdings table content
- `Resulting total held: Unavailable`
- fallback to missing instrument name when no holdings context exists

### 2. Duplicate notification logic with inconsistent context quality
There are two fill-notification paths today:
- `src/execution/basketLifecycle.js` sends immediately with placeholder portfolio data
- `scripts/monitor-fills.js` sends after broker/account inspection with better post-fill context

The second path is closer to what the investor mail should use. The first path is faster but incorrect.

### 3. Renderer always talks even when there is nothing useful to say
`lib/tradeNotificationEmail.js` always renders:
- open-order badge
- open-order section
- `What changed` block
- `Execution detail` section

This causes noisy copy and redundant sections when the fill is already complete and no open orders remain.

### 4. Name/resulting-position enrichment is too weak
The trade renderer currently depends on whatever `trade` and `portfolio.holdings` are passed in.

Weak spots:
- `scripts/monitor-fills.js` builds holdings with `name: ''`
- `normalizeFilledTrade(...)` only resolves `resultingTotalHeld` from the supplied holdings rows
- `basketLifecycle` supplies no holdings rows at all

## Recommended direction

### Recommendation: make post-fill snapshot the canonical investor email source
The investor-facing fill email should only be built from trusted post-fill data.

Preferred approach:
1. Treat `scripts/monitor-fills.js` style broker/account/holdings context as the canonical source for live fill email content.
2. Stop sending the investor-facing email from `basketLifecycle` with placeholder zeroed portfolio data.
3. If immediate notification is still desired from `basketLifecycle`, make it internal-only or queue a follow-up fill event and let the reconciled path send the actual investor mail.

Why this is the right tradeoff:
- correctness matters more than a slightly earlier email
- it removes the `CHF 0.00` / empty portfolio failure mode entirely
- it gives one source of truth for portfolio totals, holdings, and remaining open orders

## Implementation plan

### Phase 1 — unify the fill-notification data contract
Create one trusted post-fill notification context builder.

Primary files:
- `lib/tradeExecutionNotifier.js`
- `lib/tradeNotificationEmail.js`
- `scripts/monitor-fills.js`
- `src/execution/basketLifecycle.js`
- likely a new helper, e.g. `src/reporting/tradeNotificationContext.js`

Tasks:
1. Introduce a context builder that produces a normalized payload for the fill email:
   - trade summary
   - post-fill portfolio totals
   - post-fill cash
   - holdings rows with symbol, name, quantity held, value, allocation, target, drift
   - remaining open orders
   - instrument name and resulting total held for the filled position
2. Build that context from a trusted source in this priority order:
   - current broker/account snapshot and holdings sync output
   - current `holdings.md` / structured holdings snapshot
   - approved instrument metadata / proposal leg metadata for name fallback
3. Remove the investor-facing `notifyTradeFill(...)` call in `basketLifecycle` that passes `{ totalValueChf: 0, cashChf: 0, holdings: [] }`.
4. Either:
   - send only from `monitor-fills.js`, or
   - make `basketLifecycle` wait for a refreshed holdings context before sending.

Recommendation:
- use `monitor-fills.js` as the canonical live sender
- keep `basketLifecycle` as execution/reconciliation only

Verification:
- no fill email path can send `totalValueChf: 0, cashChf: 0, holdings: []` unless explicitly marked internal/test
- resulting context contains a real instrument name for LCUJ
- resulting context contains non-empty `resultingTotalHeld`

### Phase 2 — strengthen data enrichment for name and resulting holdings
Primary files:
- `src/reporting/investorReportingData.js`
- `scripts/monitor-fills.js`
- any approved-instrument/portfolio metadata loader used by the fill path

Tasks:
1. Improve filled-trade normalization so the display name resolves from:
   - `trade.name`
   - proposal leg metadata
   - approved instrument metadata
   - post-fill holdings snapshot
2. Ensure `scripts/monitor-fills.js` populates holding names instead of `name: ''`.
3. Resolve `resultingTotalHeld` from the post-fill holdings snapshot by matching on:
   - local symbol / broker symbol
   - ISIN
   - conid when available
4. Carry quantity-held and cost-basis details into the purchase summary if they are trustworthy.

Verification:
- `Name unavailable` disappears for normal live fills
- `Resulting total held` is populated for normal live fills
- symbol/name matching works for local symbol + ISIN + conid cases

### Phase 3 — simplify the investor-facing mail layout
Primary files:
- `lib/tradeNotificationEmail.js`
- `src/reporting/emailHtml.js`

Tasks:
1. Replace the current metric tile layout with a more stable email-safe 2x2 stat grid.
   Recommendation:
   - use a table-based layout instead of inline-block width heuristics
   - enforce consistent tile padding and minimum content height
2. Keep the top section compact and outcome-oriented.
3. Remove `Execution detail` entirely from the investor version.
4. Only render `Remaining open orders` when `openOrders.length > 0`.
5. Only render open-order badges when `openOrders.length > 0`.
6. Keep section order minimal:
   - summary / investor take
   - stat tiles
   - purchase summary
   - portfolio after fill
   - optional remaining open orders

Verification:
- tiles are equal-width and visually balanced in email markup
- no open-order section/card/pill is present when there are no open orders
- no execution-detail section remains

### Phase 4 — make the copy materially smarter
Primary files:
- `lib/tradeNotificationEmail.js`

Tasks:
1. Rewrite `Investor take` so it is built from real post-fill facts, not generic workflow narration.
   Desired style:
   - filled instrument
   - quantity / price
   - real post-fill portfolio value
   - real cash after fill
   - optionally current weight or resulting units if useful
2. Replace the generic `What changed` block with a useful `After this fill` summary.
   Better examples:
   - `LCUJ increased to 191 units and now represents 5.2% of the portfolio.`
   - `Cash after this fill is CHF 776.80.`
   - `1 open order remains: EMUAA.`
3. Do not mention open-order state at all when there are none.
4. Do not mention empty workflow facts like `no other open orders remain`.
5. If the post-fill context is incomplete, prefer omission over generic filler.

Recommendation:
- fold `What changed` into a short fact block or remove it entirely if it does not add anything beyond `Investor take` + `Portfolio after fill`

Verification:
- no generic `Cash decreased...` text remains
- no `no other open orders remain` copy remains
- no `No remaining open orders require monitoring` copy remains

### Phase 5 — conditional purchase-summary rows
Primary file:
- `lib/tradeNotificationEmail.js`

Tasks:
1. Hide `Cost in CHF including commission` when it is equal to `Total cost`.
2. Keep it only when commission changes the value materially.
3. Preserve the row in text fallback only when distinct.

Verification:
- no duplicate cost rows when fees are zero or already included
- row still appears when `actualChf !== costChf`

### Phase 6 — make `Portfolio after fill` trustworthy or do not send it
Primary files:
- `lib/tradeExecutionNotifier.js`
- `scripts/monitor-fills.js`
- `src/execution/basketLifecycle.js`

Tasks:
1. Require a trusted post-fill snapshot before rendering `Portfolio after fill`.
2. If trusted totals/holdings are not available yet:
   - do not send the investor mail yet, or
   - send a smaller fill receipt and queue a proper post-fill summary once data is ready.
3. Prefer the first option for the investor-facing message.

Recommendation:
- delay/queue the investor-facing fill email until post-fill holdings and cash are loaded

Verification:
- no investor-facing fill email can render empty portfolio totals and an empty holdings list

## Test plan

Update/add tests in:
- `scripts/test-email-html-rendering.js`
- `tests/test-tradeNotificationEmail.js`
- `tests/test-tradeExecutionNotifier.js`
- `scripts/test-trade-notification-backfill-subject.js`
- likely new regression coverage for the basket lifecycle / monitor-fills handoff

Add regression cases for:
1. fill email omits `Execution detail`
2. fill email omits open-order pill/card/copy when no open orders remain
3. fill email resolves the instrument name instead of `Name unavailable`
4. fill email resolves `Resulting total held`
5. fill email hides duplicate commission row when values are identical
6. fill email shows real post-fill portfolio totals/cash
7. basket lifecycle no longer emits a zero-placeholder investor email
8. `What changed` / `After this fill` uses concrete facts instead of generic copy
9. text fallback mirrors the same omission rules and does not mention empty open-order state

## Suggested implementation order
1. Remove/replace the zero-placeholder `basketLifecycle` send path.
2. Build the normalized post-fill notification context.
3. Improve name + resulting-holdings enrichment.
4. Simplify the HTML/text renderer.
5. Add omission rules for empty open-order state and duplicate cost rows.
6. Update tests and generate a live preview from a recent real fill.

## Success criteria
The improved fill-confirmation mail should let Graham understand, within a few seconds:
- what filled
- at what price and size
- what the portfolio is worth after the fill
- how much cash remains after the fill
- what the filled position now looks like
- whether any open orders still matter

It should never again send an investor-facing fill email that shows:
- `CHF 0.00` portfolio value/cash because of placeholder context
- `Name unavailable`
- `Resulting total held: Unavailable` when the position exists
- generic `What changed` filler
- empty open-order language when there are no open orders
- execution-detail clutter that is only useful for operator/debugging

---

## Phase 7 — Beautiful HTML dashboard email (ThemeForest-inspired redesign)

Date added: 2026-06-02
Scope: The periodic dashboard email (`src/reporting/reportEmail.js` / investor weekly overview)
Note: console dashboard (`scripts/show-dashboard.js`) is unchanged — keep as-is.

### Goal
Replace the current investor-overview email with a visually polished, ThemeForest-quality HTML email that is:
- beautiful and modern (card-based, clean typography, restrained palette)
- information-dense but scannable
- stripped of operator noise — only the three sections below survive

### Content contract (keep only these three blocks)

#### 1. Portfolio Value Snapshot (hero card)
| Field | Example |
|---|---|
| Total value CHF | 121'262.87 |
| Cash CHF | 266.81 |
| Invested CHF | 120'996.06 |

#### 2. Profit / Loss (summary strip)
| Field | Example |
|---|---|
| Total unrealized profit CHF | -497.08 |
| Total unrealized profit % | -0.41% |

#### 3. Holdings table (full, sorted by value descending)
Columns:
| Instrument | Value CHF | Cost basis CHF | Profit CHF | Profit % | Weight % |

Add:
- **Weight %** column (holding value / total invested, per row)
- **Sum row** at the bottom (total value, total cost, total profit, total profit %, 100%)

Drop everything else from the email body:
- no operator queue / workflow items
- no broker status / execution posture
- no recommended next step or strategy label
- no "What matters now" / "Immediate priorities"
- no observability, delivery, or approval state

### Design direction (ThemeForest finance dashboard email style)

Inspired by top-selling ThemeForest finance/trading dashboard templates (Moniex, FinVista, Tradebotx, PropVault). Translate their visual language into email-safe inline CSS:

1. **Layout**: single column, max-width 640px, centered, light background (#f8fafc or similar)
2. **Hero card**: portfolio value in a bold accent card with subtle gradient or solid dark (#1e293b) background, white text, rounded corners. Show total value large, cash and invested smaller underneath.
3. **Profit/loss strip**: a compact colored bar below the hero. Green background tint when positive, red/amber tint when negative. Large number + percentage side by side.
4. **Holdings table**:
   - Clean, borderless design with alternating row tint (#f1f5f9 / white)
   - Profit column color-coded: green for positive, red for negative
   - Weight % shown as a subtle inline bar or just the number
   - Sum/total row at bottom with heavier font-weight and top border
   - Instrument column left-aligned, numbers right-aligned
5. **Typography**: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`), 13–14px body, 11px labels
6. **Colors**: muted slate palette for structure, single accent for the hero, semantic green/red only for profit/loss
7. **Footer**: minimal — date generated, one-line "Automated portfolio snapshot" disclaimer

### Technical approach

Primary files:
- `src/reporting/reportEmail.js` — rewrite `buildReportEmailHtml` for the new layout
- `src/reporting/emailHtml.js` — add any new shared helpers (e.g. `heroCard`, `profitStrip`, `holdingsTable`)
- `src/reporting/reportEmail.js` — rewrite `buildReportEmailText` to mirror content-only (no layout)

Tasks:
1. Design the HTML email as a standalone `.html` file first, test in Litmus/Email on Acid or manually in Gmail/Apple Mail.
2. Extract the inline-CSS patterns into `emailHtml.js` helpers.
3. Rewrite `buildReportEmailHtml` to compose from:
   - `heroCard({ totalValue, cash, invested })`
   - `profitStrip({ profitChf, profitPct })`
   - `holdingsTable({ rows, totals })` — rows sorted by value desc, with weight % and sum
4. Rewrite `buildReportEmailText` to output the same three blocks as plain text.
5. Update tests in `scripts/test-email-html-rendering.js` and `scripts/test-report-email-rendering.js`.
6. Generate a live preview from current portfolio data and visually inspect.

### Data source

The data is already available from `collectPortfolioSummary()`:
- `summary.holdings.totalValueChf` / `.cashChf` / `.investedChf`
- `summary.profitLoss.rows[]` with `.symbol`, `.valueChf`, `.costBasisChf`, `.unrealizedProfitChf`, `.unrealizedProfitPct`
- `summary.profitLoss.totals` with `.totalUnrealizedProfitChf`, `.totalUnrealizedProfitPct`
- Weight % = `row.valueChf / summary.holdings.investedChf * 100`

No new data pipeline work is needed — just wiring the existing fields into the new template.

### Verification
- Generated HTML renders correctly in Gmail (web + mobile), Apple Mail, Outlook 365
- All numbers match `show-dashboard.js` output (same source data)
- No operator/workflow/status noise appears in the email
- Text fallback is clean and contains the same three data blocks
- Holdings sum row matches the hero card total
- Weight % column sums to ~100% (rounding aside)
- Console dashboard (`scripts/show-dashboard.js`) remains unchanged

### Email client compatibility notes
- All styles must be inline (no `<style>` block — many clients strip it)
- Use `<table>` for layout, not flexbox/grid
- Avoid `max-width` on outer wrapper without MSO conditional comments for Outlook
- Test gradient fallback (solid color) for Outlook
- Use `<!--[if mso]>` wrappers for Outlook-specific width constraints
