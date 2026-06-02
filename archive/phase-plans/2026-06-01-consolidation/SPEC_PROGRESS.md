# Specification Progress Map

This file maps the current repository implementation to `SPECIFICATION.md` so progress can be reviewed without reading the whole codebase.

## Summary

- Overall status: the repository has moved well beyond the earlier read-only MVP closure. The active system now includes native IBKR-backed execution/readiness diagnostics, portfolio-aware trade lifecycle handling, structured summary/overview artifacts, investor-facing portfolio/fill/health email reporting, delivery and digest surfaces, bounded self-heal/health guidance, and later stabilization/cleanup work. Historical docs that implied closure around Phase 156 are stale.
- Strongest areas: Markdown portfolio contracts, validation, guarded execution workflow, native IBKR integration posture, reporting generation, structured runtime/overview artifacts, operator diagnostics, investor-facing email rendering, and verification coverage.
- Current active implementation lane: post-stabilization truth maintenance and operational follow-through (2026-05-30). Stabilization S1-S5 complete (2026-05-25); Phases A-H complete (2026-05-26); Wave closeout W1-W10 complete (2026-05-27); execution hardening retry follow-ons landed and were reconciled in git/doc truth (2026-05-30). Remaining work is primarily decision-only or external: Roll-up D automation posture, Mailgun infra setup, native IBKR login/2FA readiness dependence, and any future direct Control UI embedding if editable app source becomes available.
- Scope posture: Interactive Brokers remains the only supported broker for the active MVP/product lane. ETF-first, CHF-first, approval-gated operation remains the intended guardrail.

## Progress by specification area

| Spec area | Status | Notes |
|---|---|---|
| 4. Repository / Folder Structure | done | Portfolio, broker, config, runtime, scripts, and `src/` layout are present and actively used. |
| 6-10. Portfolio Markdown contracts | done | Template + real ETF portfolio files exist; validators and reconciliation/reporting flows consume them. |
| 11. Broker adapter interface | done | IBKR auth/readiness, holdings, pricing, quote preview, dry-run preview, status lookup, cancel support, completed/fill fallback, and contract-intelligence seams are present. |
| 12. Interactive Brokers adapter MVP | done | Native TWS / IB Gateway socket connectivity is the primary path; holdings sync, pricing, proposal support, live-readiness diagnostics, and truthful reconciliation are implemented. |
| 13. Portfolio creation workflow | done | Create/bootstrap/apply-answers/next-questions workflow exists with validation and readiness checks. |
| 14. Strategy and ETF selection workflow | done | Approved-instrument workflow, shortlist generation, validation, and approval-gated application are implemented. |
| 15. Market entry workflow | done | Proposal, approval, queue/open-runner handoff, submit/reconcile/cancel, and explicit live diagnostics are implemented with guarded posture. |
| 16. Rebalancing workflow | done | Allocation analysis, live-priced proposal generation, threshold/min-trade handling, and post-fill regeneration are implemented. |
| 17. Reporting | done | Weekly/monthly/quarterly reports, structured summary artifacts, overview artifacts, portfolio summary email delivery, health reports, dashboard digests, and investor-facing HTML/text reporting are implemented. |
| 18. Scheduling | partial | Cron-backed reporting/health workflows exist, but current-host delivery caveats and the newer market-calendar sync automation lane are not fully closed yet. |
| 19-20. Safety + error handling | done | Activation blockers, safety checks, runtime pause/error posture, preflight/authority/config/delivery diagnostics, health classification, and bounded self-heal guidance are implemented. |
| 21. Template portfolio | done | `portfolio/_template/` contains the expected starter contract. |
| 22. MVP build order | done | The practical MVP build order and later expansions have already been implemented; what remains now is incremental hardening/new capability rather than basic MVP assembly. |
| 23. Acceptance criteria | done | The implemented system satisfies the practical repository acceptance bar for the active ETF/IBKR path, with live action still intentionally guarded by approvals, readiness, and runtime policy. |
| 24. First portfolio to create | done | `portfolio/etf/` remains the canonical active portfolio and is integrated with the current workflows. |

## Concrete evidence in repo

### Portfolio/state foundation
- `portfolio/_template/*`
- `portfolio/etf/*`
- `src/markdown/*`
- `src/validation/*`
- `src/workflows/*`

### Execution and operator surfaces
- `scripts/trade.js`
- `src/execution/*`
- `docs/execution-command-surface.md`
- `docs/trading-workflow.md`
- `docs/operator-runbooks.md`
- `docs/observability.md`
- `docs/transmitted-live-operations.md`

### Reporting and investor-facing delivery
- `src/reporting/*`
- `lib/tradeNotificationEmail.js`
- `lib/tradeExecutionNotifier.js`
- `scripts/run-report-cycle.js`
- `scripts/run-health-check.js`
- `scripts/send-dashboard-digest.js`
- `portfolio/<name>/summary.json`
- `runtime/overview/*`

### Broker work
- `src/brokers/interactive-brokers/*`
- `scripts/check-interactive-brokers-readiness.js`
- `scripts/check-live-readiness-preflight.js`
- `scripts/resolve-interactive-brokers-conids.js`
- `skills/ibkr/scripts/ibkr_cli.py`

## Implemented feature groups beyond the earlier closure docs

### Investor-facing reporting redesign
Implemented across the recent completed phases:
- normalized investor holdings/fill data contract
- portfolio investor email with management summary, held instruments, and next-step guidance
- investor-friendly fill / purchase notification redesign
- condensed health-report synthesis for non-technical readers
- cross-report wording consistency
- report-specific structured summary JSON beside dated report artifacts

### Health, delivery, and observability
Implemented surfaces include:
- `trade.js preflight`
- `trade.js authority`
- `trade.js config`
- `trade.js delivery`
- `trade.js health`
- `trade.js self-heal`
- `run-health-check.js`
- `send-dashboard-digest.js`
- structured overview/daily-summary/report-history/delivery-status artifacts

### Stabilization and cleanup
The repo now explicitly distinguishes:
- source-of-truth Markdown/contracts/code
- generated runtime/report artifacts
- ephemeral runtime churn that should usually not ride along in unrelated commits

## Active outstanding work

The most relevant still-open work is now tracked in the maintained roll-up plan instead of being inferred from old closure docs:
- `ROLLUP_OUTSTANDING_PLAN.md`

At the time of this update, there is no remaining major unfinished core engineering lane inside Spec §1. The highest-signal open work is now operational:
- Roll-up D automation-boundary decision
- Retired email-reply approval infrastructure lane
- native IBKR login / 2FA readiness dependency
- optional direct Control UI embedding once editable source is accessible

## Historical note

The repository still contains many phase-plan files. They are useful as audit history, but they should not be treated as the current truth source for project status. Use this file plus `ROLLUP_OUTSTANDING_PLAN.md` for the current state.
