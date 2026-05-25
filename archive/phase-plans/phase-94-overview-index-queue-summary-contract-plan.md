# Phase 94: Overview index queue-summary contract plan

## Goal
Make the `portfolio-index.json` queue-summary contract more explicit by asserting the presence and numeric type of the key stable summary counters beyond the open-runner fields.

## Scope
- inspect current generated queue-summary assertions
- add focused checks for stable queue-summary fields and types
- keep behavior unchanged

## Non-goals
- queue-summary schema redesign
- new overview behavior
- broker/runtime changes

## Implementation steps
1. Inspect the current `portfolio-index.json` queue-summary assertions.
2. Add focused generated-artifact checks for stable queue-summary counters.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Focus on stable counters and numeric typing rather than volatile real-world values.
