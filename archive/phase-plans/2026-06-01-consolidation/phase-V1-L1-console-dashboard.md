# Phase V1-L1: Console Dashboard — Value-Focused Rework

## Goal

Restructure `scripts/show-dashboard.js` to lead with portfolio value and performance, sort holdings by CHF value, frame cash as deployment opportunity, and compact allocation to a single-line health check.

## Changes

### 1. Header
- Simplify to: `📊 {portfolio} — CHF {total}   (+X.XX% all-time)`
- Drop the verbose `(all-time +135.21 CHF / +0.25%)` format

### 2. Performance section
- Use consistent 10-char right-aligned numbers, tighter spacing
- Format: `  Today        +0.00 CHF  (0.00%)` (10-char pad)
- Add clearer "All-time" as final entry

### 3. Holdings
- Already sorts by CHF value descending ✓
- Already marks top gainer with ★ ✓
- Add "▼ top loss" for the biggest loser (only if distinct from top gainer)
- Tighter columns: Ticker(8) CHF(10) Wt(6) P/L CHF(10) P/L %(7)

### 4. Cash
- Already shows "available for deployment" ✓
- Minor: use `toFixed(1)` for percentage, consistent apostrophe formatting

### 5. Allocation health
- Simplify to one-line: "🎯 Balance: all sleeves on track ✓"
- Add compact inline breakdown in parens: `(Global 66.8%/65% · Swiss 20.0%/20% · Bonds+Cash 13.2%/15%)`
- Only show individual sleeve lines when not all on track

### 6. Recommendation
- Keep as-is, just ensure the framing is value-oriented

## Constraints
- Do not change data sources (parse same dashboard.md sections)
- Keep `node scripts/show-dashboard.js [portfolio]` interface
- No changes to tests (current output is a moving target; tests will validate)

## Success criteria
- Output leads with value and performance
- Holdings sorted by CHF value descending with ★/▼ markers
- Cash shown as deployment opportunity
- Allocation is compact one-line health check