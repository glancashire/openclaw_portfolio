# Stray etf/ directory at workspace root

Found 2026-06-06 00:17 UTC during daily env backup.

- Created 2026-06-05 15:00:27 UTC
- Contents: dummy UBS SLI + iShares S&P 500 holdings (matches the hardcoded test data in `scripts/simulate-holdings-sync.js`)
- Likely cause: someone ran `node scripts/simulate-holdings-sync.js etf` from the workspace root instead of `portfolio/etf`
- Action: moved here. Real holdings live in `portfolio/etf/holdings.md` and were not affected.
