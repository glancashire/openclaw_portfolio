# Phase 74: Open-runner operator runbook alignment plan

## Goal
Align the operator runbook and adjacent workflow docs with the newly emitted runtime-event evidence so future operators know exactly where to confirm first-handoff vs retry actions.

## Scope
- update maintained docs to reference runtime-event evidence for queue/requeue actions
- keep wording short and operational
- verify command/reporting/doc-adjacent surfaces stay green

## Non-goals
- new behavior changes
- scheduler work
- historical event migration

## Implementation steps
1. Audit operator-facing docs for queue/requeue evidence references.
2. Add concise runtime-event verification guidance.
3. Re-run targeted command/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-market-open-queue-command.js`
- `node scripts/test-market-open-requeue-command.js`
- `node scripts/test-structured-summary-artifacts.js`

## Risks / watchouts
- Keep docs concise and avoid duplicating every status surface.
