# Phase 129 — Market-Open Quote-State Refresh and Partial-Entitlement Truth

## Goal
Make the market-open runner refresh quote-derived block state using current broker data so rows with now-usable quotes do not remain artificially degraded, while preserving explicit entitlement/delayed-data blocking for rows that still cannot be safely priced.

## Why this phase exists
After Phase 128:
- canonical preflight and authority both say the ETF portfolio is live-ready again,
- UBSSLI dry-run prepares successfully,
- EMUAA currently has a usable broker quote when fetched directly,
- CSPX still fails on the delayed-data / entitlement branch.

That means the remaining gap is in the market-open runner’s quote-state handling. It needs to recompute from current broker truth, not get stuck behind stale prior block outcomes.

## Scope
- Trace market-open dry-run execution selection and per-row quote/block evaluation.
- Reproduce why EMUAA still ends in `limit_price_unavailable` despite a valid current quote.
- Patch stale-block/quote refresh behavior or quote-shape handling in the runner path.
- Keep CSPX blocked explicitly if entitlement-delayed data still prevents safe smart-limit construction.
- Add focused regression coverage.

## Non-goals
- Do not bypass broker entitlements.
- Do not auto-submit live orders.
- Do not weaken trend guards or ETF quality checks.

## Actionable checklist
- [ ] Trace `submit-orders-at-open.js` row loop and block persistence behavior.
- [ ] Capture direct per-instrument quote + block evaluation for EMUAA and CSPX.
- [ ] Identify why EMUAA runner behavior diverges from direct quote fetch.
- [ ] Implement the smallest safe fix.
- [ ] Add focused regression tests for refreshed quote-state behavior.
- [ ] Verify dry-run prepares all currently supportable rows.
- [ ] Verify preflight/authority remain aligned.
- [ ] Iterate until targeted checks pass.
- [ ] Commit Phase 129 plan + implementation.
- [ ] Push Phase 129.

## Verification gates
- focused runner / quote refresh tests
- direct quote probes for EMUAA/CSPX as needed
- `node scripts/submit-orders-at-open.js portfolio/etf --dry-run`
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`

## Exit criteria
- Rows with current usable broker quotes are priced and prepared by the dry-run runner.
- Rows without safe pricing remain explicitly blocked with truthful reasons.
- Canonical operator surfaces remain consistent.
