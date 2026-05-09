# Phase 59: Market-open trend and audit hardening plan

## Goal
Harden the market-open submission path so approved trades are price-checked before submission, buy-side extreme daily moves are screened, and skipped orders leave explicit audit evidence in trade/runtime state.

## Scope
- `scripts/submit-orders-at-open.js` price/trend pre-submit checks
- explicit skip/block handling for trend-based buy suppression
- focused tests for trend guard behavior
- runtime/trade-state audit evidence for skipped submissions

## Non-goals
- changing approval requirements or transmitted-live safety gates
- changing portfolio strategy thresholds beyond the existing market-entry intent
- redesigning the entire execution engine

## Implementation steps
1. Add explicit quote-trend analysis to market-open submission.
2. Enforce a buy-side extreme daily move guard before order placement.
3. Record skipped-for-trend decisions into trade/runtime evidence.
4. Add focused test coverage for trend guard behavior and delayed-close limit fallback.
5. Re-run market-open command-surface checks and adjacent execution tests.

## Verification
- `node scripts/test-market-open-trend-guard.js`
- `node scripts/test-market-open-trade-row-selection.js`
- `node scripts/trade.js submit --dry-run`
- `node tests/test-portfolioExecution.js`

## Risks / watchouts
- Do not let trend gating silently drop trades without evidence.
- Do not break the existing executable-row selection path.
- Keep buy-only guard behavior explicit so sells are not accidentally blocked.
