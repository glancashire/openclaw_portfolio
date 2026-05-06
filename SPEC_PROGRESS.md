# Specification Progress Map

This file maps the current repository implementation to `SPECIFICATION.md` so progress can be reviewed without reading the whole codebase.

## Summary

- Overall status: read-only + dry-run MVP acceptance closure achieved, with portfolio-aware execution safety, typed execution history, bundled execution verification, durable lifecycle reconciliation, fail-closed pre-trade blocking, and fresher dashboard/report orchestration; the repo now transitions into explicit post-MVP hardening phases.
- Strongest areas: scaffolding, Markdown contracts, validation, reporting, dry-run workflow, Interactive Brokers read-only holdings sync, execution lifecycle reconciliation back into Markdown state, fail-closed execution safety gating, artifact freshness surfacing, and end-to-end acceptance evidence for the in-scope workflow.
- Biggest remaining gap: operational maturity beyond the accepted MVP — especially delivery polish and observability hardening. Transmitted-live safeguards and operator runbooks now exist, but more production-facing reporting policy and deeper observability still remain.
- Scope change applied: the repo targets Interactive Brokers only for the MVP and no longer carries IG-specific implementation paths.

## Progress by specification area

| Spec area | Status | Notes |
|---|---|---|
| 4. Repository / Folder Structure | done | Portfolio, broker, config, runtime, scripts, and `src/` layout are present and aligned with the active IBKR-only MVP path. |
| 6-10. Portfolio Markdown contracts | done | Template + real ETF portfolio files exist and validators cover required structure. Execution reconciliation now writes back into `trades.md`, `history.md`, and `dashboard.md` with richer state semantics. |
| 11. Broker adapter interface | partial | Interface now includes audited IBKR auth, holdings, pricing, quote preview, dry-run preview, open-order status, execution/fill fallback, completed-order lookup, cancel scaffolding, and clearer diagnostics for blocked/degraded paths. True writable live submission is still intentionally blocked behind readonly + safety gates. |
| 12. Interactive Brokers adapter MVP | partial | Native TWS / IB Gateway socket connectivity is working in read-only mode, holdings sync is live, current dry-run proposals use broker-backed pricing where available, and the repo now exposes normalized quote/dry-run/status/cancel scaffolding plus completed-order inspection and clearer blocked-path diagnostics. Remaining gap is fully enabled live writable execution. |
| 13. Portfolio creation workflow | done | Create/bootstrap/apply-answers/next-questions workflow now includes structured guided intake prompts, activation-readiness alignment, and clean draft-state completion for the ETF MVP path. |
| 14. Strategy and ETF selection workflow | done | Approved instruments, validation, shortlist generation, richer screening filters, rationale, rejection reporting, and approval-gated shortlist application are now in place for the ETF MVP path. |
| 15. Market entry workflow | partial | Portfolio-aware execution gating, approval transitions, durable status reconciliation, cancel scaffolding with runtime error handling, and demo flow now exist. The remaining gap is actual writable live submission enablement after explicit operator approval. |
| 16. Rebalancing workflow | done | Allocation analysis and proposal generation now honor thresholds, min/max allocation breaches, minimum size, cash-drag policy, cash-first behavior, and avoidable-turnover suppression for the ETF MVP path. |
| 17. Reporting | partial | Weekly/monthly/quarterly Markdown reports and HTML/PDF artifacts are generated. Reports now surface execution lifecycle, freshness metadata, generation/render status, and operator-state pause evidence clearly; remaining work is mostly delivery/alerting polish rather than report structure itself. |
| 18. Scheduling | partial | Schedule docs exist and OpenClaw cron jobs are wired for daily maintenance plus weekly/monthly/quarterly report cycles. Scheduled report automation now returns explicit workflow and failure metadata with read-only mode tagging; remaining work is delivery/alert policy and broader broker live-path hardening. |
| 19-20. Safety + error handling | partial | Safety checks, activation blockers, broker error pause state, typed execution snapshots, bundled execution verification, fail-closed blocks for unresolved questions / excluded-instrument conflicts / stale-or-simulated pricing, documented operator recovery runbooks, and freshness warnings for stale dashboard/report state now exist. Centralized structured runtime logging, deeper risk-limit enforcement, and true live failure drills remain lighter than ideal. |
| 21. Template portfolio | done | `portfolio/_template/` contains the expected files and sample strategy content. |
| 22. MVP build order | done | The planned MVP build lanes are implemented through reporting, safety, scheduling, broker completeness audit, and end-to-end read-only/dry-run acceptance closure; remaining work is a deliberate post-MVP-style writable-live enablement lane. |
| 23. Acceptance criteria | done | The in-scope MVP acceptance sweep now passes for portfolio creation, draft blocking, IBKR read-only connectivity/holdings posture, dry-run proposal generation, dashboard/report generation, safety gating, and auditable Markdown outputs. True transmitted live execution remains intentionally outside the accepted read-only/dry-run MVP boundary. |
| 24. First portfolio to create | done | `portfolio/etf/` exists, is active, confirmation-gated, and backed by live read-only broker sync, satisfying the first-portfolio requirement for the accepted read-only/dry-run MVP scope. |

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

