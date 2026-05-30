# Phase I — Market-close fallback quotes, dashboard card view, and P/L explanation

## Objective
Improve the dashboard experience in two ways: (1) produce a compact card-view rendering with instrument tables suitable for direct chat display, and (2) when live IBKR-backed quotes are unavailable, resolve trustworthy market-close fallback quotes from conservative external sources where possible so valuations and P/L reflect recent close prices rather than opaque stale snapshots.

## Risks / dependencies
- External sources can be flaky, rate-limited, or have awkward symbol mapping for European ETFs.
- Must keep the reporting path cheap and deterministic; no per-holding browser scraping or fragile multi-request loops.
- Must not overstate quote confidence: fallback provenance and degraded cases need explicit labels.
- Working tree is still dirty with generated/runtime churn; commit only source/docs/tests/plan files for this phase.

## Proposed fallback strategy
1. Keep IBKR-backed holdings snapshot as authoritative when broker is authenticated and quote mode is live/realtime or delayed.
2. When IBKR is unavailable, try a conservative external market-close fetch path with simple HTTP JSON/CSV endpoints only.
3. Prefer sources with a clear previous-close / end-of-day contract and no browser automation.
4. If no trustworthy fallback resolves, keep holdings snapshot values but mark them stale/untrusted.

## Candidate sources to implement/evaluate
- Yahoo Finance chart endpoint (`query1.finance.yahoo.com`) for regular-market previous close / close-series extraction.
- Stooq end-of-day symbol CSV only where symbol mapping is clean and response access is stable.
- Keep Alpha Vantage out of the default unattended path because of API key/rate-limit friction.

## Action checklist
- [ ] Evaluate source reachability and contract shape for a few mapped instruments.
- [ ] Implement one or more conservative external last-close fetchers with explicit provenance.
- [ ] Add fallback-source selection / retry order with bounded behavior.
- [ ] Add/extend tests for source mapping, successful fallback resolution, degraded fallback, and quote trust labels.
- [ ] Add a compact dashboard card renderer with instrument tables and quote/P&L summary suitable for chat.
- [ ] Explain the current `-1585.15` unrealized loss from cost basis vs current valuation, with top contributors.
- [ ] Run focused tests, safe lane, and broad verification.

## Acceptance criteria
- When IBKR live quotes are unavailable, at least one conservative external market-close path is attempted and used when it resolves cleanly.
- Quote provenance/trust labeling remains explicit.
- A card-style dashboard rendering with instrument tables can be shown directly in chat.
- The `-1585.15` unrealized loss is explainable from the generated artifacts, including main contributors.
- Verification passes and the phase is committed/pushed.
