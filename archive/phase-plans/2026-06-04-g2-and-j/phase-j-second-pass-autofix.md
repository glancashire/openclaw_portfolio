# Phase J — Targeted second-pass autofix

**Date:** 2026-06-04
**Status:** READY for autonomous implementation
**Was:** parked. Reactivating because we now have a clean attention-only signal that can drive deterministic second-pass remediation without spamming Graham.

## Objectives

1. Add a **second-pass autofix** that runs AFTER the existing pass-1 (`attemptSafeSelfHeal`) when, and only when, the post-pass-1 health state is still `attention` or `critical`.
2. Pass 2 is a **whitelisted dispatch table** keyed on blocker code → fixer function. Each fixer is:
   - idempotent
   - read-mostly or write-only-on-derived-artifacts
   - **never touches execution paths**, basket approval state, transmit scripts, broker state, or `.env`
3. After pass 2 runs, re-collect health signals and re-derive `state`/`summary`/`canonicalNextAction`. If the symptom is gone, that result wins; the email gate sees `healthy` and stays silent.
4. Log every pass-2 attempt to the existing observability stream (`runtime/events/runtime-events.jsonl`) and the new `health-trend.jsonl` already in place from Phase I.

## Risks / Dependencies

- **Whitelist drift.** A future blocker code with no fixer must NOT crash. Default = no-op.
- **Regression on healthy case.** When pass-1 is enough, pass-2 must not run (or must be a perfect no-op).
- **Self-heal recursion.** `attemptSafeSelfHeal` already reruns `regenerate_dashboard` and `regenerate_reporting_artifacts`. Pass 2 should **not** redo those.
- **State persistence.** A pass-2 fixer that runs every cycle without success would mask a real problem. Add a per-blocker-code cap (max 1 pass-2 attempt per 24h, similar to email rate-limit).

## Whitelist (initial set)

| Blocker code | Pass-2 fixer | Effect |
|---|---|---|
| `delivery_attention` (when summary mentions `actionableFailed` / `awaiting reconcile` / `notification backfill`) | `reconcile_inflight_rows` | call `sync-portfolio-order-status` for any `submitted-awaiting-reconcile` order ids; safe — script is already used by operators |
| `broker_unready` (low severity, e.g. transient socket blip) | `repoll_broker_readiness` | second readiness probe with a short delay; no state mutation |
| `fill_notification_backfill` | `regenerate_fill_notifications_index` | rebuild the reconciled-fill markdown index from existing JSON; pure read+write of derived |
| `delivery_freshness_stale` | `bump_dashboard_freshness` | rerun dashboard regen with `--force` |
| (anything else) | none | leave as-is, escalate normally |

**Hard exclusions (never auto-fix):** `broker_automation_paused`, `stop_automation`, `staleNeedsReapproval`, anything basket/approval related.

## Acceptance criteria

1. New module `src/reporting/healthFixers.js`:
   - exports `runSecondPassFixers({ report, portfolioDir, repoRoot, now })` returning `{ attempted: [{ code, fixer, ok, error, durationMs }], rateLimited: [...], skipped: [...] }`
   - each fixer is a small function in the same file (or required from elsewhere) — easy to read in one screen
   - rate-limit state in `portfolio/<name>/health-pass2-rate.json`
2. `runHealthCheck` integration:
   - after pass-1 finishes, if `state ∈ {attention, critical}`, call `runSecondPassFixers`
   - re-collect health signals
   - re-derive verdict
   - report includes both `selfHeal.actions` (pass-1) and `selfHeal.secondPass` (pass-2)
3. `buildEscalationEmail` updated to surface "What bb8 tried in pass 2" when applicable.
4. Tests:
   - `scripts/test-health-fixers.js` — unit tests for each fixer using stubbed dispatchers (12+ assertions)
   - `scripts/test-health-second-pass-integration.js` — integration: simulate an attention state, run full check, verify the fixer fires and the rerun verdict reflects success/failure (8+ assertions)
   - regression: existing `test-health-state-derivation.js`, `test-health-escalation-email.js`, `test-health-trend-jsonl.js` all stay green
5. `npm run test:safe` ≥ 254/254.
6. End-to-end smoke: `node scripts/run-health-check.js portfolio/etf` returns the same verdict as today (`healthy`) and shows `secondPass: { attempted: [], … }` because no attention state.

## Actionable checklist

- [ ] Create `src/reporting/healthFixers.js` with whitelist + dispatcher
- [ ] Add per-blocker-code 24h rate-limit (re-use the same pattern used for email)
- [ ] Wire `runSecondPassFixers` into `runHealthCheck` only when state is attention/critical
- [ ] Recompute `report.health` after pass-2
- [ ] Update `buildEscalationEmail` to render pass-2 attempts ("What bb8 tried" now lists both passes)
- [ ] Write unit tests
- [ ] Write integration test
- [ ] Run safe lane, ensure 254/254
- [ ] Commit + push

## Out of scope

- Changing what pass-1 does
- Auto-fixing approval lifecycle, basket state, broker connectivity beyond a re-poll
- Adding new self-heal recipes (those have their own infrastructure in `selfHeal.js`)
