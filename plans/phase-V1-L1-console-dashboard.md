# Phase Plan: Layer 1 — Console Dashboard (`show-dashboard.js`)

## Objectives

Restructure `scripts/show-dashboard.js` to lead with value/profit, sort holdings by CHF value descending, frame cash as "available for deployment," and compact allocation to a one-line health check.

## Changes

1. **Header** — show total portfolio value + all-time profit/% inline
2. **Value section** — leads with total, daily move, weekly move, all-time profit; "Invested" and "Cash" as sub-items
3. **Holdings section** — sort rows by CHF value descending; show ticker, CHF value, weight %, daily P/L with direction arrow
4. **Cash framing** — "...available for deployment" instead of just "Cash"
5. **Allocation** — single line: "✓ All sleeves on track" or "⚠ X sleeves need attention"
6. **Recommendation** — value-oriented framing (unchanged logic, only presentation)
7. **Remove/minimize** — "Status · strategy · broker" header lines become optional trailer

## Risks

- No tests exist for show-dashboard.js — no regression risk, but no safety net
- Any string changes affect any automation that parses dashboard output

## Checklist

- [ ] Rewrite `scripts/show-dashboard.js` with new layout
- [ ] Verify output is sensible (run it against existing data)
- [ ] Run `node .githooks/pre-commit`
- [ ] Commit with message `Phase V1-L1: value-first console dashboard layout`
- [ ] Push

## Acceptance Criteria

- Output starts with portfolio value and profit (not status line)
- Holdings sorted by CHF value descending
- Cash framed as "available for deployment"
- Allocation compressed to one status line
- Recommendation uses value language