# Phase 78: Open-runner overview docs plan

## Goal
Align the operator-facing docs with the new cross-portfolio overview visibility so future operators know where first-handoff vs retry counts appear across CLI, summary, dashboard, and overview surfaces.

## Scope
- update maintained docs only
- keep wording short and operational
- verify overview/status/reporting checks remain green

## Non-goals
- new behavior changes
- broker execution changes
- extra reporting surfaces beyond maintained docs

## Implementation steps
1. Audit maintained docs for overview-surface references.
2. Add concise guidance for overview board first-handoff vs retry columns.
3. Re-run targeted overview/status/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-trade-status-open-runner-visibility.js`
- `node scripts/test-structured-summary-artifacts.js`

## Risks / watchouts
- Keep docs concise and avoid repeating the same explanation verbatim across every file.
