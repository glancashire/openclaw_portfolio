# Phase 96: Overview index schema-version plan

## Goal
Strengthen the generated overview index contract by explicitly asserting the top-level schema/version metadata on `portfolio-index.json`, keeping the artifact identity stable as more row-level checks accumulate.

## Scope
- inspect current top-level index metadata assertions
- add focused checks for `schemaVersion`, `generatedAt`, and `portfolioCount`
- keep behavior unchanged

## Non-goals
- schema redesign
- new overview behavior
- broker/runtime changes

## Implementation steps
1. Inspect the current `portfolio-index.json` metadata assertions.
2. Add focused generated-artifact checks for stable top-level metadata.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Assert stable identity/type fields without overfitting to volatile timestamps.
