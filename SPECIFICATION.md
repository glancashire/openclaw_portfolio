# OpenClaw Portfolio Manager — Build Specification

## 1. Purpose

Build and maintain an OpenClaw-based portfolio-management system that:
- manages Markdown-controlled investment portfolios,
- integrates with Interactive Brokers,
- helps enforce a defined portfolio strategy,
- produces human-readable operator and investor reporting,
- keeps safety, auditability, and human approval gates explicit.

The system is not just a proposal generator anymore. It now includes guarded execution/operator workflows, structured summary artifacts, investor-facing reporting, health diagnostics, and delivery surfaces.

## 2. Core Principles

1. **Modular architecture**
   - Broker integrations stay isolated in broker adapters.
   - Portfolio strategy logic stays separate from execution logic.
   - Reporting stays separate from portfolio management.
   - Health/diagnostic/report-delivery logic should remain inspectable and testable.

2. **Structured Markdown as the control layer**
   - Each portfolio is represented by a folder.
   - Each portfolio has a small set of structured Markdown files.
   - Markdown files act as both human-readable configuration and operational logs.

3. **One broker per portfolio**
   - A portfolio may only be linked to one broker account.
   - The active implementation scope is Interactive Brokers only.

4. **Human approval before material actions**
   - The system may analyse, suggest, prepare, report, and reconcile automatically.
   - Material broker writes remain guarded by explicit execution mode, readiness, and approval posture.
   - Reporting automation must not be confused with trading automation.

5. **Capital preservation and auditability**
   - Every action should leave inspectable evidence.
   - Trade decisions must remain explainable.
   - Dry-run and diagnostic surfaces should exist beside any higher-risk path.
   - Generated artifacts should help humans understand what happened without reading raw logs.

## 3. Active Scope

### Implemented / active scope
- Multiple portfolios in the repo structure, with `portfolio/etf/` as the active real portfolio.
- Interactive Brokers integration, primarily through the native TWS / IB Gateway socket path.
- ETF-first, CHF-first portfolio management posture.
- Portfolio creation and guided completion workflow.
- Strategy definition and validation.
- Approved-instrument workflow and ETF shortlist support.
- Holdings sync from broker.
- Portfolio valuation and drift analysis.
- Proposal / approval / queue / submit / reconcile workflow.
- Trade-state logging and lifecycle reconciliation.
- Daily/weekly/monthly/quarterly reporting surfaces.
- Portfolio summary email delivery.
- Fill / purchase notification emails.
- Health report generation and dashboard digest delivery.
- Structured summary, overview, and pending-action artifacts.
- Operator diagnostics, runbooks, observability, and bounded self-heal guidance.
- In-progress market-calendar intelligence for approved instruments.

### Still intentionally constrained
- Interactive Brokers only.
- ETF-focused live strategy.
- Human-readable, inspectable workflow over opaque automation.
- No uncontrolled autonomous trading.

### Explicitly out of scope / not primary
- options
- CFDs
- margin trading as a product goal
- short selling
- crypto
- opaque prediction-heavy trading
- tax optimization as a first-class product surface
- multi-broker abstraction as an immediate target

## 4. Repository / Folder Structure

The repository contains:
- `portfolio/` for portfolio-controlled Markdown state and generated per-portfolio artifacts
- `src/` for application logic
- `scripts/` for operator and verification entrypoints
- `docs/` for operator-facing documentation/runbooks
- `runtime/` for generated runtime evidence and overview artifacts
- `brokers/interactive-brokers/` for integration notes/contracts

The active runtime/reporting surface also includes generated artifacts such as:
- `portfolio/<name>/summary.json`
- `portfolio/<name>/summary.html`
- `runtime/overview/portfolio-overview.{md,html}`
- `runtime/overview/daily-summary.{md,json}`
- `runtime/overview/pending-actions.json`
- dated report artifacts under `portfolio/<name>/reports/`

## 5. Portfolio Folder Contract

Each active portfolio should contain at least:
- `portfolio.md`
- `holdings.md`
- `trades.md`
- `history.md`
- `dashboard.md`
- `reports/`
- generated structured summary artifacts where applicable

