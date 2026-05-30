## [LRN-20260521-001] best_practice

**Logged**: 2026-05-21T11:50:00Z
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Resolve the exact tradable IBKR contract and venue before doing live-order prep for a new instrument.

### Details
When pivoting from UBSPX to a replacement S&P 500 ETF, the first instinct was to move quickly into quantity and price-band preparation for iShares. That skipped the higher-value prerequisite: confirm the exact tradable IBKR contract shape (symbol/local symbol/conid/primary exchange/currency/entitlements) first. A naive CSPX SMART/USD probe failed with `No security definition has been found`, proving that operator-friendly fund choice is not enough for live execution prep. This should become the default workflow whenever evaluating a new instrument.

### Suggested Action
Before quantity, price band, or live authorization prep for any new instrument, always resolve and validate the exact IBKR tradable contract and venue path first, including quote/entitlement viability where possible.

### Metadata
- Source: user_feedback
- Related Files: src/execution/executionDiagnostics.js,src/execution/liveReadinessPreflight.js,portfolio/etf/portfolio.md
- Tags: ibkr,contract-resolution,live-prep,instrument-selection
- Pattern-Key: instrument.resolve_contract_before_live_prep
- Recurrence-Count: 1
- First-Seen: 2026-05-21
- Last-Seen: 2026-05-21

---

## [LRN-20260530-001] correction

**Logged**: 2026-05-30T13:22:00Z
**Priority**: high
**Status**: in_progress
**Area**: backend

### Summary
Treat market-closed IBKR posture as delayed-only availability, not broker-down unavailability

### Details
During Phase G reporting work, the user clarified that IBKR was not down; markets were closed. Reporting logic must distinguish healthy delayed-only / market-closed posture from real broker outage because the quote provenance and unrealized P/L policy differ. Delayed-only broker data can still support close-style valuation, while actual broker unavailability requires conservative free delayed quote fallback or explicit stale/untrusted labeling.

### Suggested Action
Keep readiness posture explicit (`live_or_realtime` vs `delayed_only` vs `no_data`) and drive quote trust/provenance plus P/L messaging from that posture.

### Metadata
- Source: user_feedback
- Related Files: src/brokers/interactive-brokers/readiness.js,src/reporting/quoteResolution.js,src/reporting/summaryArtifacts.js,src/reporting/dashboardGenerator.js
- Tags: ibkr,quotes,reporting,correction,provenance

---
