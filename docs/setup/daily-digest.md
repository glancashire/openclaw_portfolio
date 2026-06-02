# Daily monitoring digest

The active daily digest path is the redesigned three-block portfolio email sent by:
- `scripts/send-dashboard-digest.js`

It currently renders through:
- `collectPortfolioSummary()`
- `buildReportEmailHtml()` / `buildReportEmailText()`

It no longer uses the older `src/reporting/dashboardDigest.js` renderer on the active send surface.

## Commands

```bash
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=weekly
```

## Output contract

- stdout is JSON
- `--dry-run` does not send email
- live mode reports recipients, provider, and send result

## Email body blocks

1. `Portfolio Value Snapshot`
2. `Profit / Loss`
3. holdings table sorted by CHF value descending

## Related docs

- `docs/email-digest.md`
- `docs/reporting-command-surface.md`
