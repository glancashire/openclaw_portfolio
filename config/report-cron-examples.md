# Report Cron Examples

These are example cron expressions for the portfolio-manager MVP.

## Weekly report
- Expression: `0 17 * * 5`
- Meaning: every Friday at 17:00 UTC
- Command: `node scripts/run-report-cycle.js portfolio/etf weekly`

## Monthly report
- Expression: `0 17 28-31 * *`
- Meaning: late-month reporting window; an outer scheduler should guard for last business day if needed
- Command: `node scripts/run-report-cycle.js portfolio/etf monthly`

## Quarterly report
- Expression: `0 17 28-31 3,6,9,12 *`
- Meaning: quarter-end reporting window; an outer scheduler should guard for last business day if needed
- Command: `node scripts/run-report-cycle.js portfolio/etf quarterly`

## Notes
- These examples are operational scaffolding, not live cron jobs.
- For production use, tie scheduling to confirmed market calendars and broker/data availability.
- Keep report runs behind read-only / dry-run assumptions until live broker paths are validated.
