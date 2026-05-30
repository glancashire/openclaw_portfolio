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

## Action checklist
- [ ] Inspect current holdings valuation pipeline and quote provenance path.
- [ ] Evaluate 2–3 free delayed/last-close quote sources against a few held ETF symbols.
- [ ] Choose a conservative fallback policy and document precedence.
- [ ] Implement quote fallback plumbing for reporting surfaces.
- [ ] Ensure unrealized P/L uses the fallback close when live quotes are unavailable.
- [ ] Surface quote provenance clearly in holdings/dashboard outputs.
- [ ] Add focused tests for fallback valuation and P/L behavior.
- [ ] Regenerate dashboard and verify output.

## Acceptance criteria
- When IBKR live quotes are unavailable, the reporting pipeline can still value supported holdings from a documented free delayed/last-close source.
- Unrealized P/L uses last close quotes (or better) rather than stale/unknown live values.
- Output explicitly states pricing provenance/fallback usage.
- Focused tests pass.
