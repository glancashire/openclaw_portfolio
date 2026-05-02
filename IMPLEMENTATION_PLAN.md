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

## Current repository capabilities

### Workflow and validation
- Validate portfolio Markdown structure and required sections
- Validate strategy coherence and activation blockers
- Detect draft-state gaps and suggest next onboarding questions
- Apply structured onboarding answers into `portfolio.md`
- Check generated holdings/history/dashboard state consistency
- Check safety controls before treating output as execution-ready

### Analysis and reporting
- Analyze allocation drift from current holdings
- Propose dry-run trades from underweight allocations and available cash
- Propose instrument-level dry-run trades from approved instruments
- Write trade proposals into append-only trade logs with latest-plan supersession support
- Regenerate dashboards from current portfolio state
- Append history snapshots
- Run weekly/monthly/quarterly report cycles and emit Markdown + PDF outputs

### Broker scaffolding
- Interactive Brokers adapter/auth/read-only test scaffolding
- Interactive Brokers holdings sync with ledger-aware CHF cash extraction
- Normalized broker-backed order quote, dry-run preview, open-order status lookup, and cancel-path scaffolding
- Safe config checks for broker secrets presence without exposing them

## Next phases

### Phase 16 — ETF suggestion workflow hardening
Implement a proper shortlist workflow that:
- derives missing exposures from `portfolio.md`
- scores candidate ETFs against CHF-first / availability / simplicity constraints
- produces approval-ready rationale and trade-offs
- writes approved selections back into `Approved Instruments`

Status: partially complete — shortlist generation and ranking now exist via `scripts/suggest-etf-shortlist.js`; automatic write-back to `Approved Instruments` still remains intentionally manual/approval-gated.

### Phase 18 — Dry-run order generation refinement
Improve order-prep logic so it:
- converts asset-class proposals into instrument-level draft orders
- uses broker-aware pricing/quotes when available
- handles residual cash and minimum-trade-size constraints explicitly
- keeps all execution paths confirmation-gated by default

Current state:
- instrument-level proposal sizing is working for the ETF portfolio
- Interactive Brokers-backed pricing is now being used for EMUAA and UBSSLI in the current dry-run proposal set
- the current plan still leaves residual tradable cash after whole-share sizing and keeps the defensive CHF cash sleeve explicit
- the latest dry-run proposal era now supersedes equivalent older pending proposal rows so the current plan is cleaner to review

### Phase 19 — Read-only broker connectivity hardening and execution-surface completion
Advance broker integration by:
- keeping the native TWS / IB Gateway socket API path as the primary transport
- hardening Interactive Brokers holdings/account normalization and quote retrieval
- making contract lookup and latest-price retrieval durable across the approved ETF universe
- implementing the remaining order-surface depth needed for quote, submit, status, and cancel flows while preserving read-only/dry-run safety by default
- keeping dry-run/live gating explicit and testable

Current state:
- native client code exists and the readiness check is green again
- live read-only holdings sync succeeds for account `U25624150`
- the ETF portfolio is active, but execution remains `require_confirmation` and broker use remains read-only
- normalized order quote, dry-run preview, open-order status lookup, and cancel-path scaffolding now exist at the repo broker-client layer
- safe MVP state is now live-read-only + dry-run proposals, not simulated holdings

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

## Guardrails

- No secrets in Markdown.
- No live trading shortcuts.
- Keep ETF-only / CHF-first MVP scope.
- Unknown holdings or unresolved strategy details should block activation and trading.
- Broker connectivity remains read-only/dry-run until explicitly validated and enabled.
- Keep broker scope focused on Interactive Brokers only for the current MVP.
