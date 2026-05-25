# Phase 63: Broker quote path unification plan

## Goal
Unify market-open execution pricing with the shared Interactive Brokers quote path so delayed fallback behavior, pricing semantics, and broker quote interpretation stay consistent across dry-run sizing and open-market submission.

## Scope
- remove ad-hoc quote interpretation from `scripts/submit-orders-at-open.js`
- use shared broker-backed quote path or shared quote-normalization helpers
- focused tests for quote fallback and market-open pricing behavior
- keep live-submission safety unchanged

## Non-goals
- changing approval/transmitted-live policy
- broad broker adapter redesign
- changing scheduler behavior

## Implementation steps
1. Identify the narrowest shared quote helper/path already used elsewhere.
2. Refactor market-open submission to use the shared quote contract.
3. Preserve trend-guard and audit behavior while replacing the pricing source.
4. Add or update focused tests for delayed fallback and limit derivation.
5. Re-run the market-open command-surface and quote-path tests.

## Verification
- `node scripts/test-market-open-trend-guard.js`
- `node scripts/test-market-open-queue-command.js`
- `node scripts/trade.js submit --dry-run`
- `node tests/test-ibkr-readiness.js`

## Risks / watchouts
- Do not regress delayed-close fallback.
- Do not break trend/audit handling added in earlier phases.
- Keep the open-market script readable after refactor.
