# Dashboard return-metrics cleanup — 2026-07-01

## Problem
The current dashboard/email surfaces mix:
- portfolio-level return vs net deposited capital
- unrealized P/L on currently held positions
- history-window deltas based on portfolio value snapshots

This creates misleading presentation, especially when the console dashboard labels the headline as "all-time" while the detail section shows unrealized holdings P/L.

## Best-practice framing
Keep three concepts separate:
1. **Portfolio return vs net deposits** — cash-flow-aware capital framing, useful as an investor outcome headline.
2. **Unrealized P/L on current holdings** — mark-to-market vs cost basis of held positions only.
3. **Reference value windows** — simple portfolio-value deltas over historical anchors; not proper TWR/MWR and should be documented as such.

## Changes
1. Rename window sections from "Portfolio gain windows" to "Portfolio value windows (reference only)".
2. Add explanatory note that these windows are based on historical portfolio value anchors and do not neutralize inflows/outflows.
3. Update console dashboard headline from ambiguous "all-time" to explicit "vs net deposited" when ledger exists, otherwise use unrealized P/L fallback.
4. Update console performance block labels similarly.
5. Update email/digest text labels and explanatory note.
6. Keep unrealized holdings P/L visibly separate wherever total-return-vs-deposits is shown.
7. Regenerate previews/artifacts and run focused tests.

## Verification
- node scripts/regenerate-dashboard.js portfolio/etf
- node scripts/regenerate-dashboard-email-preview.js etf
- node scripts/show-dashboard.js
- targeted tests for digest/email/rendering/performance consistency
