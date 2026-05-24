# Portfolio Manager Implementation Plan

This document is now the concise implementation-state overview for the repository.
For the current outstanding backlog, use `ROLLUP_OUTSTANDING_PLAN.md`.
For historical phase-by-phase detail, use the archived `phase-*-plan.md` files.

## Current implemented system

### Portfolio contract and workflow foundation
- Markdown-controlled portfolio state under `portfolio/<name>/`
- portfolio/template validation and strategy checks
- guided draft completion with `next-questions` / `apply-answers`
- approved-instrument workflow and shortlist tooling
- holdings/trades/history/dashboard/report artifacts

### Interactive Brokers operational path
- IBKR-only active broker scope
- native TWS / IB Gateway socket-first posture
- holdings sync, pricing, proposal support, readiness checks
- contract-aware execution and reconciliation seams
- truthful preflight / authority / config / delivery diagnostics
- guarded submit / cancel / reconcile workflow through `scripts/trade.js`

### Reporting and investor communication
- weekly/monthly/quarterly report generation
- structured summary artifacts (`summary.json`, overview JSON/HTML/Markdown)
- investor-facing portfolio summary email redesign
- investor-facing fill / purchase notification redesign
- condensed investor-friendly health reporting
- dashboard digest email surface
- report-specific sibling JSON artifacts for dated reports

### Health / observability / operator posture
- runtime event evidence
- overview / daily summary / pending action / delivery status artifacts
- operator runbooks and observability docs
- `trade.js health` and bounded `trade.js self-heal`
- health check CLI and cron wiring

### Verification posture
- curated repo verification via `npm test`
- focused regression scripts across execution, reporting, docs, and artifact contracts
- local pre-commit hook running focused checks

## Recent completed lanes that earlier plans under-reported

These are materially implemented and should now be considered part of the current system surface:
- later execution/readiness/documentation hardening beyond the older MVP closure docs
- investor-reporting redesign phases (portfolio, fill, health, wording consistency)
- structured summary JSON persistence beside dated reports
- stabilization/cleanup guidance for generated/runtime artifacts
- market-calendar core model and persistence (Phase 166a)

## Current active lane

### Market-calendar intelligence for approved instruments
Status:
- core calendar helper/store model: complete
- IBKR sync lane: in progress
- readiness/reporting/cron integration: outstanding

This lane is intended to let the system understand when relevant exchanges for persisted instruments are open, persist that information, and keep it refreshed conservatively.

## Canonical operator entrypoints

Use `node scripts/trade.js ...` as the primary execution/operator command family.

Important companion commands:
- `node scripts/run-report-cycle.js <portfolio-dir> <weekly|monthly|quarterly> [YYYYMMDD]`
- `node scripts/run-health-check.js <portfolio-dir> [--dry-run] [--send-email]`
- `node scripts/send-dashboard-digest.js --portfolio=<name> --frequency=<daily|weekly> [--dry-run]`
- `node scripts/check-interactive-brokers-readiness.js`
- `node scripts/check-live-readiness-preflight.js <portfolio-dir> --json`
- `node scripts/resolve-interactive-brokers-conids.js <portfolio.md>`

## Implementation strategy going forward

1. Keep using phase plans committed before broad changes.
2. Prefer one maintained roll-up backlog over scattered “current status” claims in older historical docs.
3. Treat generated/runtime artifacts as derived outputs, not roadmap truth.
4. Preserve strict safety gates around broker writes and external delivery.
5. Keep documentation aligned with actual code/script surfaces as part of each implementation phase.

## What this document no longer tries to be

This file is no longer a full historical ledger of every completed phase. That became noisy and misleading once the repo grew far beyond the original closure milestones.

Use:
- `SPEC_PROGRESS.md` for current implementation-to-spec mapping
- `ROLLUP_OUTSTANDING_PLAN.md` for the current outstanding work checklist
- `phase-*-plan.md` files for historical phase details
