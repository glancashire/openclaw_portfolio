# Phase 158 — Actionable checklist

## 158A — canonical portfolio health model
- [ ] Create a shared execution-health classifier
- [ ] Fold in broker readiness, stale approvals, retry queue, fill-backfill backlog, and broker-error pause state
- [ ] Emit canonical health states and recommended next-step text
- [ ] Add focused regression coverage

## 158B — bounded self-healing dry-run planner
- [ ] Add a dry-run remediation planner that proposes safe next commands only
- [ ] Ensure the planner never suggests unsafe approval bypasses or live submission shortcuts
- [ ] Add focused regression coverage

## 158C — operator surfaces
- [ ] Add `trade health`
- [ ] Add `trade self-heal --dry-run`
- [ ] Surface health/self-heal in dashboard / summary artifacts
- [ ] Update CLI/reporting contract tests

## Verification gate
- [ ] New focused tests pass
- [ ] Updated reporting / CLI tests pass
- [ ] `npm run verify` passes
