# Operator runbooks

This is the active incident, execution, and reporting reference.

## Use when
- deciding whether the broker/execution lane is safe to touch
- approving, rejecting, staging, or reconciling trade rows
- generating or sending routine dashboard / digest / health outputs
- checking what files or artifacts should have changed after an action

## Key commands

### Decide and inspect first
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/trade.js config portfolio/etf --json`
- `node scripts/trade.js delivery portfolio/etf --json`
- `node scripts/show-dashboard.js etf`
- `node scripts/run-health-check.js portfolio/etf --dry-run`
- `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run`
- `node scripts/operator-incident-summary.js portfolio/etf`

### Act on execution state
- `node scripts/approve-portfolio-trade.js portfolio/etf '<json>'`
- `node scripts/reject-portfolio-trade.js portfolio/etf '<json>'`
- `node scripts/stage-portfolio-order.js portfolio/etf '<json>' stage`
- `node scripts/trade.js queue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/trade.js requeue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/trade.js status portfolio/etf`
- `node scripts/resync-portfolio-orders.js portfolio/etf`

### Rebuild or communicate reporting state
- `node scripts/regenerate-dashboard.js etf`
- `node scripts/generate-report.js portfolio/etf weekly`
- `node scripts/run-health-check.js portfolio/etf --send-email`
- `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily`
- `node scripts/send-email-verification.js portfolio/etf --to user@example.com`

## What to check after action

### Execution evidence
- `trades.md`
- `history.md`
- `runtime/execution-state.json`
- `runtime/events/runtime-events.jsonl`
- `runtime/overview/portfolio-overview.md`

### Reporting artifacts
- `dashboard.md`
- `portfolio/etf/health-report.{md,html,json}`
- dated files under `portfolio/etf/reports/weekly/`, `monthly/`, or `quarterly/`
- digest CLI JSON output for recipient / attempted / sent state

### Contract references
- `docs/execution-command-surface.md`
- `docs/reporting-command-surface.md`

## Broker readiness note
- Treat `reason: delayed_data_only` as a degraded-but-connected state.
- In that state, broker-backed pricing may use delayed fallback values for analysis and dry-runs.
- Do not treat delayed-only pricing as permission for live submission.

## Operator reading guide
- Start with `trade.js preflight` for decisive live-readiness truth before treating any portfolio as transmission-ready.
- Use `trade.js authority` when you need the canonical execution-authority view across execution mode, broker readiness, runtime pause, and live-arm state.
- Use `trade.js config` when you need the effective broker/runtime config surface without exposing secrets.
- Use `trade.js delivery` when you need the canonical delivery-posture answer instead of inferring from dashboards.
- Use `show-dashboard.js` for a human console summary; use the reporting command surface doc when you need to know which commands emit JSON, write artifacts, or send email.
- `check-transmitted-live-readiness.js` remains a compatibility diagnostic, not the primary readiness surface.
- If `Queued for open runner` is non-zero, confirm those rows are still intended before the market-open run.
- `Open-runner first handoffs` should usually reflect newly queued rows that have not yet had a market-open attempt.
- `Open-runner retries` should only reflect rows that were blocked, reviewed, and intentionally requeued.
- Use `queue-open` for the first handoff of an eligible row.
- Use `requeue-open` only after a row was blocked and explicitly reviewed for retry.
- Use `trade.js status` when you want a quick CLI check of first-handoff vs retry counts without opening `dashboard.md` or `summary.md`.
- Use `runtime/overview/portfolio-overview.md` when you want the same first-handoff vs retry split across multiple portfolios in one place.
- Use `run-health-check.js` and digest/reporting surfaces when the issue is health, communication, or operator confidence rather than immediate execution authority.
- Confirm command evidence in `runtime/events/runtime-events.jsonl`: successful first handoffs emit `queue_open_runner` with `retry: false`, while retries emit `queue_open_runner` with `retry: true`.
- If `Blocked rows` is non-zero, inspect blocker fields in `trades.md` and use the recovery/requeue workflow before retrying.
- If broker readiness is degraded, treat pricing as review-only unless readiness returns to live-safe posture.
- Run the monthly disaster-recovery drill from `docs/operations/dr-drill.md` (secrets/code/broker/gate/reconciliation recoverability); log each run in `memory/YYYY-MM-DD.md`.

## Obsolete material
- The orphan dashboard-email helper trio was retired to `archive/scripts/legacy-dashboard-email/`.
- Old duplicate operator notes were folded into this file and `docs/reporting-command-surface.md`.

## Runtime state vs evidence

When verification re-dirties runtime event/state files, treat that as operational evidence, not a source regression.

## Deposits ledger

The deposits ledger is the source of truth for cumulative net-deposited capital, which feeds total-return calculations across the digest hero, the dashboard, and the `Net deposited CHF` column in `history.md`.

### Use when

- Recording a new deposit or withdrawal that hit the broker account.
- Reconciling a `pending_ibkr_xls` reference once the IBKR transactions XLS lands.
- Investigating why total return / Net deposited / hero values disagree.

### File contract

Each portfolio carries its own ledger at `portfolio/<name>/deposits.md`. Schema:

```
## Ledger
| Date | Direction | Currency | Amount native | FX to CHF | Amount CHF | Method | Reference | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| 2026-04-27 | deposit | CHF | 5000.00 | 1 | 5000.00 | bank_transfer | 515348135 | Initial deposit |
```

- `Direction`: `deposit` (cash in) or `withdrawal` (cash out). Withdrawals subtract from cumulative net deposits.
- `Date`: date received by the broker (cash hit the account), ISO `YYYY-MM-DD`.
- `Reference`: broker transaction reference (IBKR `Reference Number`). Use `pending_ibkr_xls` only when the XLS has not yet arrived.
- Rows are append-only. Correct mistakes by adding a reversal row, not by editing history.

A `## Totals (computed)` block lives below the ledger. It is rewritten by the auto-import CLI; manual edits stay synced if you also recompute by hand.

