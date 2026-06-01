# Phase V1-L3: Value-focused Digest Email

## Goal
Restructure `src/reporting/dashboardDigest.js` to lead with value/profit, de-emphasize drift, and frame recommendations as opportunities.

## Changes

### New card order
1. **Headline card** — portfolio value, daily/weekly change, profit (all-time), cash
2. **Top movers** — top 3 gainers + top 3 losers by P/L CHF
3. **Sparkline** — 30-day portfolio trend
4. **Profit/Loss** — per-holding table with cost basis and P/L
5. **Allocation health** — compact one-line footer (not a dedicated card)
6. **Drift vs target** — still shown but below the fold
7. **AI Assessment** — tags + narrative (after value content)
8. **Instrument health** — kept
9. **Cron health** — kept
10. **Next steps** — kept

### Specific changes to buildDashboardDigest
- Replace the "Digest summary" card (status badges + metric grid) with a **value headline card** that shows:
  - Portfolio value (CHF)
  - Daily change (from net liq history vs previous day)
  - Weekly change (from net liq history vs 7 days ago)
  - All-time profit (from profit totals)
  - Cash available for deployment
- Move allocation to a compact line (not a card): `"All sleeves within target bands ✓"` or warning text if off-track
- De-emphasize the "Drift vs target" card title or make it a smaller section
- The AI assessment card stays after value sections
- The text section should also lead with value

### Value headline card structure
```
┌─────────────────────────────────────────────────────────┐
│ Portfolio performance                                    │
│ CHF 72'274 current value  [+0.25% this week]            │
│ +135.21 CHF all-time profit                              │
│ CHF 9'544 cash — available for deployment               │
└─────────────────────────────────────────────────────────┘
```

### Allocation de-emphasis
- Remove the `renderAllocationCard` card from the body
- Instead, add a single line after the value headline: either "All sleeves within target bands ✓" or a brief note if something needs attention
- Drift data is still computed and available in `renderRebalanceSnapshotCard`, just not leading

### Top movers (already partially implemented)
- Already renders gainers/losers — keep but move to position 2
- May need to sort by absolute value contribution (not just unrealized profit CHF)

## Files to change
- `src/reporting/dashboardDigest.js` — main restructure

## Tests
- No specific digest tests exist in `tests/` — no test changes needed
- General pre-commit and npm test should pass (spot check)

## Acceptance
- Email digest leads with portfolio value and profit, not allocation
- Top movers visible immediately
- Allocation reduced to a one-line health check
- No changes to underlying data gathering