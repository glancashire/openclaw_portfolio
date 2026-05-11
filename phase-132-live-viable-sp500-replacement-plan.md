# Phase 132 — Live-Viable Low-TER S&P 500 Replacement

## Goal
Find a serious low-TER S&P 500 ETF that is operationally viable in the current IBKR quote path, prefer accumulating or otherwise high-quality UCITS options, test candidates live, and patch `portfolio/etf` only if a candidate truly improves the current executable path.

## Constraints
- Prefer serious, large, low-TER ETFs.
- Prefer UCITS and accumulating when possible, but operational viability in the current IBKR path is decisive.
- Do not submit live orders.
- Preserve approval/audit safety.

## Checklist
- [ ] Identify top serious low-TER S&P 500 candidates.
- [ ] Test live IBKR quote viability for each candidate.
- [ ] Select the best candidate that actually improves current path behavior.
- [ ] Patch portfolio metadata and trade references carefully.
- [ ] Re-run preflight, authority, and market-open dry-run.
- [ ] Commit and push.
