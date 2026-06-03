# STATUS - Portfolio Manager

> Single source of truth for the current operational state.
> Live work lives in `CURRENT_PLAN.md`. Historical plans, audits, and task notes live under `archive/`.

**Last refreshed:** 2026-06-03 16:24 UTC
**Repo head:** `cf56f87` ("fills: prefer canonical approvedInstruments name in fill emails")

---

## Health at a glance

| Lane | State | Notes |
| --- | --- | --- |
| ETF portfolio read/report path | healthy | regular reporting surfaces build from current repo/runtime state |
| IBKR socket / auth / read | green | readonly access and reporting flows are healthy |
| IBKR quote posture | **green** | `marketDataMode=live_or_realtime`; 20k live basket executed today (2026-06-03 14:29 UTC) |
| Live order submission | **unblocked** | end-to-end basket flow validated today |
| Holdings sync | functional | sync is truthful |
| Dashboard / report emails | healthy | light-only theme, hero shows Net deposited, per-instrument descriptions in P/L card |
| Fill-confirmation emails | healthy | ISIN↔conid identity bridge live, canonical-name precedence fixed, `monitor-fills` cron retrying every 15 min during market hours |
| Deposits ledger | wired | 9 deposits, 140k CHF cumulative, `history.md` carries `Net deposited CHF` per row |
| Safe-lane verification | green | last run: 242 passed, 0 failed, 3 quarantined |
| Cron jobs | healthy | 11 enabled jobs in snapshot; policy gate 12/12 green |
| OpenClaw control UI | healthy | session-retention cleanup and current repo surfaces are in place |

## What works (current)

- Markdown-controlled portfolio contracts (`portfolio.md`, `holdings.md`, `trades.md`, `history.md`, `dashboard.md`, `deposits.md`).
- Native IBKR readonly + transmitted-live order paths.
- Sync guard lock plus last-known-good preservation on broker reads.
- Approval-gated execution with safe-word + PIN; basket envelope flow with policy gate.
- Reporting stack: dashboard, health reports, overview surfaces, digests, investor emails, fill emails.
- Fill notification self-healing: `monitor-fills` cron retries deferred fills every 15 minutes; canonical instrument names + ISIN↔conid bridge prevent silent defers.
- Test governance and repo-truth checks (`npm test`, `test:safe`, manifest/domain-summary validation, root-cleanliness gate).
- Archive-backed history: completed phase plans, audits, and task notes live outside the current docs.

## What is open (engineering)

See `CURRENT_PLAN.md` for the phased breakdown. Summary:

- **Phase F** — fill-pipeline observability close-out: passive soak (F5) + small cleanup (F6).
- **Phase G** — deposits ledger close-out: docs (G4) + cron wiring after operator backfill (G2/G3).
- **Phase H** — allocation-target decision (additive vs replacement): data-gated, ~2 weeks out.

## What is operator-owned

- **Phase B5** — keep IBKR session warm; respond to keepalive 2FA alerts.
- **Phase F4 / G3** — when the next IBKR XLS arrives, swap `pending_ibkr_xls` placeholder for the real broker reference in the 2026-06-03 deposits row.

## What is parked

- FX cash reconciliation · Control UI direct embedding · EM ex-China sleeve.
- All locked PARKED unless explicitly reactivated.

## Operator quick refs

- IBKR live status: `node scripts/ibkr-fast-status.js`
- Sync after recovery: `node scripts/sync-ibkr-after-recovery.js etf`
- Compact dashboard: `node scripts/show-dashboard.js etf`
- Send dashboard digest: `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --send`
- Cron snapshot: `docs/operations/active-cron-jobs.md`
- Recovery ladder: `docs/operations/ibkr-recovery.md`

## Where things live

| Concern | File |
| --- | --- |
| Spec | `SPECIFICATION.md` |
| Live plan | `CURRENT_PLAN.md` |
| Operational truth | `STATUS.md` |
| Repo map | `docs/operations/repo-map.md` |
| Current runbooks / setup docs | `docs/operations/*.md`, `docs/setup/*.md` |
| Historical phase plans | `archive/phase-plans/**` |
| Historical audits / roadmaps | `archive/docs/**` |
| Historical task notes / harvesters | `archive/tasks/**` |
| Daily memory | `memory/YYYY-MM-DD.md` |
