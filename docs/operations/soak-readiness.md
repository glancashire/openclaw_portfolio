# Soak readiness — 2026-05-25

This is the single artifact to read when handing the system off to soak. Goal:
let it run unattended for days/weeks while it accumulates usage evidence, with
clear thresholds for what to look at on return.

## Final green sweep (2026-05-25 ~15:20 UTC)

| Check | Result |
|---|---|
| `npm test` | ✅ 32+ checks, exit 0 |
| `node scripts/run-health-check.js portfolio/etf` | ✅ `openIssues: 0`, all actions applied |
| `node scripts/check-interactive-brokers-readiness.js` | ✅ `reason: ready`, live/realtime market data available |
| `node scripts/check-generated-state.js portfolio/etf` | ✅ OK |
| `node scripts/check-safety-controls.js portfolio/etf` | ✅ max observed weight 0% / limit 50% |
| Active cron `consecutiveErrors` | ✅ 0 across all 10 enabled jobs |
| Active circuit breakers | ✅ 0 (SPMCHA cleared earlier today with documented reason) |

Snapshot: `docs/operations/soak-baseline.json`

## Active automation

See `docs/operations/active-cron-jobs.md` (gated by `scripts/test-cron-job-policy.js`).

Imminent autonomous actions:
- **2026-05-26 07:45 UTC** — `basket-approval-reminder-tuesday` re-proposes the
  ETF basket with live ticks after Whit Monday's market closure. Will email
  Graham with the basket and an explicit "reply with: approve <approvalId>"
  instruction. **Will not auto-approve.** Deletes after run.
- **2026-05-26 09:30 UTC** — `rebalance-fill-check-monday` checks order fills.
  Reports to Graham. Deletes after run.

## Soak watch-list

Things that should bring you back to the terminal:

| Signal | Severity | First action |
|---|---|---|
| Any enabled cron job has `consecutiveErrors >= 3` | high | `docs/operations/cron.md` failure-handling section |
| New circuit breaker tripped in `runtime/circuit-breakers/<portfolio>/` | high | Investigate the lineage, then `scripts/clear-circuit-breaker.js --reason="..."` once root-caused |
| Health monitor reports `openIssues.length > 0` | medium | Read the report, follow the `recommendedOperatorAction` field |
| IBKR readiness fails 3+ consecutive runs | medium | Native gateway recovery section in `TOOLS.md` (2FA on display :99) |
| `npm test` fails after self-update | high | Investigate immediately; do not re-enable any disabled job |
| Daily/weekly report not generated | low | Check the cron run history; not load-bearing for state |

## Where to read evidence

- **Reports:** `portfolio/etf/dashboard.md`, `portfolio/etf/health-report.md`, `portfolio/etf/summary.json`
- **Cron run logs:** `openclaw cron runs <jobId>` or `cron` MCP tool action `runs`
- **Holdings sync history:** `portfolio/etf/history.md`
- **Trade log:** `portfolio/etf/trades.md`
- **Live runtime state:** `runtime/execution-state.json`, `runtime/basket-proposals/etf/`, `runtime/approved-order-baskets/etf/`
- **Daily memory:** `memory/YYYY-MM-DD.md`

## Known non-issues

- **4 unmapped ISINs sentinel** (`LU0950670850`, `IE00B44T3H88`, `IE00B5L8K969`, `IE00B4L5YX21`): future-candidate sleeves at 0% target. They show `missing_identity` in calendar sync, which is correct.
- **Telegram delivery `fail-closed`**: every cron's announce delivery reports a Telegram error. `bestEffort:true` prevents this from polluting cron state. Observability flows through email.
- **Operator pending action**: tomorrow morning's basket reminder.

## How to re-verify after time away

1. `git pull` (if you're not on the host)
2. `npm test` — should still be green
3. `node scripts/run-health-check.js portfolio/etf` — should still report `openIssues: 0`
4. Read `memory/<latest-date>.md`
5. Compare `runtime/circuit-breakers/etf/` against the baseline (no new files)
6. Skim `portfolio/etf/dashboard.md` for any unexpected drift

## Audit trail

- Stabilization sprint commits: `62f32fc` (S1), `3e3b11c` (S2), `590e204` (S3), `b242bd0` (S4), and this S5 commit
- Phase plans: `phase-S1-*.md` through `phase-S5-*.md` in the repo root
- Soak self-check: see `phase-S5-soak-prep-plan.md` sub-phase E (one-shot cron scheduled by this phase if approved)

## Stop / reverse procedure

If something looks wrong and you want to halt automation:

```bash
# Disable all enabled cron jobs (idempotent)
openclaw cron list --json | jq -r '.jobs[] | select(.enabled==true) | .id' | xargs -I{} openclaw cron disable {}

# Or selectively disable the one that's noisy:
openclaw cron disable <jobId>
```

The system is read-only by default; no enabled cron places orders without an
explicit `approve <approvalId>` from Graham. The basket-approval-reminder cron
only sends an email; it does not act.
