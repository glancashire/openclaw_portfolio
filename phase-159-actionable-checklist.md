# Phase 159 — Actionable checklist

## 159A — stale approval refresh surface
- [ ] Add shared stale-approval inventory helper surface
- [ ] Add `trade refresh-stale-approvals` CLI command
- [ ] Return exact safe next-step guidance without mutating trade rows
- [ ] Add focused regression coverage

## 159B — grouped approval queue posture
- [x] Split approval queue reporting into fresh-actionable vs stale-needs-reapproval groups
- [x] Expose grouped counts in summary / overview artifacts
- [x] Update operator-facing explanation text
- [ ] Add focused regression coverage

## 159C — operator clarity
- [x] Explain why excluded or stale rows are blocked
- [ ] Surface recommended refresh / regenerate / reapprove path in CLI and reporting
- [ ] Update CLI/reporting contract tests

## Verification gate
- [ ] New focused tests pass
- [ ] Updated CLI/reporting tests pass
- [ ] `npm run verify` passes
