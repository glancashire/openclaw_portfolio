# Phase G — Fallback quote sourcing and unrealized P/L correction

## Objective
Improve dashboard/reporting accuracy when IBKR is unavailable by evaluating free delayed/last-close quote sources and wiring a safe fallback path so holdings valuation and unrealized P/L use last market close quotes when live broker quotes are unavailable.

## User intent
- Treat market-closed posture differently from a broken broker.
- If IBKR quotes are unavailable, use a free delayed source.
- Ensure unrealized P/L is based on the best available recent quote, preferring last official market close over stale/missing live snapshots.

## Current findings
- `portfolio/etf/holdings.md` currently says `Pricing source: broker_api` and `All holdings use broker market snapshot pricing`.
- Dashboard/summary values are sourced from those holdings artifacts.
- When IBKR is unreachable, the reporting layer does not yet replace quote inputs with a documented last-close fallback.
- The current unrealized P/L figure may therefore reflect stale or inconsistent quote provenance.

## Risks / dependencies
- Must not silently mix incomparable quote timestamps without labeling provenance.
- Must not introduce fragile or rate-limit-heavy external dependencies.
- Must preserve read-only/reporting-only posture: no trading changes.
- Free sources may have symbol/venue coverage gaps for European ETFs; fallback mapping/provenance will matter.

## Candidate fallback sources to evaluate
- Stooq (simple public delayed/historical quotes, good for close data, limited symbol conventions)
- Alpha Vantage (daily time series / previous close, API-key and rate-limit considerations)
- Yahoo-style public chart/download endpoints only if a stable non-browser path exists and terms/rate limits are acceptable

## Source evaluation update
- Stooq is not a good unattended fallback here because current CSV access requires an apikey/captcha flow.
- Yahoo-style public chart endpoints appear symbol-mappable for our venues, but this environment is currently rate-limited (HTTP 429) on probe, so they cannot be treated as a guaranteed per-holding source without throttling/caching and explicit degradation handling.
- Implementation direction: prefer IBKR live/close fields when reachable; otherwise use a conservative pluggable external fallback interface with explicit provenance/degraded states; if no trustworthy fallback resolves, keep stale snapshot values marked stale/untrusted rather than presenting them as clean market-close truth.

## Action checklist
- [x] Inspect current holdings valuation pipeline and quote provenance path.
- [x] Evaluate 2–3 free delayed/last-close quote sources against a few held ETF symbols.
- [x] Choose a conservative fallback policy and document precedence.
- [x] Implement quote fallback plumbing for reporting surfaces.
- [x] Ensure unrealized P/L uses the fallback close when live quotes are unavailable.
- [x] Surface quote provenance clearly in holdings/dashboard outputs.
- [x] Add focused tests for fallback valuation and P/L behavior.
- [x] Regenerate dashboard and verify output.

## Implementation notes / closeout
- Root-cause diagnosis: dashboard and summary were still feeding different cost-basis coverage into the shared `buildProfitLossSummary()` helper. The dashboard path loaded `holdings-avg-cost.json` sidecar fallback data, while `collectPortfolioSummary()` did not, which produced a false cross-surface mismatch (`9 covered / -1585.15` vs `4 covered / -1885.60`).
- Resolution: `src/reporting/summaryArtifacts.js` now loads the same avg-cost sidecar fallback used by the dashboard path and passes `avgCostByKey` into `buildProfitLossSummary()`.
- Test hardening: `scripts/test-profit-loss-surface-consistency.js` now compares normalized numeric values instead of locale-specific formatting, and `scripts/test-summary-broker-block-details.js` was updated to await the now-async summary model builder.
- Current verified posture: dashboard and summary surfaces now agree on unrealized P/L totals, and safe-lane verification is green again.

## Acceptance criteria
- When IBKR live quotes are unavailable, the reporting pipeline can still value supported holdings from a documented free delayed/last-close source.
- Unrealized P/L uses last close quotes (or better) rather than stale/unknown live values.
- Output explicitly states pricing provenance/fallback usage.
- Focused tests pass.
- Dashboard and summary surfaces use the same authoritative unrealized P/L totals and coverage counts.
