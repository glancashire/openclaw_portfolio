# Specification Progress Map

This file maps the current repository implementation to `SPECIFICATION.md` so progress can be reviewed without reading the whole codebase.

## Summary

- Overall status: strong MVP foundation with portfolio-aware execution safety, typed execution history, bundled execution verification, durable lifecycle reconciliation, fail-closed pre-trade blocking, and fresher dashboard/report orchestration; still intentionally not live-execution-ready.
- Strongest areas: scaffolding, Markdown contracts, validation, reporting, dry-run workflow, Interactive Brokers read-only holdings sync, execution lifecycle reconciliation back into Markdown state, fail-closed execution safety gating, and artifact freshness surfacing.
- Biggest remaining gaps: true writable execution enablement beyond staged/non-transmitted handoff, deeper min/max and risk-limit enforcement before proposal/execution, and report polish rather than missing core scaffolding.
- Scope change applied: the repo targets Interactive Brokers only for the MVP and no longer carries IG-specific implementation paths.

## Progress by specification area

| Spec area | Status | Notes |
|---|---|---|
| 4. Repository / Folder Structure | done | Portfolio, broker, config, runtime, scripts, and `src/` layout are present and aligned with the active IBKR-only MVP path. |
| 6-10. Portfolio Markdown contracts | done | Template + real ETF portfolio files exist and validators cover required structure. Execution reconciliation now writes back into `trades.md`, `history.md`, and `dashboard.md` with richer state semantics. |
| 11. Broker adapter interface | partial | Interface now includes meaningful IBKR auth, holdings, pricing, quote preview, dry-run preview, open-order status, execution/fill fallback, completed-order lookup, and cancel scaffolding. True writable live submission is still intentionally blocked behind readonly + safety gates. |
| 12. Interactive Brokers adapter MVP | partial | Native TWS / IB Gateway socket connectivity is working in read-only mode, holdings sync is live, current dry-run proposals use broker-backed pricing where available, and the repo now exposes normalized quote/dry-run/status/cancel scaffolding plus completed-order inspection. Remaining gap is fully enabled live writable execution. |
| 13. Portfolio creation workflow | partial | Create/bootstrap/apply-answers/next-questions workflow exists and clears current ETF draft-state gaps cleanly. Workflow cohesion could still improve. |
| 14. Strategy and ETF selection workflow | partial | Approved instruments, validation, shortlist generation, rationale, and approval-gated application support exist, but shortlist write-back/approval flow is still light. |
| 15. Market entry workflow | partial | Portfolio-aware execution gating, approval transitions, durable status reconciliation, cancel scaffolding with runtime error handling, and demo flow now exist. The remaining gap is actual writable live submission enablement after explicit operator approval. |
| 16. Rebalancing workflow | partial | Allocation analysis, proposal generation, dashboard updates, status reconciliation, and post-fill holdings refresh hook exist. Final live execution hardening still trails. |
| 17. Reporting | partial | Weekly/monthly/quarterly Markdown reports and HTML/PDF artifacts are generated. Reports now surface execution lifecycle and freshness metadata against dashboard/source drift, but narrative polish and failure surfacing still remain. |
| 18. Scheduling | partial | Schedule docs exist and OpenClaw cron jobs are wired for daily maintenance plus weekly/monthly/quarterly report cycles. Remaining work is operational hardening and delivery/alert policy. |
| 19-20. Safety + error handling | partial | Safety checks, activation blockers, broker error pause state, typed execution snapshots, bundled execution verification, fail-closed blocks for unresolved questions / excluded-instrument conflicts / stale-or-simulated pricing, and freshness warnings for stale dashboard/report state now exist. Centralized structured runtime logging, deeper risk-limit enforcement, and true live failure drills remain lighter than ideal. |
| 21. Template portfolio | done | `portfolio/_template/` contains the expected files and sample strategy content. |
| 22. MVP build order | in progress | Work has progressed well past reporting and deep into execution lifecycle reconciliation, with the remaining gap concentrated in live writable enablement. |
| 23. Acceptance criteria | partial | Many dry-run/read-only criteria pass, including validation, holdings sync, dashboard/report generation, approval gating, status reconciliation, and no-Markdown-secrets posture. Full acceptance is still blocked by intentionally disabled live execution. |
| 24. First portfolio to create | partial | `portfolio/etf/` exists, is active, confirmation-gated, and backed by live read-only broker sync. It still should not be treated as a finished live-capable MVP portfolio until writable execution is deliberately enabled and hardened. |

