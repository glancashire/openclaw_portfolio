# Phase 131 — Vanguard Replacement for CSPX

## Goal
Replace CSPX with the best Vanguard UCITS S&P 500 sleeve candidate that is compatible with the ETF-only CHF-first portfolio constraints and more operationally viable in the current IBKR setup.

## Scope
- Identify the best Vanguard UCITS substitute for CSPX.
- Validate likely IBKR contract/quote viability.
- Patch portfolio approved-instrument metadata and any dependent references carefully.
- Re-run canonical preflight and market-open dry-run truth surfaces.

## Non-goals
- Do not submit live orders.
- Do not weaken approval gates.
- Do not silently rewrite trade history without auditability.

## Checklist
- [ ] Select Vanguard UCITS replacement candidate.
- [ ] Verify/resolve IBKR symbol + conid.
- [ ] Patch `portfolio/etf/portfolio.md` instrument metadata.
- [ ] Reconcile approved trade row / proposal references as needed.
- [ ] Run preflight, authority, and dry-run verification.
- [ ] Commit and push.
