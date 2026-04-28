# Report Jobs

These are the intended report-cycle commands for the portfolio-manager MVP.

## Weekly
`node scripts/run-report-cycle.js portfolio/etf weekly`

## Monthly
`node scripts/run-report-cycle.js portfolio/etf monthly`

## Quarterly
`node scripts/run-report-cycle.js portfolio/etf quarterly`

## Notes
- Run after holdings refresh when possible.
- The current implementation appends a history snapshot, regenerates the dashboard, then writes the report.
- PDF export is not implemented yet.
