# Schedules

## Daily
- Active job: `portfolio-etf-daily-sync-and-dashboard`
- Sync holdings in read-only mode
- Refresh history snapshot when needed
- Regenerate dashboard
- Check rebalance drift / readiness warnings
- Intended command path: holdings sync/read-only first, then `node scripts/regenerate-dashboard.js portfolio/etf`

## Weekly
- Active job: `portfolio-etf-weekly-report`
- Generate weekly report
- Review open trade proposals
- Review data quality warnings
- Intended command path: `node scripts/run-report-cycle.js portfolio/etf weekly`

## Monthly
- Active job: `portfolio-etf-monthly-report`
- Generate monthly report
- Check rebalancing need
- Review approved ETF universe
- Intended command path: `node scripts/run-report-cycle.js portfolio/etf monthly`

## Quarterly
- Active job: `portfolio-etf-quarterly-report`
- Generate quarterly report
- Review strategy assumptions
- Review risk profile
- Review whether allocations should change
- Intended command path: `node scripts/run-report-cycle.js portfolio/etf quarterly`