## Concrete evidence in repo

### Portfolio/state foundation
- `portfolio/_template/*`
- `portfolio/etf/*`
- `src/markdown/*`
- `scripts/create-portfolio.js`
- `scripts/bootstrap-portfolio-from-json.js`

### Validation and safety
- `scripts/validate-portfolio.js`
- `scripts/validate-strategy.js`
- `scripts/check-portfolio-activation.js`
- `scripts/check-generated-state.js`
- `scripts/check-safety-controls.js`
- `src/validation/*`

### Workflow helpers
- `scripts/next-portfolio-questions.js`
- `scripts/apply-portfolio-answers.js`
- `src/workflows/*`

### Analysis/reporting/execution state
- `scripts/propose-trades.js`
- `scripts/propose-instrument-trades.js`
- `scripts/write-trade-proposals.js`
- `scripts/regenerate-dashboard.js`
- `scripts/write-history-snapshot.js`
- `scripts/run-report-cycle.js`
- `scripts/verify-execution-surface.js`
- `scripts/demo-portfolio-execution-flow.js`
- `src/analysis/*`
- `src/reporting/*`
- `src/execution/*`

### Broker work
- `brokers/interactive-brokers/*`
- `scripts/test-interactive-brokers-auth.js`
- `scripts/check-interactive-brokers-config.js`
- `scripts/sync-interactive-brokers-holdings.js`
- `scripts/search-interactive-brokers-instruments.js`
- `scripts/fetch-interactive-brokers-price.js`
- `scripts/resolve-interactive-brokers-conids.js`
- `src/brokers/interactive-brokers/*`
- `src/brokers/shared/*`
- `skills/ibkr/scripts/ibkr_cli.py`

## Current blockers to calling the MVP "implemented"

1. Live broker submission/cancellation is still intentionally constrained by readonly posture and safety gating; this is correct for safety, but it means the MVP is not yet live-complete.
2. Holdings are live-synced successfully from IBKR for the ETF portfolio; the remaining broker work is writable execution completion and live-path hardening, not basic connectivity.
3. The fragile Client Portal gateway path has effectively been superseded by native TWS / IB Gateway socket transport for the active integration path.
4. Interactive Brokers instrument lookup, price lookup, normalized quote preview, dry-run preview, open-order status lookup, execution/fill fallback, completed-order lookup, and cancel scaffolding now exist, but durable writable submit handling remains unfinished by design.
5. Dashboard and history now surface execution lifecycle state more clearly, but broader reporting polish and live-ops observability could still improve.
6. Bundled execution verification exists and passes, but it mainly validates dry-run/reconciliation behavior rather than real writable broker writes.

## Most recent improvements

- Added a portfolio execution service above the broker client with approval-aware policy checks.
- Added trade lifecycle reconciliation helpers for approved/submitted/partially_filled/filled/cancelled/failed states.
- Added scripts for approving trades, syncing order status, cancelling by order id, and verifying the execution surface.
- Hardened native IB client loading so missing optional native dependency no longer blocks policy/test paths.
- Added post-fill holdings refresh hook plus broker error pause state after repeated failures.
- Added execution-fill and completed-order fallback paths for broker status lookup.
- Added typed execution history snapshots and richer dashboard execution lifecycle visibility.
- Added reconciliation note compaction and a safe demo execution flow script.
- Added cancel-path runtime broker error tracking and recovery clearing so cancel failures participate in the same safety pause posture as stage/status failures.
- Hardened trade blocking so unresolved portfolio questions, excluded/approved instrument overlap, stale pricing, simulated pricing, and unresolved live account references fail closed before broker writes.
- Added dashboard/report freshness surfacing plus stale-state detection against source Markdown drift, and made report cycles return explicit history/dashboard refresh evidence.
- Hardened rebalancing proposal generation to honor configured thresholds, explain cash-first behavior, and surface exact below-minimum blocking reasons.
- Expanded verification coverage with lifecycle, snapshot-typing, dashboard execution-summary, material-event history, cancel-runtime-error, staged-order handoff, trade-blocking safety, dashboard/report freshness, and rebalancing-hardening tests.
