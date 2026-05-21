# Phase 182 — Mixed-Venue Open Runner Plan

## Goal
Allow the live submission runner to process executable approved rows on currently open venues without being blocked by other approved rows whose venues are closed.

## Problem
`scripts/submit-orders-at-open.js` performs a single portfolio-level venue window check. In a mixed basket (for example Xetra + Swiss/EBS), one closed venue can abort the whole run even when some orders are still executable now.

## Scope
- keep approval and live-safety gates intact
- preserve exact approved instrument metadata via existing order preparation
- evaluate market-open state per prepared order
- submit only rows whose venues are open now
- mark rows on closed venues with explicit block metadata and next action
- keep dry-run and summary behavior understandable

## Planned changes
1. Patch `scripts/submit-orders-at-open.js`
   - remove the single all-or-nothing market-window abort for mixed baskets
   - evaluate venue-open state per executable order before quote/submit
   - allow currently-open rows to continue
   - block closed rows with `exchange_closed_at_submit_window`-style metadata and a clear next action
2. Add focused regression coverage
   - mixed basket: open Xetra row + closed EBS row should still submit/prepare the open row
   - single closed basket should still exit non-successfully or clearly report zero submitted executable rows
3. Verify with the smallest meaningful gate
   - focused test(s)
   - direct dry-run inspection of the current ETF basket

## Safety notes
- No substitution of instruments
- No live retries beyond existing explicit approval envelope
- Closed Swiss rows should be parked for next open, not forced
- Orders already staged at broker should not be duplicated
