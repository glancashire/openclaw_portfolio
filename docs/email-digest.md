# Email Digest

_Last updated: Phase 212 — periodic HTML digest for daily/weekly portfolio operations._

## Purpose

The email digest is the lightweight operator summary for recurring review. It reuses the reporting stack to deliver a compact HTML email with:

- top-level portfolio KPIs
- net-liq trend sparkline
- allocation drift
- instrument health
- cron health
- open workflow/issues

Primary CLI:

```bash
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=weekly
```

## CLI arguments

### `--portfolio=<name>`
Portfolio folder name under `portfolio/`.

Default:
- `etf`

### `--frequency=daily|weekly`
Controls subject line and operator framing.

Default:
- `daily`

### `--dry-run`
Builds the digest and reports the subject/recipients without sending email.

## Subject lines

### Daily
```text
[etf] Daily portfolio digest — YYYY-MM-DD
```

### Weekly
```text
[etf] Weekly portfolio digest — week of YYYY-MM-DD
```

## Recipient resolution

Digest delivery uses the report delivery policy first, then falls back to environment configuration.

Resolution order:
1. `emailRecipients` from the effective delivery policy
2. `MAILGUN_RECIPIENT` environment variable fallback

If no recipients resolve, the digest reports:
- `attempted: false`
- `sent: false`
- `reason: "no_recipients_configured"`

## Body sections

### Digest summary
Contains:
- portfolio value
- cash
- pending approvals
- operator queue count
- health/execution posture badges

### Portfolio trend
Uses the end-of-day net-liq history sparkline.

### Allocation drift
Shows sleeve-level current vs target vs drift status.

### Instrument health
Shows the key instrument rows with:
- sleeve
- drift
- proposal state
- approval state
- block reason / note

### Cron health
Shows:
- healthy/failing job counts
- per-job severity
- consecutive errors
- last run age
- last error summary

### Open issues and workflow
Combines:
- recommended next step
- pending action items
- delivery-status pending actions

## Rendering notes

- HTML uses the shared email page/card helpers from `src/reporting/emailHtml.js`
- the sparkline is inline SVG and intended to be email-safe
- the digest is image-free and should degrade cleanly in Gmail / Apple Mail style clients

## Relationship to other reporting paths

### Health report
Use the health report when you want:
- issue classification
- self-heal output
- operator commands
- recent health trends

Command:
```bash
node scripts/run-health-check.js portfolio/etf --send-email
```

### Digest
Use the digest when you want:
- routine daily or weekly operator review
- a compact summary rather than a full incident/health report

Command:
```bash
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily
```

## Suggested schedule

Roadmap intent for recurring use:
- daily digest before market open review
- weekly digest after the Friday close / end-of-week review

Exact cron wiring can vary by host/channel setup.

## Dry-run example

```bash
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run
```

Expected result shape:
- `ok: true`
- `portfolio`
- `frequency`
- `dryRun: true`
- `subject`
- `recipients`
- `attempted: false`
- `sent: false`

## Failure / not-ready behavior

Typical reasons for non-send:
- no recipients configured
- delivery policy disabled
- email provider not ready

The digest path is intentionally explicit: it reports why mail was not sent instead of pretending delivery succeeded.

## Safety posture

The digest is a reporting surface only.

It does not:
- approve trades
- transmit trades
- bypass execution or broker gates
- hide broker/readiness degradation

If the digest and the live dashboard disagree, rerun the health/reporting generation path and trust the newest broker-readiness-backed surface.


## Stable-state note

The digest is generated through the same conditional artifact-writing path as the summary/dashboard surfaces, so repeated regeneration should not create content-only churn.
