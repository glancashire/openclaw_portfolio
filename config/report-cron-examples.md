# Report Cron Examples

These examples show how to schedule the portfolio-manager report workflow with OpenClaw cron jobs.

## Weekly report

```json
{
  "name": "portfolio-etf-weekly-report",
  "schedule": { "kind": "cron", "expr": "0 18 * * 5", "tz": "UTC" },
  "payload": {
    "kind": "agentTurn",
    "message": "Run `node scripts/run-report-cycle.js portfolio/etf weekly`, verify the dashboard/report artifacts regenerated cleanly, then summarize only meaningful blockers.",
    "timeoutSeconds": 900
  },
  "sessionTarget": "isolated",
  "delivery": { "mode": "announce" }
}
```

## Monthly report

```json
{
  "name": "portfolio-etf-monthly-report",
  "schedule": { "kind": "cron", "expr": "0 18 1 * *", "tz": "UTC" },
  "payload": {
    "kind": "agentTurn",
    "message": "Run `node scripts/run-report-cycle.js portfolio/etf monthly`, verify the generated artifacts, and flag any safety/readiness blockers before sharing results.",
    "timeoutSeconds": 1200
  },
  "sessionTarget": "isolated",
  "delivery": { "mode": "announce" }
}
```

## Quarterly report

```json
{
  "name": "portfolio-etf-quarterly-report",
  "schedule": { "kind": "cron", "expr": "0 18 1 1,4,7,10 *", "tz": "UTC" },
  "payload": {
    "kind": "agentTurn",
    "message": "Run `node scripts/run-report-cycle.js portfolio/etf quarterly`, validate the generated report/dashboard state, and surface only material issues or completed outputs.",
    "timeoutSeconds": 1200
  },
  "sessionTarget": "isolated",
  "delivery": { "mode": "announce" }
}
```

## Safety-first notes

- Prefer isolated cron runs so report jobs do not pollute the active chat session.
- Keep holdings sync/readiness checks separate from report generation if broker connectivity is unstable.
- Run `node scripts/check-safety-controls.js portfolio/etf` when treating any generated output as execution-relevant.
- Current IBKR market-data/contract lookup remains blocked, so scheduled reports still rely on simulated pricing assumptions when live pricing is unavailable.
