# Reporting Command Surface

This document defines the supported reporting, dashboard, and email command surface.

## Canonical commands

| Command | Stdout contract | File writes | Email side effect | Use it for |
| --- | --- | --- | --- | --- |
| `node scripts/show-dashboard.js [portfolio]` | human-readable text | none | none | quick console review |
| `node scripts/regenerate-dashboard.js <portfolio-name-or-dir>` | JSON | refreshes dashboard artifacts | none | rebuilding dashboard artifacts after data changes |
| `node scripts/generate-report.js <portfolio-dir> [weekly\|monthly\|quarterly] [YYYYMMDD]` | JSON | writes dated report artifacts | none | producing investor report artifacts |
| `node scripts/run-health-check.js <portfolio-dir> [--dry-run] [--send-email]` | JSON | writes health-report artifacts | optional | operator health review and issue surfacing |
| `node scripts/send-dashboard-digest.js --portfolio=<name> --frequency=daily\|weekly [--dry-run]` | JSON | none | yes, unless `--dry-run` | recurring digest delivery |
| `node scripts/send-email-verification.js <portfolio-dir> [--to user@example.com]` | JSON | none | yes | transport verification |

## Output contract quick guide

- **Human-only stdout:** `show-dashboard.js`
- **JSON stdout + artifact writes:** `regenerate-dashboard.js`, `generate-report.js`, `run-health-check.js`
- **JSON stdout + email delivery:** `send-dashboard-digest.js`, `send-email-verification.js`
- **Optional email side effect:** `run-health-check.js --send-email`

## Expected artifacts

### Dashboard rebuild
- `portfolio/<name>/dashboard.md`
- related portfolio summary/dashboard derivatives refreshed by the dashboard generator

### Report generation
- dated report markdown/html artifacts under `portfolio/<name>/reports/<period>/`
- sibling structured JSON artifact for the generated report

### Health check
- `portfolio/<name>/health-report.md`
- `portfolio/<name>/health-report.html`
- `portfolio/<name>/health-report.json`

## Digest rendering reality

The active digest CLI is:
- `scripts/send-dashboard-digest.js`

Its current rendering path is:
- `collectPortfolioSummary()` from `src/reporting/summaryArtifacts.js`
- `buildReportEmailHtml()` / `buildReportEmailText()` from `src/reporting/reportEmail.js`

It does **not** use the old multi-card `dashboardDigest.js` path on the active send surface anymore.

## Dry-run guidance

Use dry-run before real sends:
- `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run`
- `node scripts/run-health-check.js portfolio/etf --dry-run`

Expected dry-run behavior:
- digest: JSON result with `attempted: false` and `sent: false`
- health check: JSON result with artifacts written and `emailDelivery.reason = "email_not_requested"`

## Retired local helpers

These are no longer part of the active script surface:
- `archive/scripts/legacy-dashboard-email/send-portfolio-dashboard-email.js`
- `archive/scripts/legacy-dashboard-email/check-cash-influx-and-send-dashboard.js`
- `archive/scripts/legacy-dashboard-email/check-eod-transactions-and-send-dashboard.js`

Reason:
- separate bespoke renderer
- hardcoded recipient behavior
- no tracked callers in the live repo
- overlapping purpose with the canonical digest/report surfaces

## Related docs

- `docs/operator-runbooks.md`
- `docs/execution-command-surface.md`
- `docs/email-digest.md`
