# STATUS - Portfolio Manager

> Single source of truth for the current operational state.
> Live work lives in `CURRENT_PLAN.md`. Pending decisions live in `docs/decisions-pending.md`. Historical plans, audits, and task notes live under `archive/`.

**Last refreshed:** 2026-06-04 09:30 UTC
**Repo head:** `e97313d` ("feat(health): escalation email includes copy-paste bb8 prompt")
**Tests:** `npm test` 23/23 · `npm run test:safe` 250/250

---

## Health at a glance

| Lane | State | Notes |
| --- | --- | --- |
| ETF portfolio read/report path | healthy | regular reporting surfaces build from current repo/runtime state |
| IBKR socket / auth / read | green | readonly access and reporting flows are healthy |
| IBKR quote posture | green | `marketDataMode=live_or_realtime` |
| Live order submission | unblocked | end-to-end basket flow validated 2026-06-03 |
| Holdings sync | functional | sync is truthful |
| Dashboard / report emails | healthy | light-only theme, hero shows Net deposited, per-instrument descriptions in P/L card |
| Fill-confirmation emails | healthy | ISIN↔conid bridge + canonical-name precedence live; `monitor-fills` cron disabled by default (enable only during live execution) |
| Deposits ledger | wired | 9 deposits, 140k CHF cumulative, `history.md` carries `Net deposited CHF` per row |
| **Health monitor** | **upgraded** | single `state` field, escalation-only emails, 24h rate-limit, 4-block format with paste-ready bb8 prompt |
| **Sentry error tracking** | **live** | `@sentry/node` instrumentation on 5 entry points, weekly autofix cron (Mon 09:00 Europe/Zurich), runbook at `docs/operations/sentry.md` |
| Safe-lane verification | green | last run: 250 passed, 0 failed, 3 quarantined |
| Cron jobs | healthy | 11 enabled + 1 disabled (`monitor-fills` by policy); policy gate green |
| OpenClaw control UI | healthy | session-retention cleanup + current repo surfaces in place |

## Known outstanding issue (tracked as Phase I)

The lifecycle summary counts long-dead `inactive` order rows as "in-flight". This keeps the ETF health state at `attention` despite there being nothing the operator can act on. The new email gate + 24h rate limit caps the noise at one email/day until the counter is fixed.

→ **Fix path:** `CURRENT_PLAN.md` Phase I (deterministic, ready to start on "go").

## What works (current)

- Markdown-controlled portfolio contracts (`portfolio.md`, `holdings.md`, `trades.md`, `history.md`, `dashboard.md`, `deposits.md`).
- Native IBKR readonly + transmitted-live order paths.
- Sync guard lock plus last-known-good preservation on broker reads.
- Approval-gated execution with safe-word + PIN; basket envelope flow with policy gate.
- Reporting stack: dashboard, health reports, overview surfaces, digests, investor emails, fill emails.
- Fill notification self-healing: `monitor-fills` cron retries deferred fills every 15 minutes **when enabled**; canonical instrument names + ISIN↔conid bridge prevent silent defers.
- **Health monitor escalation discipline:** only fires on persistent attention/critical states; 24h rate-limit per blocker-code set; emails include a copy-paste prompt operators can feed to bb8 in a fresh session.
- **Sentry error tracking + weekly autofix:** unhandled errors + handled `captureError()` calls land in Sentry; Monday 09:00 CET cron pulls unresolved issues and runs sub-agent fix attempts (Tier 1 default = branch + you merge; Tier 2 auto-merge only in `scripts/`, `lib/observability/` allowlist).
- Test governance and repo-truth checks (`npm test`, `test:safe`, manifest/domain-summary validation, root-cleanliness gate).
- Archive-backed history: completed phase plans, audits, and task notes live outside the current docs.

## What is open (engineering)

See `CURRENT_PLAN.md` for the phased breakdown. Summary:

- **Phase I** — health-monitor follow-on (lifecycle counter + trend log). Ready for autonomous execution.
- **Phase J** — second-pass autofix (parked unless reactivated).
- **Phase F/G** — deposits ledger close-out: docs done; cron wiring waits on operator-side XLS backfill.
- **Phase H** — allocation-target decision: data-gated, earliest review 2026-06-17.

## What is operator-owned

- **Phase B5** — keep IBKR session warm; respond to keepalive 2FA alerts.
- **Phase F4 / G3** — backfill `pending_ibkr_xls` placeholder for 2026-06-03 deposits row when next XLS arrives.
- **D-5** — manually resolve smoke event `OPENCLAW_PORTFOLIO-1` in Sentry UI (or add `event:admin` scope so bb8 can do it).
- **Fill-monitor cron lifecycle** — enable only during live execution; disable on completion.

## What is parked

- FX cash reconciliation · Control UI direct embedding · EM ex-China sleeve.
- All locked PARKED unless explicitly reactivated.

## Operator quick refs

- IBKR live status: `node scripts/ibkr-fast-status.js`
- Sync after recovery: `node scripts/sync-ibkr-after-recovery.js etf`
- Compact dashboard: `node scripts/show-dashboard.js etf`
- Send dashboard digest: `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --send`
- Health check (one-shot): `node scripts/run-health-check.js portfolio/etf --send-email`
- Sentry issue list: `node scripts/fetch-sentry-issues.js --json`
- Sentry weekly autofix (dry-run): `node scripts/sentry-autofix-weekly.js --dry-run`
- Enable fill monitor: `openclaw cron enable d4c3207d-9e03-4e98-85eb-2eff38f50d4d`
- Disable fill monitor: `openclaw cron disable d4c3207d-9e03-4e98-85eb-2eff38f50d4d`
- Cron snapshot: `docs/operations/active-cron-jobs.md`
- Recovery ladder: `docs/operations/ibkr-recovery.md`
- Sentry runbook: `docs/operations/sentry.md`

## Where things live

| Concern | File |
| --- | --- |
| Spec | `SPECIFICATION.md` |
| Live plan | `CURRENT_PLAN.md` |
| Pending decisions | `docs/decisions-pending.md` |
| Operational truth | `STATUS.md` |
| Repo map | `docs/operations/repo-map.md` |
| Current runbooks / setup docs | `docs/operations/*.md`, `docs/setup/*.md` |
| Historical phase plans | `archive/phase-plans/**` |
| Historical audits / roadmaps | `archive/docs/**` |
| Historical task notes / harvesters | `archive/tasks/**` |
| Daily memory | `memory/YYYY-MM-DD.md` |
