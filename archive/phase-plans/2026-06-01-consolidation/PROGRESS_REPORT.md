# Portfolio Manager Progress Report

Last updated: 2026-05-28 UTC

## 2026-05-28 — dashboard cash visibility fix

- Fixed cash display bug: three parsers were reading obsolete `Cash CHF:` label instead of `Broker account cash CHF:`. Cash now correctly shows CHF 7,153.88 in dashboard/reports.
- Added `scripts/show-dashboard.js` for compact console portfolio view.
- All dashboard tests pass. Committed `b489a8e` and pushed.

## 2026-05-27 — 10-wave closeout sprint

- Executed 10 autonomous waves (W1–W10) closing all Roll-up items (B through F) and Spec §1 live-execution partial items.
- Key deliverables: doc archive, cron policy consolidation, health trend synthesis, runtime hash-gating (18 write paths), broker-only cancel, native contract intelligence + ISIN resolution, portfolio health model + self-heal, approval UX grouping, recovery playbooks, lane-aware test runner (283 tests).
- Also: replaced Japan ETF (LU1781541252), fixed 4 quarantined tests, added email dedup guard, fixed duplicate email delivery.

## 2026-05-26 — Phases A–H + stabilization closeout

- Phases A through H all committed and pushed: live-order guard, rebalance analyzer, daily monitoring digest with AI assessment, code-level approval gate (safe-word + PIN), approve-and-execute wrapper, retired email-reply approval lane, cron TTL cache, OpenClaw CLI as model provider.
- S1–S5 stabilization all marked done. System entered soak posture.
- ETF basket Tuesday cron aborted twice due to market-data gaps (SIX L1 subscription + probe path bug).

## 2026-05-25 — bug-fix lane and stabilization sweep

- Closed two correctness bugs uncovered during live execution diagnostics: cross-client open-order visibility (resync used `reqOpenOrders` instead of `reqAllOpenOrders`, so GTC orders placed via TWS UI under a different clientId were misreported as `not_found`); and exchange holiday detection (market-calendar parser mishandled IBKR's canonical `YYYYMMDD:HHMM-YYYYMMDD:HHMM` format and lacked semantic `todayStatus`/`holidays` fields, so Whit Monday 2026-05-25 looked like a normal trading day).
- New regression coverage: `test-resync-classifies-cross-client-presubmitted.js`, `test-market-calendar-holidays.js` (19 assertions), `test-market-calendar-artifact-has-holiday-fields.js`.
- Fixed pre-existing failure in `test-market-calendar-readiness.js` (wrong artifact filename reference).
- Started stabilization phases S1-S5 (see `stabilization-master-plan-2026-05-25.md`) to reach an unattended-soak state where the system can gather usage evidence for a week or more.

This report is the short operational summary of where the repository stands now.
For the structured spec mapping, use `SPEC_PROGRESS.md`.
For the active backlog, use `ROLLUP_OUTSTANDING_PLAN.md`.

## Executive summary

The repository is no longer best described as an early MVP nearing closure. It already contains a fairly broad, safety-conscious portfolio-management and operator-reporting system centered on:
- Markdown-controlled portfolio state
- Interactive Brokers integration with native-gateway-first posture
- guarded proposal / approval / queue / submit / reconcile trade workflow
- structured summary and overview artifacts
- investor-facing portfolio, fill, and health reporting
- health / observability / self-heal operator surfaces
- strong repo-level regression coverage

Recent work materially expanded the user-facing product surface with:
- investor-friendly report redesigns
- report-specific sibling JSON persistence for dated reports
- health-report simplification and synthesis
- artifact hygiene / stabilization work
- market-calendar core persistence work for approved instruments

## What is implemented now

### Trading and broker operations
- canonical `trade.js` command surface
- live-readiness, execution-authority, effective-config, and delivery-posture diagnostics
- approved-row queue/open-runner lifecycle
- reconcile/cancel/history/status surfaces
- native IBKR connectivity and holdings/pricing support

### Reporting and communication
- weekly/monthly/quarterly report generation
- structured summary JSON and runtime overview artifacts
- investor-facing portfolio summary emails
- investor-facing fill/purchase notifications
- health report generation and optional email delivery
- dashboard digest email path

### Operator guidance and observability
- operator runbooks
- observability and transmitted-live docs
- runtime event evidence and overview boards
- health/self-heal guidance

## Current top open work

The highest-signal open work is now mostly operational rather than unfinished core engineering:
1. decide whether any bounded self-heal actions should be promoted beyond guidance
2. email-reply approval infrastructure was later removed from the live repo; no further action is needed on that lane
3. keep native IBKR login/2FA readiness healthy
4. embed the open-phases dashboard card directly in the real Control UI only if the editable app source becomes available

That work is being tracked in `ROLLUP_OUTSTANDING_PLAN.md` and the `phase-166*` plan series.

## Risks / caveats still worth keeping in view

- Native IBKR still depends on periodic human login / 2FA; zero-touch permanence is not realistic.
- Delivery posture on this host has known caveats for cron-announced output.
- Generated runtime artifacts can create noisy churn if not cleaned before implementation commits.
- Historical roadmap documents still exist and are useful for audit history, but many older “closure” summaries are stale if read as present-tense truth.

## Recommended truth sources

Use these in order:
1. code + scripts
2. `SPEC_PROGRESS.md`
3. `ROLLUP_OUTSTANDING_PLAN.md`
4. operator docs in `docs/`
5. historical `phase-*-plan.md` files only for audit/history
