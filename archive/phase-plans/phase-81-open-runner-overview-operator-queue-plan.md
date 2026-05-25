# Phase 81: Open-runner overview operator-queue plan

## Goal
Make the cross-portfolio recommended-action section more explicit when open-runner queue and retry items exist, so operators can connect the overview board counts to concrete next actions without digging elsewhere first.

## Scope
- inspect overview recommended-action rendering
- add concise open-runner queue/retry wording where appropriate
- extend focused overview/reporting tests

## Non-goals
- new queue semantics
- changes to trade-state storage
- broad reporting redesign

## Implementation steps
1. Inspect how overview recommended actions are built from pending items.
2. Improve wording for open-runner queue and retry items if the current summary is too generic.
3. Extend focused tests for the new wording.
4. Re-run targeted overview/reporting checks.
5. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`
- `node scripts/test-structured-summary-artifacts.js`

## Risks / watchouts
- Keep wording concise and avoid duplicating the full summary/risk explanation already present elsewhere.
