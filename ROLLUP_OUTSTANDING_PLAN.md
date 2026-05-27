# Roll-up Outstanding Plan

This is the maintained backlog for work that is still relevant now.
It replaces the need to infer “what remains” from dozens of older historical phase plans.
Historical `phase-*-plan.md` files remain useful as audit/history artifacts, but this file is the current roll-up.

## How to use this file
- Treat checked items as materially complete at the repo level.
- Treat unchecked items as still-open implementation/documentation/verification work.
- When a new active lane begins, add it here rather than reviving stale closure docs.

---

## A. Market-calendar intelligence and readiness integration

### Objective
Teach the system when the relevant exchanges for persisted/approved instruments are open, persist that knowledge, and use it conservatively in readiness/reporting/automation.

### Status summary
- [x] Shared market-calendar helper model
- [x] Persisted market-calendar artifact/store
- [x] IBKR contract-hours sync module and script path
- [x] Graceful degraded handling for missing identity / broker unavailable cases across the whole sync path
- [x] Readiness integration that consumes the persisted calendar artifact
- [x] Reporting/diagnostic surfacing of market-calendar coverage/state
- [x] Cron refresh automation and operator guidance
- [x] Full closeout verification and documentation refresh for the calendar lane (2026-05-25; market-calendar parser handled IBKR canonical format, semantic `todayStatus` + `holidays` fields added, regression coverage extended)

### Key files / lanes
- `src/execution/marketCalendar.js`
- `src/execution/marketCalendarStore.js`
- `src/execution/marketCalendarSync.js`
- `src/execution/executionDiagnostics.js`
- `src/execution/liveReadinessPreflight.js`
- `src/brokers/interactive-brokers/*`
- `phase-166-ibkr-trading-calendar-sync-plan.md`
- `phase-166a-market-calendar-core-model-and-persistence-plan.md`
- `phase-166b-ibkr-market-calendar-sync-plan.md`

---

## B. Documentation truth maintenance and roadmap hygiene

### Objective
Keep the repository’s main docs/spec/progress surfaces aligned with the implemented system and stop using stale closure docs as the present-tense status source.

### Status summary
- [x] Reconcile core progress/plan docs with the implemented product surface
- [x] Add a maintained roll-up backlog document
- [ ] Refresh broader docs where feature wording still trails the investor-reporting / health / delivery / calendar reality
- [ ] Decide whether to archive or annotate especially misleading historical top-level roadmap files
- [ ] Add/extend doc-contract checks if a newly-canonical doc must remain present

### Primary files
- `SPEC_PROGRESS.md`
- `IMPLEMENTATION_PLAN.md`
- `PROGRESS_REPORT.md`
- `ROLLUP_OUTSTANDING_PLAN.md`
- `docs/*`

---

## C. Delivery and cron hardening

### Objective
Make scheduled reporting and health flows calmer and more reliable on this host, especially around cron delivery caveats and operator visibility.

### Status summary
- [x] Portfolio summary email delivery path
- [x] Dashboard digest email surface
- [x] Health-report email surface
- [x] Best-effort cron guidance captured in local notes
- [ ] Consolidate the cron/reporting operational truth into canonical operator docs
- [ ] Improve host-specific delivery caveat visibility in generated/operator-facing surfaces where helpful
- [ ] Verify remaining scheduled jobs align with the current operational policy

---

## D. Health / self-heal maturity

### Objective
Continue the bounded-health model without turning it into unsafe or opaque automation.

### Status summary
- [x] Health classification/reporting surface
- [x] Bounded self-heal guidance surface
- [x] Investor-facing health-report simplification
- [ ] Further tighten health trend synthesis and escalation messaging if real usage shows confusion
- [ ] Decide whether any safe auto-remediation steps should move from guidance to explicit operator-approved automation

---

## E. Runtime/generated artifact hygiene

### Objective
Keep the repo calm after verification runs and reduce accidental commits of unrelated generated churn.

### Status summary
- [x] Working guidance for restoring unrelated runtime/generated churn before commits
- [x] Conditional/stable artifact writing in many reporting paths
- [ ] Continue reducing avoidable runtime churn in remaining noisy paths
- [ ] Document the current “owned artifacts vs ephemeral churn” policy in the best operator/developer-facing location if current notes prove insufficient

---

## F. Historical cleanup policy

### Objective
Tidy obsolete/completed work without destroying audit history.

### Recommended policy
- Keep historical phase files.
- Stop treating old phase summaries as canonical current status.
- Prefer annotation/consolidation over mass deletion.
- Only remove obsolete files when they are clearly redundant and no longer helpful for traceability.

### Open checklist
- [ ] Identify any top-level roadmap/checklist files that should be clearly marked historical or superseded
- [ ] Decide whether to add a short archive note to especially misleading historical summaries

---

## Current recommended execution order
1. Stabilization phases S1-S5 (see `stabilization-master-plan-2026-05-25.md`) — repo truth & test gates, carry-over bug closeout, cron/delivery hardening, runtime/doc hygiene, soak prep.
   - [x] S1 — repo truth & test gates (commit `62f32fc`)
   - [x] S2 — carry-over bug closeout (commit `3e3b11c`)
   - [x] S3 — cron + delivery hardening (commit `590e204`)
   - [x] S4 — runtime + doc hygiene (commit `b242bd0`; root .md count = 22, target was <30)
   - [x] S5 — soak prep (commit `bd4620e`; soak-readiness doc + baseline + 2026-05-30 self-check cron live, idle)
2. Revisit doc and artifact hygiene follow-ups only where real usage still shows friction.
3. Post-soak Phases A–H (2026-05-26): live-order guard, rebalance analyzer, daily monitoring digest, code-level approval gate (safe-word + PIN), approve-and-execute wrapper, Mailgun inbound webhook handler (code-only, infra pending), cron-jobs TTL cache, OpenClaw CLI as default model provider — all committed.
2. Revisit doc and artifact hygiene follow-ups only where real usage still shows friction.
