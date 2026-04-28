# Schedules

## Daily
- Sync holdings: start of trading day
- Sync holdings: end of trading day
- Update history
- Regenerate dashboard
- Check rebalance drift
- Intended command path: holdings sync/read-only first, then `node scripts/regenerate-dashboard.js portfolio/etf`

## Weekly
- Generate weekly report
- Review open trade proposals
- Review data quality warnings
- Intended command path: `node scripts/run-report-cycle.js portfolio/etf weekly`

## Monthly
- Generate monthly report
- Check rebalancing need
- Review approved ETF universe
- Intended command path: `node scripts/run-report-cycle.js portfolio/etf monthly`

## Quarterly
- Generate quarterly report
- Review strategy assumptions
- Review risk profile
- Review whether allocations should change
- Intended command path: `node scripts/run-report-cycle.js portfolio/etf quarterly`
