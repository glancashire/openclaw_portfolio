# Dashboard v2

_Last updated: Phase 212 — dashboard/reporting surfaces aligned with health email, digest email, and operator queue v2._

## Purpose

Dashboard v2 is the operator-facing reporting layer for the portfolio-manager runtime. It consolidates:

- portfolio posture
- execution readiness
- delivery/reporting health
- broker recovery signals
- operator queue priority
- recent runtime/report history

The dashboard is generated from repo state plus runtime state. It is descriptive first: it explains what the system sees and what the operator should do next, without bypassing approval gates.

## Main generated surfaces

### Portfolio dashboard
- Path: `portfolio/<portfolio>/dashboard.md`
- Regenerate: `node scripts/regenerate-dashboard.js portfolio/<portfolio>`
- Purpose: portfolio-local operational view for a single portfolio.

### Portfolio summary artifacts
- Paths:
  - `portfolio/<portfolio>/summary.json`
  - `portfolio/<portfolio>/summary.html`
- Regenerate: `node scripts/generate-portfolio-summary.js --portfolio=<name>`
- Purpose: structured and HTML summary of holdings, allocation, execution state, and operator queue.

### Runtime overview surfaces
- Paths under `runtime/overview/`:
  - `index.html`
  - `daily-summary.html`
  - `portfolio-overview.html`
  - `delivery-status.html`
  - `approvals-queue.html`
  - `report-history.html`
- Generator: overview artifacts are refreshed as part of the reporting/health flows.
- Purpose: cross-portfolio cockpit and operator command center.

## What each card/section means

### Daily summary
The daily summary is the shortest operator-facing overview. It emphasizes:

- current portfolio value and cash
- allocation drift
- execution posture
- queue count / blocker count
- recent trend context

It is intended to answer: _"Do I need to act now, and if so on what?"_

### Portfolio trend / sparkline
Source:
- `src/reporting/historyDigest.js`
- `src/reporting/sparkline.js`
- portfolio history snapshots

What it shows:
- recent end-of-day net liquidation history
- lightweight inline SVG trend for HTML/email-safe rendering

Use it for:
- quick drift/trend sanity checks
- spotting obvious discontinuities before acting on execution recommendations

### Allocation drift
Source:
- `src/analysis/allocationAnalysis.js`
- `portfolio/<portfolio>/holdings.md`
- `portfolio/<portfolio>/portfolio.md`

What it shows:
- sleeve-level current allocation
- target allocation
- drift percentage
- status classification such as `ok`, `drifted`, or `out_of_bounds`

Operator meaning:
- `out_of_bounds` is the strongest rebalance signal
- `drifted` means monitor or prepare, not necessarily execute immediately

### Instrument health
Source:
- approved instruments
- latest proposal state
- execution/blocked-row summaries

What it shows:
- instrument identifier
- sleeve
- drift context
- proposal state
- approval state
- block reason / execution note if present

Operator meaning:
- this is the quickest way to see whether a specific ETF is actionable, pending approval, or blocked by broker/policy conditions

### Cron health
Source:
- `src/reporting/cronJobsFetcher.js`
- `src/reporting/cronHealthCard.js`

What it shows:
- job severity
- consecutive error counts
- age since last run
- most recent error summary

Severity intent:
- `ok`: healthy and recent
- `warning`: error accumulation or aging needs attention
- `alert` / `critical`: operational breakage likely affecting reporting or execution workflows
- `stale`: runs are too old to trust

## Operator queue semantics

The operator queue merges several action sources into a single ranked list.

Common queue types:
- `approval`
- `execution`
- `execution_block`
- `delivery`
- `recovery`
- `open_runner_queue`
- `open_runner_retry`
- `workflow`

Common statuses:
- `blocked`
- `degraded`
- `paused`
- `pending_user_approval`
- `ready_for_review`
- `in_flight`
- `backfill_review`
- `recommended`

Priority behavior:
- blocking/recovery items outrank generic workflow suggestions
- explicit approval work outranks delivery cleanup
- delivery backfill review outranks generic recommended actions
- the queue is deduped so the operator sees the current decisive item, not historical noise

## Delivery status and backfill review

Delivery surfaces track whether reports/fill notifications are ready, pending, or need cleanup.

Relevant runtime state:
- `runtime/fill-notifications-state.json`

Examples of surfaced issues:
- email delivery not ready
- backfill review required for reconciled fills detected after the live window
- delivery path missing recipients/targets

These states are intentionally surfaced as operator workflow items rather than hidden failures.

## Data sources

Dashboard v2 is assembled from these categories:

### Markdown state
- `portfolio/<portfolio>/portfolio.md`
- `portfolio/<portfolio>/holdings.md`
- `portfolio/<portfolio>/trades.md`
- `portfolio/<portfolio>/history.md`

### Runtime state
- `runtime/events/runtime-events.jsonl`
- `runtime/execution-state.json`
- `runtime/fill-notifications-state.json`
- `runtime/approved-order-baskets/`
- `runtime/basket-proposals/`
- `runtime/circuit-breakers/`
- `runtime/observability/event-log.jsonl`

### Broker/runtime signals
- Interactive Brokers readiness
- broker error pause state
- open-runner retry summaries
- generated-state validation

## Refresh / recovery commands

### Regenerate portfolio dashboard
```bash
node scripts/regenerate-dashboard.js portfolio/etf
```

### Generate summary artifacts
```bash
node scripts/generate-portfolio-summary.js --portfolio=etf
```

### Run health check and refresh reporting safely
```bash
node scripts/run-health-check.js portfolio/etf --dry-run
node scripts/run-health-check.js portfolio/etf
```

## Safety posture

Dashboard v2 is intentionally operator-first:
- it may recommend actions
- it may classify issues
- it may report auto-healed safe fixes
- it does **not** remove approval requirements for live trading

If a surface looks contradictory, trust the most recent broker-readiness and queue/block context, then rerun the health check before acting.
