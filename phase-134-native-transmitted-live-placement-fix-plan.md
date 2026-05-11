# Phase 134 — Native Transmitted-Live Placement Fix

## Goal
Make the actual transmitted-live submission path work with the recovered native IBKR client, so approved executable ETF rows can be placed live without falling into the obsolete revocable/skill-only lane.

## Problem statement
Live submission currently fails after successful quote acquisition and smart-limit construction with:
`Revocable non-transmitted live submission scaffold is only available via the skill-backed client right now.`

This indicates the final placement call still uses an option mix (`revocableOnly: true` with transmitted live) that routes into an incompatible legacy path for the native client.

## Constraints
- Preserve transmitted-live safety semantics.
- Do not silently weaken approval/preflight/arming gates.
- Do not submit live orders during testing unless the user has already explicitly approved live submission for the current batch.
- Keep dry-run and staged-path guardrails intact unless deliberately refined.

## Actionable checklist
- [ ] Trace the native IBKR `placeOrder` option handling and identify the exact incompatible guard.
- [ ] Patch the transmitted-live path so native placement accepts the intended safe option combination.
- [ ] Add/update regression coverage for native transmitted-live placement acceptance and guard behavior.
- [ ] Verify with focused tests.
- [ ] Re-run canonical submission path in dry-run and live-safe proof mode as appropriate.
- [ ] Commit and push.
