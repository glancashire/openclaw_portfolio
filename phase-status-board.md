# Phase Status Board

_Filtered to exclude fully completed phases._

## Kanban

### Started

#### Phase 167 — Fill-delivery observability and state-surface unification
- Status: ready for commit/push closeout
- Plan commit: `3adad81`
- Notes:
  - Duplicate fill-notification state readers have been consolidated onto `src/reporting/fillNotificationState`
  - CLI/status surfaces now expose acknowledged backfilled fills explicitly
  - Focused tests and real status-surface verification are complete

Checklist:
- [x] Write phase plan
- [x] Write actionable checklist
- [x] Commit plan
- [x] Begin implementation
- [x] Migrate `src/execution/portfolioHealth.js` to canonical fill state helper
- [x] Migrate `src/execution/liveReconciliation.js` to canonical fill state helper
- [x] Replace remaining duplicate fill-notification state readers with the canonical helper
- [x] Extend CLI/status surfaces to show acknowledged backfilled fills explicitly
- [x] Add focused tests for unified state reporting
- [x] Re-run delivery/health/dashboard regressions until green
- [x] Run one real status surface command for evidence
- [ ] Commit implementation
- [ ] Push implementation
- [ ] Send completion overview

### Open

#### Phase 170 — Health-monitoring cron scheduling and operational guardrails
- Status: ready for commit/push closeout
- Plan commit: `f0bc987`
- Implementation commit: `d0ebcf8`
- Notes:
  - Health-monitoring cron helper and status/check surface exist in the repo
  - Live cron registration was repaired to avoid announce-routing drift
  - Direct health-check execution with email delivery succeeded
  - Current host still blocks isolated cron agent runs under Docker-backed sandbox defaults; see `phase-170-closeout-notes.md`

Checklist:
- [x] Write phase plan
- [x] Write actionable checklist
- [x] Commit plan
- [x] Design schedule/frequency and timezone behavior
- [x] Add durable cron registration/update flow for health checks
- [x] Add non-overlap / operational guardrails where needed
- [x] Ensure unresolved issues remain highlighted in the email report
- [x] Add focused tests for scheduling/config behavior
- [x] Run live scheduled-equivalent verification
- [x] Record isolated-cron sandbox host constraint in phase closeout
- [ ] Commit implementation
- [ ] Push implementation
- [ ] Send completion overview

## Compact table

| Phase | Theme | Status | Done | In progress | Open |
|---|---|---|---:|---:|---:|
| 167 | Fill-delivery observability + state unification | ready for closeout | 11 | 0 | 3 |
| 170 | Health-monitoring cron + guardrails | ready for closeout | 10 | 0 | 3 |