### Manual append flow

1. Open `portfolio/<name>/deposits.md`.
2. Append a new row to the `## Ledger` table. Keep ISO date, lower-case direction, upper-case currency.
3. Update the `## Totals (computed)` block.
4. Run `node scripts/backfill-history-net-deposited.js portfolio/<name>` to refresh the `Net deposited CHF` column on `history.md`.
5. Run `node scripts/send-dashboard-digest.js --portfolio=<name> --frequency=daily --dry-run` to confirm the hero picks up the new total.

### Auto-import CLI

```
node scripts/import-ibkr-deposits.js --portfolio=etf --xls=/path/to/transactions.xls
node scripts/import-ibkr-deposits.js --portfolio=etf --xls=/path/to/transactions.xls --dry-run
```

- Parses the XLS via the Python `xlrd` shim in `lib/ibkrDepositXls.js`.
- Dedups against existing references in the current `## Ledger`.
- Appends only new rows, then rewrites the `## Totals (computed)` block.
- `--dry-run` prints what would be appended without touching the file.
- The CLI never deletes or edits historical rows.

### `pending_ibkr_xls` backfill convention

When a deposit is observed via IBKR account state (`SettledCash` jump) before the transactions XLS is available, append the row with `Reference=pending_ibkr_xls` and a note explaining the evidence path. When the XLS arrives:

1. Run the auto-import CLI in `--dry-run` mode against the new XLS.
2. If a row matches the date+amount of a `pending_ibkr_xls` placeholder, edit the existing row in place to swap the placeholder for the real reference number. Do NOT add a duplicate.
3. If the auto-import would otherwise treat it as new, add the real reference manually first, then re-run the auto-import (which will dedup it).

### Downstream surfaces

- `history.md` → `Net deposited CHF` column (per-row cumulative as-of that date) via `lib/depositsLedger.js#netDepositedAsOf`.
- Dashboard digest hero → "Net deposited" + "Total return vs deposits" via `src/reporting/reportEmail.js`.
- Withdrawal display → when `cumulativeWithdrawalsChf > 0`, the hero subtitle expands to "Deposits X · Withdrawals Y".

### Verification after editing

- `node scripts/test-deposits-ledger.js`
- `node scripts/test-history-net-deposited-column.js`
- `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run`
- `npm run test:safe` (must stay green)

### Source files

- Parser + helpers: `lib/depositsLedger.js`
- IBKR XLS parser shim: `lib/ibkrDepositXls.js`
- Import CLI: `scripts/import-ibkr-deposits.js`
- Backfill helper: `scripts/backfill-history-net-deposited.js`
