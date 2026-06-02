# Phase S5 — Soak prep

**Goal:** Leave the system in a state where Graham can step away for days/weeks while it accumulates usage evidence. Confirm every load-bearing path is green, write a single soak-readiness report, and pre-commit the watch-list of things that should automatically surface if they start drifting.

## Objectives
1. Final green sweep: run every test, every health-check, every readiness probe; capture results
2. Confirm all active crons are scheduled correctly and will produce evidence (logs, reports, emails)
3. Document the soak watch-list (what counts as drift, what to ignore)
4. Write `docs/operations/soak-readiness.md` — the single artifact the operator can read to know the system is left in a known-good state
5. Set a one-shot "soak check-in" cron for ~5 days out so the system pings itself if Graham hasn't checked in

## Risks / dependencies
- Tuesday 07:45 UTC `basket-approval-reminder-tuesday` will fire autonomously and is the first real test of the holiday-aware workflow; soak-readiness must explain what to do with its email
- Telegram still misconfigured; all soak observability is via email + filesystem reports
- Soak check-in cron is informational; don't make it a hard alert

## Actionable checklist

### Sub-phase A — Final green sweep
- [ ] `npm test` exit 0, capture check count
- [ ] `node scripts/run-health-check.js portfolio/etf` exit 0, capture `openIssues`
- [ ] `node scripts/check-interactive-brokers-readiness.js` exit 0 (or note known offline state)
- [ ] `node scripts/check-rebalance.js portfolio/etf` exit 0
- [ ] Capture all four results in a single JSON snapshot for the soak doc

### Sub-phase B — Cron readiness
- [ ] Re-run the cron policy snapshot test
- [ ] Spot-check next-fire times for each enabled cron
- [ ] Confirm no `consecutiveErrors > 0` on any enabled job

### Sub-phase C — Soak watch-list
- [ ] Define what drift looks like:
  - Any cron `consecutiveErrors >= 3`
  - Any `runtime/circuit-breakers/<portfolio>/*.json` newly tripped (audit log will record clears)
  - Health monitor reporting `openIssues.length > 0`
  - IBKR readiness check failing for 3+ consecutive runs
  - `npm test` failing
- [ ] Document recovery pointers (which script/runbook to consult per drift)

### Sub-phase D — Soak readiness doc
- [ ] `docs/operations/soak-readiness.md` with:
  - Final green-sweep results (date-stamped)
  - Active cron table (link to `active-cron-jobs.md`)
  - Watch-list with severity
  - How to re-verify ("if you've been away N days, run X")
  - Known-issue list (4 unmapped ISINs sentinel, Telegram delivery)
  - Pointer to `phase-S*-plan.md` series for full audit trail

### Sub-phase E — Soak self-check cron
- [ ] One-shot cron at 2026-05-30 (5 days out) that:
  - Runs health check
  - Compares against `runtime/soak-baseline.json` (committed by this phase)
  - Sends an email to Graham summarizing drift if any
  - Auto-deletes after run
- [ ] Use `sessionTarget=current`, `bestEffort:true`, `agentTurn`, conforming to S3 policy

### Sub-phase F — Regression
- [ ] `scripts/test-soak-baseline-shape.js` — ensures `runtime/soak-baseline.json` (or `docs/operations/soak-baseline.json` if we commit it under docs) has the expected fields so the self-check cron can compare reliably
- [ ] Wire into verifyRepoChecks

## Acceptance criteria
- `npm test` exit 0 (33+ checks including new soak-baseline gate)
- `docs/operations/soak-readiness.md` exists and is dated 2026-05-25
- A soak-baseline JSON snapshot is committed
- One self-check cron is scheduled for 2026-05-30 with bestEffort:true and sessionTarget=current
- All commits pushed

## Out
The system can run unattended; if anything drifts, a self-check cron in five days will tell Graham; meanwhile, usage evidence accumulates in the existing report cycles.
