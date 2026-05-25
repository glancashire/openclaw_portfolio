# Phase 159 — Actionable checklist

## 159A — stale approval refresh surface
- [x] Add shared stale-approval inventory helper surface
- [x] Add `trade refresh-stale-approvals` CLI command
- [x] Return exact safe next-step guidance without mutating trade rows
- [x] Add focused regression coverage

## 159B — grouped approval queue posture
- [x] Split approval queue reporting into fresh-actionable vs stale-needs-reapproval groups
- [x] Expose grouped counts in summary / overview artifacts
- [x] Update operator-facing explanation text
- [x] Add focused regression coverage

## 159C — operator clarity
- [x] Explain why excluded or stale rows are blocked
- [x] Surface recommended refresh / regenerate / reapprove path in CLI and reporting
- [x] Update CLI/reporting contract tests

## Verification gate
- [x] New focused tests pass
- [x] Updated CLI/reporting tests pass
- [x] `npm run verify` passes
