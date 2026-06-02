# Email Digest

_Last updated: Phase 1 operator surface cleanup, 2026-06-02._

## Purpose

The active digest CLI sends the redesigned three-block portfolio email used for recurring review.

Primary CLI:

```bash
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=weekly
```

## Current rendering path

The active send path is:
- `scripts/send-dashboard-digest.js`
- `collectPortfolioSummary()` from `src/reporting/summaryArtifacts.js`
- `buildReportEmailHtml()` / `buildReportEmailText()` from `src/reporting/reportEmail.js`

The active digest send path does **not** use the older multi-card `src/reporting/dashboardDigest.js` renderer.

## Body blocks

The email body now contains only:
1. `Portfolio Value Snapshot`
2. `Profit / Loss`
3. holdings table sorted by CHF value descending, including `Weight %` and a sum row

## CLI arguments

### `--portfolio=<name>`
Portfolio folder name under `portfolio/`.

Default:
- `etf`

### `--frequency=daily|weekly`
Controls subject line and framing.

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

Digest delivery resolves recipients in this order:
1. `emailRecipients` from the effective delivery policy
2. `MAILGUN_RECIPIENT` environment variable fallback

If no recipients resolve, the digest reports:
- `attempted: false`
- `sent: false`
- `reason: "no_recipients_configured"`

## Output contract

The digest CLI always writes JSON to stdout.

### Dry-run result shape
- `ok: true`
- `portfolio`
- `frequency`
- `dryRun: true`
- `subject`
- `recipients`
- `attempted: false`
- `sent: false`

### Live-send result shape
- `ok: true`
- `portfolio`
- `frequency`
- `dryRun: false`
- `attempted: true`
- `sent: true`
- `subject`
- `recipients`
- `provider`

## Related surfaces

### Console dashboard
Use when you want a quick human readout:
```bash
node scripts/show-dashboard.js etf
```

### Dated report artifacts
Use when you want saved weekly/monthly/quarterly report files:
```bash
node scripts/generate-report.js portfolio/etf weekly
```

### Health report
Use when you want issue classification and optional email delivery:
```bash
node scripts/run-health-check.js portfolio/etf --dry-run
node scripts/run-health-check.js portfolio/etf --send-email
```

## Suggested schedule

Roadmap intent for recurring use:
- daily digest before market open review
- weekly digest after the Friday close / end-of-week review

## Safety posture

The digest is a reporting surface only.

It does not:
- approve trades
- transmit trades
- bypass execution or broker gates
- hide broker/readiness degradation
