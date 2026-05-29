# Phase Plan: Layer 3 — Digest Email

## Objectives

Restructure `dashboardDigest.js` to lead with value/profit, add top movers section, and make allocation a compact footnote.

## Changes

### 1. New card order in `buildDashboardDigest`

Current order:
1. Digest summary (badges + metrics)
2. Sparkline
3. Profit/Loss
4. Allocation card
5. Rebalance snapshot + AI
6. Instrument health
7. Cron health
8. Workflow

**New order:**
1. Digest summary — enhance to show daily/weekly change prominently
2. Profit/Loss — leads
3. **Top movers** (new) — top 3 gainers and top 3 losers with values
4. Sparkline
5. Allocation — compact footnote ("All sleeves within band ✓" or similar)
6. Rebalance snapshot + AI (moved lower)
7. Instrument health
8. Cron health
9. Next actions (renamed from "Open issues and workflow", more value-oriented)

### 2. New `renderTopMoversCard()` function

- Sort holdings by unrealized profit CHF descending
- Show top 3 gainers and top 3 losers
- Each row: ticker, value CHF, P/L CHF, P/L %
- If all positive or all negative, show only the relevant side

### 3. Compact allocation footnote

- Instead of a full card, a single line after the top movers: "🎯 Allocation: all sleeves within band" (✓) or similar
- Or keep as a card but make it much more compact (1-2 lines max)

### 4. Workflow card renamed to "Next steps"

- Show only the recommended next step, not all pending actions
- Value-oriented framing

## Risks

- Digest email tests may assert exact card ordering — check
- Any new cards affect the email HTML structure

## Checklist

- [ ] Read digest tests (if any)
- [ ] Add `renderTopMoversCard()` function
- [ ] Update card order in `buildDashboardDigest`
- [ ] Make allocation card compact (1-2 line footnote or compact card)
- [ ] Update workflow card → "Next steps" with value language
- [ ] Run `bash .githooks/pre-commit`
- [ ] Run `npm test`
- [ ] Commit: `Phase V1-L3: value-first digest email`
- [ ] Push

## Acceptance Criteria

- Digest leads with portfolio value, daily/weekly change, and profit
- Top movers section appears in the digest body
- Allocation appears as a compact footnote (not a full card)
- Recommendations framed as opportunities