These files are both operator-readable and tool-consumable.

## 6. Portfolio Definition (`portfolio.md`)

`portfolio.md` remains the canonical strategy/control document and should capture:
- status
- broker reference
- execution mode
- asset scope
- investor/risk profile
- allocation targets
- approved instruments
- excluded instruments
- rebalancing policy
- market-entry policy
- risk limits
- automation permissions
- notes/open questions

The implementation now also relies on persisted IBKR identity fields for approved instruments where available, such as:
- conid
- symbol
- local symbol
- primary exchange

These identities support safer pricing, execution, diagnostics, and the emerging market-calendar lane.

## 7. Holdings / Trades / History / Dashboard

### `holdings.md`
- stores effective current holdings and valuation
- should be refreshed from broker truth before key analysis/execution work

### `trades.md`
- stores proposals, approvals, lifecycle state, broker linkage, blocks, and recovery context

### `history.md`
- stores typed history snapshots and execution/reporting evidence

### `dashboard.md`
- stores the per-portfolio operator-facing summary
- complements structured summary artifacts rather than replacing them

## 8. Broker / Execution Surface

The active operator command surface is centered on `scripts/trade.js`, with canonical commands for:
- preflight
- authority
- config
- delivery
- propose
- validate
- queue-open / requeue-open
- arm-open / disarm-open
- submit
- reconcile-live
- cancel
- status
- history
- health
- self-heal
- refresh-stale-approvals

Execution remains intentionally guarded:
- readiness must be truthful
- approvals must be current
- broker/runtime posture must allow action
- reporting/diagnostic automation must not be mistaken for unconditional trading permission

## 9. Reporting Surface

The current reporting system includes:
- periodic portfolio reports (weekly/monthly/quarterly)
- dated Markdown/HTML/PDF report artifacts
- report-specific sibling JSON summary artifacts
- portfolio summary email rendering
- investor-facing held-instruments and totals views
- fill/purchase notifications
- health reports for operator/investor review
- dashboard digest emails
- runtime/overview artifacts for cross-portfolio/operator review

Reports should remain:
- readable by non-technical recipients where intended
- truthful about missing/unavailable data
- safe under degraded broker conditions
- backed by structured data where practical

## 10. Health / Observability / Delivery

The current product includes:
- runtime event evidence
- delivery posture diagnostics
- health classification and bounded self-heal guidance
- operator runbooks
- observability docs
- generated overview and pending-action surfaces

Delivery/reporting failures should surface clearly and must not silently imply that communication succeeded.

## 11. Scheduling and Automation

The system supports scheduled reporting/health workflows through OpenClaw cron and script entrypoints.

Automation should remain conservative:
- exact timing and recurring jobs are fine
- broker/reporting checks may run automatically
- cron delivery caveats on the host must be respected
- automatic trading remains guarded and policy-bound
- market-calendar sync is intended to become a conservative scheduled intelligence path, not an aggressive dependency

## 12. Safety Rules

- Never store secrets in Markdown.
- Prefer truthful degraded state over optimistic assumptions.
- Use dry-run/diagnostic surfaces before higher-risk operations.
- Keep investor-facing communication concise, readable, and honest about missing data.
- Preserve human approval gates for material broker actions unless an explicit policy says otherwise.
- Keep generated/runtime churn out of unrelated commits.

## 13. Current Acceptance Interpretation

For the active repository, “acceptable” now means:
- portfolio contracts are valid
- broker readiness and execution authority are diagnosable
- analysis/proposal/reconciliation/reporting paths are implemented
- investor-facing reporting works for the active portfolio path
- operator docs and verification exist
- remaining open work is tracked explicitly in a maintained roll-up instead of hidden behind stale closure language

## 14. Current Outstanding Work

The current outstanding work should be tracked in:
- `PLAN.md` (active phase + backlog, consolidated 2026-06-05)
- `STATUS.md` (current health snapshot)

Detail for the active phase lives in `plans/<phase>.md`. Historical plans are under `archive/phase-plans/`.

## 15. Historical Traceability

Older phase plans remain part of the repo as implementation history.
They are valuable for audit and reconstruction, but they are not the canonical present-tense status source.
