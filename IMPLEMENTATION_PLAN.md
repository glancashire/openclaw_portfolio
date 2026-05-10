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
21. Typed execution history snapshots, dashboard execution lifecycle visibility, bundled execution verification, safe demo execution flow, and fail-closed pre-trade safety hardening for unresolved questions / stale data / excluded-instrument conflicts

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

## Final closure status

### Phase 23 — end-to-end acceptance closure
Completed by:
- running an end-to-end acceptance sweep across portfolio creation, guided intake, ETF shortlist/approval gating, dry-run proposals, safety controls, dashboard/report refresh, and execution verification surfaces
- fixing the remaining integration regression where optional Playwright/browser-session code could crash non-browser dry-run proposal paths during module load
- tightening final documentation/status artifacts so repo closure reflects the implemented read-only + dry-run MVP accurately

Closure evidence:
- `node scripts/create-portfolio.js acceptance-closure`
- `node scripts/validate-portfolio.js portfolio/acceptance-closure/portfolio.md`
- `node scripts/check-portfolio-activation.js portfolio/acceptance-closure/portfolio.md`
- `node scripts/next-portfolio-questions.js portfolio/acceptance-closure/portfolio.md`
- `node scripts/suggest-etf-shortlist.js portfolio/etf/portfolio.md markdown`
- `node scripts/propose-instrument-trades.js portfolio/etf/portfolio.md portfolio/etf/holdings.md`
- `node scripts/check-safety-controls.js portfolio/etf`
- `node scripts/check-generated-state.js portfolio/etf`
- `node scripts/run-report-cycle.js portfolio/etf weekly 20260506`
- `node scripts/test-optional-playwright-fallback.js`
- `npm run verify:execution`

Acceptance-closed MVP state:
- portfolio creation, draft blocking, and guided intake are working end-to-end for Markdown-controlled ETF portfolios
- ETF shortlist generation and approval-gated instrument workflow are working end-to-end within the CHF-first / ETF-only scope
- dry-run proposal generation, rebalancing policy enforcement, and execution-surface verification are working end-to-end
- dashboard/history/report refresh paths are working end-to-end for the read-only reporting workflow
- IBKR browser-session helpers now degrade safely when optional Playwright is unavailable instead of breaking non-browser dry-run paths

Intentional remaining limit:
- the repo remains intentionally not live-writable-complete; Interactive Brokers execution is still confirmation-gated and read-only/dry-run first, so true transmitted live submission remains outside this closure milestone until explicitly enabled and hardened

## Post-MVP roadmap status

The accepted MVP is closed, and the explicitly tracked post-MVP roadmap phases in `post-mvp-roadmap.md` are also complete:

24. Transmitted live execution hardening
25. Operator runbooks and incident handling
26. Production reporting and delivery polish
27. Risk, logging, and observability hardening

Those phases extended the guarded execution path and operational maturity without redefining what was accepted in the read-only + dry-run MVP closure.

Later repo hardening continued beyond that roadmap through additional focused phases covering readiness truth, execution authority, effective config, delivery posture, operator verification, and documentation alignment.

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

## Remaining real limits

- Real transmitted live execution remains intentionally guarded and environment-dependent.
- The actual ETF environment is not automatically live-ready just because roadmap phases are complete; readiness still depends on execution mode, broker health, approvals, and explicit arming.
- Further work from here should be defined as a new roadmap expansion, not inferred from already-closed phase lists.

## Guardrails

- No secrets in Markdown.
- No live trading shortcuts.
- Keep ETF-only / CHF-first MVP scope.
- Unknown holdings or unresolved strategy details should block activation and trading.
- Broker connectivity remains read-only/dry-run until explicitly validated and enabled.
- Keep broker scope focused on Interactive Brokers only for the current MVP.
