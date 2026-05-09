# Phase 58: Delayed market-data readiness and fallback alignment plan

## Goal
Make Interactive Brokers readiness/reporting distinguish delayed-only pricing from full live/realtime readiness, while preserving the existing safety rule that degraded broker readiness must still block live submission.

## Scope
- readiness summarization for Interactive Brokers
- execution-policy interpretation of degraded broker readiness
- focused tests for delayed-only readiness
- concise operator docs for delayed fallback visibility

## Non-goals
- relaxing live-trade approval or transmitted-live safety gates
- changing portfolio strategy or ETF-only scope
- broad broker adapter refactors beyond readiness/fallback reporting

## Implementation steps
1. Extend IBKR readiness summarization to surface a delayed-only posture explicitly.
2. Keep delayed-only posture marked as fallback-required rather than fully ready.
3. Update execution policy so fallback-required broker state blocks live submission even when auth is technically connected.
4. Add focused tests for readiness summarization and delayed-only execution blocking.
5. Update concise operator docs so delayed-only readiness is visible during checks and dry-runs.
6. Re-run readiness and targeted command-surface checks before handoff.

## Verification
- `node tests/test-ibkr-readiness.js`
- `node tests/test-portfolioExecution.js`
- `node scripts/check-interactive-brokers-readiness.js`
- `node scripts/trade.js submit --dry-run`

## Risks / watchouts
- Do not let delayed-only pricing be mistaken for fully ready broker state.
- Do not regress dry-run pricing fallback behavior.
- Keep messaging concise so operators can tell whether they have pricing fallback versus live submission readiness.
