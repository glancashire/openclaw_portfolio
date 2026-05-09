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
- The current implementation appends a history snapshot only when the exact same snapshot row is not already present, regenerates the dashboard with the current IBKR readiness probe, then writes the report.
- Current production schedule is wired through OpenClaw cron jobs: `portfolio-etf-weekly-report`, `portfolio-etf-monthly-report`, and `portfolio-etf-quarterly-report`.
- Run `node scripts/check-safety-controls.js portfolio/etf` before treating any report as execution-ready.
- Run `node scripts/check-report-delivery-readiness.js portfolio/etf` to inspect the local-only delivery policy, pending operator actions, and current reporting readiness without sending anything externally.
- Reports and dashboards now surface operator state, delivery mode, readiness posture, pending actions, broker-automation pause status, and recent execution lifecycle counts.
- PDF export now attempts local HTML-to-PDF rendering first and falls back to a placeholder companion file if the renderer/browser runtime is unavailable.
- The default delivery policy remains local-only and side-effect-free; any real outbound delivery should be added outside this repo with explicit operator approval.
- See `config/report-cron-examples.md` for OpenClaw cron payload examples that match the current async report-cycle workflow.
