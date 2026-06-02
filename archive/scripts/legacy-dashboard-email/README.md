# Legacy dashboard email helpers

These scripts were retired during Phase 1 operator surface cleanup on 2026-06-02.

Why they were retired:
- bespoke dashboard-email renderer separate from the supported report-email path
- hardcoded recipient behavior
- no tracked callers in the live repo
- overlapping purpose with `scripts/send-dashboard-digest.js`, `scripts/show-dashboard.js`, and `scripts/generate-report.js`

Preserved files:
- `send-portfolio-dashboard-email.js`
- `check-cash-influx-and-send-dashboard.js`
- `check-eod-transactions-and-send-dashboard.js`

Treat this directory as audit/history only.