## Remaining limits beyond the accepted MVP closure

1. Transmitted live broker submission/cancellation is still intentionally constrained by readonly posture and safety gating; this is correct for safety, but it means the repo is not yet explicitly opt-in live-transmit complete.
2. Holdings are live-synced successfully from IBKR for the ETF portfolio; the remaining broker work is post-MVP hardening, not basic connectivity.
3. The fragile Client Portal gateway path has effectively been superseded by native TWS / IB Gateway socket transport for the active integration path.
4. Interactive Brokers instrument lookup, price lookup, normalized quote preview, dry-run preview, open-order status lookup, execution/fill fallback, completed-order lookup, and cancel scaffolding now exist, but explicit transmitted-mode policy and runbook hardening remain unfinished by design.
5. Bundled execution verification exists and passes, and Phase 25 added explicit operator-workflow/runbook evidence plus an incident-summary CLI; further post-MVP work should now focus more heavily on delivery policy and observability depth.

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
- Hardened ETF shortlist generation so exclusions produce explicit rejections, approved instruments remain visible in ranked output, and shortlist reasons expose scoring drivers more clearly.
- Hardened portfolio draft/activation readiness so missing generated files, unresolved placeholders, and unanswered intake questions are surfaced explicitly before activation.
- Hardened report generation so outputs expose generation/render metadata, narratives stay more consistent across periods, and the CLI correctly awaits async report completion.
- Hardened scheduled report-cycle automation so it returns explicit step-level workflow/failure metadata and preserves clear read-only reporting mode boundaries.
- Hardened broker-path diagnostics so blocked, unavailable, and degraded Interactive Brokers operations return more explicit mode/operation/reason metadata for operators and automation.
- Completed the ETF suggestion workflow with richer screening filters and explicit approval gating before shortlist rows can rewrite Approved Instruments.
- Completed portfolio guided intake so draft-state gaps now produce structured prompts with guidance and answer-format hints aligned to activation blockers.
- Completed execution/safety closure so unmatched holdings and max-single-ETF breaches now fail closed with explicit operator-facing blockers.
- Completed rebalancing closure so proposals now honor min/max bounds, cash-drag policy, and avoidable-turnover suppression in addition to thresholds and minimum size rules.
- Expanded verification coverage with lifecycle, snapshot-typing, dashboard execution-summary, material-event history, cancel-runtime-error, staged-order handoff, trade-blocking safety, execution-safety-closure, dashboard/report freshness, rebalancing-hardening, rebalancing-closure, ETF-suggestion-hardening, ETF-suggestion-completion, portfolio-creation-hardening, portfolio-guided-intake, reporting-completeness, scheduling-ops-reliability, broker-adapter-completeness, and optional-Playwright-fallback tests.
- Closed the final acceptance sweep for the read-only + dry-run MVP and removed the remaining non-browser proposal-path regression caused by eager browser-session imports.
- Defined the post-MVP roadmap covering transmitted live execution hardening, operator runbooks, production reporting/delivery polish, and risk/logging/observability hardening.
