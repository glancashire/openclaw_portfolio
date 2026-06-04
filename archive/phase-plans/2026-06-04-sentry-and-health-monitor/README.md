# Archive batch — 2026-06-04 — Sentry integration + Health monitor simplification

All work in these plans is **completed and merged**. Kept for historical
reference + future audit. Do not treat anything in this folder as the
current source of truth.

## Sentry (5 plans, all done)

| Plan | Status | Commit(s) |
|---|---|---|
| `sentry-integration-plan.md` | shipped | `cf33033`, `8962dc3`, `4d83e71`, `129ce0a`, `7636804`, `1a153c2`, `092e44e`, `0d2b2d2` |
| `sentry-phase-1-scaffold.md` | shipped | `cf33033` |
| `sentry-phase-2-bootstrap.md` | shipped | `8962dc3` |
| `sentry-phase-3-api.md` | shipped | `4d83e71` |
| `sentry-phase-4-orchestrator.md` | shipped | `129ce0a` |

End state:
- `lib/observability/{sentry,bootstrap,sentryApi,autofixBrain}.js` in place.
- 5 unattended entry points wired with the bootstrap shim.
- Cron job `sentry-autofix-weekly` (id `fef83af7-89a0-4f5c-aaf8-293dfd7b37ae`) registered, enabled, Monday 09:00 Europe/Zurich.
- Runbook: `docs/operations/sentry.md`.
- Test coverage: 99 assertions across `test-sentry-*.js`.
- Smoke event `OPENCLAW_PORTFOLIO-1` sent + read back via API (one residual: needs manual UI resolve — token lacks `event:admin`).

## Health monitor simplification (1 plan, done)

| Plan | Status | Commit(s) |
|---|---|---|
| `health-monitor-simplification.md` | Phases A+C+D shipped (B/E/F deferred — see CURRENT_PLAN.md) | `6d35fe5`, `bd8181b`, `e97313d` |

End state:
- `classifyPortfolioHealth` returns `state`/`summary`/`canonicalNextAction`.
- Email gate: `state ∈ {attention, critical}` only.
- Persistence check: first-occurrence symptoms suppressed.
- 24h rate-limit per blocker-code set.
- New 4-block email format with copy-paste bb8 prompt.
- Tests: 22 (state derivation) + 29 (escalation email) = 51 assertions.

## Older phase closures (3 plans, done)

| Plan | Status | Commit |
|---|---|---|
| `phase-f6-retire-deferred-email-comment.md` | shipped | `61091f9` |
| `phase-g4-deposits-runbook.md` | shipped | `3f86412` |
| `phase-h1-baseline.md` | shipped | `ac749da` |

End state:
- `basketLifecycle.js` deferred-email comment removed; reason renamed to `deferred_to_monitor_fills_cron`.
- `docs/operator-runbooks.md` carries the deposits-ledger lifecycle section.
- `docs/research/h1-allocation-baseline-2026-06-03.md` + `runtime/research/h1-baseline-2026-06-03.json` + `docs/research/h1-baseline-2026-06-03.json` captured.

## What carried forward into CURRENT_PLAN.md

Open items extracted from these plans (still active in `CURRENT_PLAN.md`):

- **Health-monitor Phase B** — targeted second-pass autofix (deferred; lower priority once gate + rate-limit eliminated false-positive emails).
- **Health-monitor Phase F** — `runtime/overview/health-trend.jsonl` for trend visibility (deferred).
- **Lifecycle counter bug** — `inactive` rows being counted as in-flight (discovered during health-monitor work; pre-existing, not addressed in this batch).
- **F4/G3** — IBKR XLS backfill for deposit reference (operator-gated).
- **G2** — wire `import-ibkr-deposits.js` into daily-sync cron once XLS path is stable.
- **H2/H3** — allocation-target decision (data-gated, earliest review 2026-06-17).
- **B5** — IBKR keepalive operator response (recurring ops).
