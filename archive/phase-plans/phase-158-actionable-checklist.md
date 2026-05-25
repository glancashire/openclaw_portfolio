# Phase 158 — Actionable checklist

## 158A — canonical portfolio health model
- [x] Create a shared execution-health classifier
- [x] Fold in broker readiness, stale approvals, retry queue, fill-backfill backlog, and broker-error pause state
- [x] Emit canonical health states and recommended next-step text
- [x] Add focused regression coverage

## 158B — bounded self-healing dry-run planner
- [x] Add a dry-run remediation planner that proposes safe next commands only
- [x] Ensure the planner never suggests unsafe approval bypasses or live submission shortcuts
- [x] Add focused regression coverage

## 158C — operator surfaces
- [x] Add `trade health`
- [x] Add `trade self-heal --dry-run`
- [x] Surface health/self-heal in dashboard / summary artifacts
- [x] Update CLI/reporting contract tests

## Verification gate
- [x] New focused tests pass
- [x] Updated reporting / CLI tests pass
- [x] `npm run verify` passes
