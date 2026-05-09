# Phase 80: Open-runner overview status surface plan

## Goal
Expose first-handoff and retry counts in the lightweight overview JSON/index surface so downstream consumers do not need to parse the rendered markdown table to understand queue posture.

## Scope
- thread open-runner queue counts into the overview index artifact
- keep wording and data model additive
- verify direct and generated overview checks

## Non-goals
- new queue semantics
- dashboard/summary redesign
- broker behavior changes

## Implementation steps
1. Inspect current overview index artifact shape and generation path.
2. Add explicit open-runner queue/retry fields where missing in the overview index output.
3. Extend focused tests to assert those fields.
4. Re-run targeted overview/reporting checks.
5. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-structured-summary-artifacts.js`
- `node scripts/test-dashboard-command-center.js`

## Risks / watchouts
- Keep the artifact change additive so existing consumers continue to work.
