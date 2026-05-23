# Self-Heal Recipes

_Last updated: Phase 212 — structured self-heal classification, healed/open issue surfaces, and observability-backed health reporting._

## Purpose

Self-heal is the conservative automation layer behind the health check flow. Its job is to:

- classify operational symptoms
- apply only safe/idempotent repairs
- leave risky or external actions as explicit operator issues
- record enough structured output for reports and trends

Primary entrypoint:

```bash
node scripts/run-health-check.js portfolio/etf --dry-run
node scripts/run-health-check.js portfolio/etf
node scripts/run-health-check.js portfolio/etf --send-email
```

- `--dry-run` classifies and reports without applying safe fixes
- default mode applies safe fixes only
- `--send-email` sends the rendered HTML/Markdown health report if delivery policy is ready

## Output model

The health check returns structured self-heal sections in the JSON/report output:

- `classified`: categorized symptoms detected this cycle
- `actions`: safe remediation attempts and outcomes
- `openIssues`: operator-only items that were not auto-fixed
- `operatorCommands`: concrete next-step commands/guidance for surfaced open issues

## What self-heal is allowed to do

Safe fixes are intentionally limited to low-risk, idempotent actions such as:

- regenerating dashboard/reporting artifacts
- refreshing summary/overview output
- recording observability events
- classifying issues for the operator queue/email report

These actions are safe because they rewrite generated artifacts from existing repo/runtime state rather than making external broker/account changes.

## What self-heal is **not** allowed to do automatically

The current implementation does **not** auto-execute high-risk external actions such as:

- transmitting trades
- approving baskets/orders
- bypassing market-hour or approval gates
- forcing IBKR login / 2FA flows
- masking subscription gaps by inventing live data
- silently clearing active circuit breakers

If a fix requires operator judgment or external state restoration, self-heal surfaces it as an open issue instead.

## Common classifications

Examples of issue categories surfaced by the current health/reporting pipeline:

### `delivery_missing_target`
Meaning:
- delivery path is configured, but there is no valid route/recipient

Typical operator response:
- configure recipients/targets
- prefer email delivery where the runtime supports it reliably

### `ibkr_socket_dead`
Meaning:
- native IBKR connectivity is down (for example `ECONNREFUSED 127.0.0.1:4001`)

Typical operator response:
- relaunch the pinned native gateway wrapper
- complete GUI login / 2FA if needed
- rerun readiness/health checks

Suggested command surfaced in reports:
```bash
/home/ubuntu/ibgateway-native/start-ibc.sh
```

### `cron_excessive_errors`
Meaning:
- a cron job is repeatedly failing and should be investigated or disabled

Suggested command surfaced in reports:
```bash
openclaw cron disable <jobId>
```

### `market_data_subscription_gap`
Meaning:
- broker data/subscription conditions are insufficient for the intended live-quality pricing path

Suggested probe:
```bash
node scripts/probe-market-data-subscriptions.js
```

### `broker_automation_paused`
Meaning:
- broker automation was paused after repeated broker/runtime errors

Suggested follow-up:
```bash
node scripts/run-health-check.js portfolio/etf --dry-run
```

## Observability and trends

Self-heal participates in the health observability trail.

Relevant path:
- `runtime/observability/event-log.jsonl`

The health report uses recent events to build trend summaries such as:
- recent success/failure patterns
- blocker counts over recent runs
- last few health states and severities

This means the operator can distinguish:
- a one-off failure
- a recurring degraded state
- a problem that was auto-healed but keeps coming back

## Health report integration

Self-heal output is rendered into:
- `portfolio/<portfolio>/health-report.json`
- `portfolio/<portfolio>/health-report.md`
- `portfolio/<portfolio>/health-report.html`

Important rendered sections:
- Immediate status
- Classified symptoms
- Issues auto-healed this cycle
- Open issues for operator
- Recent trends
- Unresolved exceptions

## Relationship to runtime cleanup

Runtime cleanup is a separate explicit maintenance command, not an implicit self-heal side effect:

```bash
node scripts/cleanup-runtime-artifacts.js --portfolio=etf --dry-run
node scripts/cleanup-runtime-artifacts.js --portfolio=etf
```

Cleanup is conservative and only targets:
- superseded basket proposals older than the retention window
- superseded terminal approved baskets older than the retention window
- cleared circuit breakers older than the retention window

It does **not** remove active breakers or live approval state.

## Recommended operator workflow

### Quick inspection
```bash
node scripts/run-health-check.js portfolio/etf --dry-run
```

### Apply safe fixes and regenerate artifacts
```bash
node scripts/run-health-check.js portfolio/etf
```

### Send the health email if the delivery path is ready
```bash
node scripts/run-health-check.js portfolio/etf --send-email
```

### If broker connectivity is down
1. restore IBKR gateway connectivity
2. rerun readiness check
3. rerun the health check
4. only then revisit execution work

## Safety summary

Self-heal is intentionally conservative.

It is designed to reduce operator toil around reporting/diagnostics, not to take ownership of trading decisions or broker recovery steps that need human review.
