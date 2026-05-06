# Portfolio Manager Implementation Plan

## Current completed phases

1. Repo scaffolding
2. Template portfolio files
3. Markdown parser/generator foundation
4. Portfolio-folder contract validation
5. Draft bootstrap helper for portfolio creation from structured input
6. Strategy validation for status, execution modes, allocations, placeholders, and broker/base-currency constraints
7. Interactive draft workflow helpers for applying answers and asking next questions
8. Dry-run Interactive Brokers adapter/auth/holdings scaffolding
9. Holdings sync simulation plus generated-state checks
10. Dashboard regeneration
11. Trade proposal and trade-log writing helpers
12. History snapshot writing
13. Weekly/monthly/quarterly Markdown report generation with PDF placeholder export
14. Safety-control checks for draft/live-readiness review
15. Interactive Brokers-only repo narrowing and holdings-sync decoupling from the removed IG path
16. Native Interactive Brokers read-only connectivity, live holdings sync, and live-priced dry-run proposal refresh for the ETF portfolio
17. ETF portfolio moved from draft to active while remaining confirmation-gated and read-only
18. Portfolio-aware execution gating and staged-order scaffolding
19. Trade lifecycle reconciliation into Markdown state (`approved/submitted/partially_filled/filled/cancelled/failed`)
20. Post-fill holdings refresh hook, broker error pause state, and completed-order status fallback
21. Typed execution history snapshots, dashboard execution lifecycle visibility, bundled execution verification, and safe demo execution flow

## Current repository capabilities

### Workflow and validation
- Validate portfolio Markdown structure and required sections
- Validate strategy coherence and activation blockers
- Detect draft-state gaps and suggest next onboarding questions
- Apply structured onboarding answers into `portfolio.md`
- Check generated holdings/history/dashboard state consistency
- Check safety controls before treating output as execution-ready
- Run bundled execution-surface verification via `npm run verify:execution`

### Analysis, execution state, and reporting
- Analyze allocation drift from current holdings
- Propose dry-run trades from underweight allocations and available cash
- Propose instrument-level dry-run trades from approved instruments
- Write trade proposals into append-only trade logs with latest-plan supersession support
- Approve trades and reconcile broker status transitions back into `trades.md`
- Regenerate dashboards from current portfolio state, including execution lifecycle summary
- Append typed history snapshots for execution events
- Run weekly/monthly/quarterly report cycles and emit Markdown + PDF outputs
- Demonstrate a safe disposable execution lifecycle with `scripts/demo-portfolio-execution-flow.js`

### Broker scaffolding
- Interactive Brokers adapter/auth/read-only test scaffolding
- Interactive Brokers holdings sync with ledger-aware CHF cash extraction
- Normalized broker-backed order quote, dry-run preview, open-order status lookup, execution-fill fallback, completed-order lookup, and cancel-path scaffolding
- Safe config checks for broker secrets presence without exposing them

## Next phases

### Phase 22 — execution-aware reporting polish
Improve report/dashboard presentation so it:
- distinguishes proposals from approved/submitted/in-flight states more clearly
- reflects execution lifecycle counts and current operational posture
- highlights failed/in-flight rows without obscuring strategy-level review

Current state:
- dashboard execution lifecycle summary now exists
- reports still need richer execution-state surfacing
- proposal-vs-approved separation can still improve in some views

### Phase 23 — writable execution enablement preparation
Advance broker integration by:
- keeping the native TWS / IB Gateway socket API path as the primary transport
- preparing a true writable `placeOrder` path behind strict explicit safety gates
- hardening live `cancelOrder` and real broker reconciliation behavior
- ensuring unresolved draft/onboarding holes block any write path cleanly
- keeping dry-run/live gating explicit and testable

Current reconciliation state:
- staged -> submitted -> partially_filled / filled / cancelled / not_found paths are now verified in automated tests
- resync keeps only latest actionable broker-order rows
- cancel failures now increment runtime broker error state and successful cancel clears that state
- execution status changes append typed history snapshots and regenerate dashboard state

Current state:
- native client code exists and the readiness check is green again for read-only use
- live read-only holdings sync succeeds for account `U25624150`
- the ETF portfolio is active, but execution remains `require_confirmation` and broker use remains read-only
- normalized order quote, dry-run preview, open-order status lookup, execution-fill fallback, completed-order lookup, cancel scaffolding, and Markdown reconciliation now exist at the repo layer
- safe MVP state is now live-read-only + dry-run/reconciled execution planning, not simulated holdings

## Current command surface

- `node scripts/validate-portfolio.js <portfolio.md> [...portfolio.md]`
- `node scripts/validate-strategy.js <portfolio.md>`
- `node scripts/check-portfolio-activation.js <portfolio.md>`
- `node scripts/check-generated-state.js <portfolio-dir>`
- `node scripts/check-safety-controls.js <portfolio-dir>`
- `node scripts/create-portfolio.js <portfolio-name>`
- `node scripts/bootstrap-portfolio-from-json.js <seed.json>`
- `node scripts/next-portfolio-questions.js <portfolio.md>`
- `node scripts/apply-portfolio-answers.js <portfolio.md> <answers.json>`
- `node scripts/propose-trades.js <portfolio.md> <holdings.md>`
- `node scripts/propose-instrument-trades.js <portfolio.md> <holdings.md>`
- `node scripts/run-report-cycle.js <portfolio-dir> <weekly|monthly|quarterly> [YYYYMMDD]`
- `node scripts/sync-interactive-brokers-holdings.js <portfolio-dir> [accountId]`
- `node scripts/approve-portfolio-trade.js <portfolio-dir> <selector-json>`
- `node scripts/sync-portfolio-order-status.js <portfolio-dir> <order-id> [selector-json]`
- `node scripts/cancel-portfolio-order.js <portfolio-dir> <order-id> [selector-json]`
- `node scripts/demo-portfolio-execution-flow.js`
- `npm run verify:execution`

## Guardrails

- No secrets in Markdown.
- No live trading shortcuts.
- Keep ETF-only / CHF-first MVP scope.
- Unknown holdings or unresolved strategy details should block activation and trading.
- Broker connectivity remains read-only/dry-run until explicitly validated and enabled.
- Keep broker scope focused on Interactive Brokers only for the current MVP.
