# Phase 100: Pending-actions artifact contract plan

## Goal
Strengthen the generated `runtime/overview/pending-actions.json` contract by explicitly asserting its top-level identity metadata and stable queue-summary shape so operators can rely on it as a first-class overview artifact.

## Scope
- inspect current pending-actions artifact coverage
- add focused generated-artifact checks for top-level metadata and queue-summary typing
- keep behavior unchanged

## Non-goals
- schema redesign
- queue semantics changes
- new reporting behavior
- broker/runtime changes

## Implementation steps
1. Inspect current pending-actions artifact assertions.
2. Add focused checks for `schemaVersion`, `generatedAt`, `itemCount`, `items`, and stable queue-summary counters/types.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`
- `node scripts/test-structured-summary-artifacts.js`

## Risks / watchouts
- Assert stable identity/type fields without overfitting to volatile live queue counts.
