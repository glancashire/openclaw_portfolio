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
- Run `node scripts/check-report-delivery-readiness.js portfolio/etf` when you want a local-only delivery/readiness view before wiring any external delivery outside this repo.
- The current ETF workflow is live-read-only for holdings/readiness, while execution remains confirmation-gated and broker readonly.
- Current IBKR market-data coverage is partial, so scheduled reports may still mix broker-backed pricing with fallback assumptions when some instruments lack live pricing.
- Scheduled report automation now returns delivery-mode, readiness, and pending-action metadata in its JSON output so cron supervisors can triage failures without external alerts.
