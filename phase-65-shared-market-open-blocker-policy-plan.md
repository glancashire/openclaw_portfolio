# Phase 65: Shared market-open blocker policy plan

## Goal
Move market-open quote/trend/limit blocker decisions out of `scripts/submit-orders-at-open.js` into a shared execution-policy helper so blocking semantics, audit reasons, and requeue expectations stay consistent across execution surfaces.

## Scope
- extract reusable blocker-policy helper(s) from `scripts/submit-orders-at-open.js`
- keep existing market-open behavior unchanged from an operator perspective
- preserve blocker codes, audit reasons, and trend guard semantics
- add focused tests for shared policy behavior

## Non-goals
- changing broker readiness gates
- adding new blocker types beyond the current quote/trend/limit cases
- introducing a scheduler

## Implementation steps
1. Identify the narrowest policy seam in the existing market-open script.
2. Extract quote/trend/limit blocker decisions into a shared execution helper.
3. Refactor the market-open script to consume the shared helper.
4. Add focused tests for shared blocker-policy behavior and keep current script-level behavior green.
5. Re-run targeted execution, trend-guard, and dry-run command checks.

## Verification
- `node scripts/test-market-open-trend-guard.js`
- `node scripts/test-shared-quote-path-fallback.js`
- `node scripts/trade.js submit --dry-run`
- `node tests/test-portfolioExecution.js`

## Risks / watchouts
- Do not silently change blocker codes or next-action text.
- Keep the market-open script readable after extraction.
- Avoid duplicating policy logic between the shared helper and script.
