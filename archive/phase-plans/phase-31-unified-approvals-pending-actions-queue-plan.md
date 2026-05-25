# Phase 31 — Unified approvals and pending-actions queue plan

## Goal
Turn the existing pending-action signals into one explicit operator queue that unifies approvals, execution follow-up, broker pause recovery, safety blockers, and report-delivery blockers across dashboard, report, summary, and overview surfaces.

## Scope checklist
- [x] Add a normalized operator-queue item model with stable fields for kind, severity, status, blocking, summary, and recommended operator action
- [x] Distinguish approval items from execution, broker, delivery, data, blocker, and workflow items
- [x] Add queue summaries/counts so operator-facing surfaces can show approvals vs blocking work clearly
- [x] Surface the unified queue in per-portfolio summary artifacts
- [x] Surface the unified queue in portfolio dashboard output with clearer labeling than the current flat pending-action list
- [x] Surface the unified queue in report output with explicit queue sections and counts
- [x] Surface the unified queue in the multi-portfolio overview output and cross-portfolio action ordering
- [x] Add focused tests for queue generation, ordering, and artifact/report/dashboard alignment
- [ ] Update roadmap/progress docs to reflect Phase 31 completion when done

## Implementation notes
- Reuse the existing pending-action signals already collected in Phase 28-30 work rather than re-deriving portfolio state from scratch.
- Keep the queue deterministic and operator-oriented.
- Preserve compatibility with existing `pending-actions.json`, but enrich it so later UI work can consume it directly.
- Prefer additive changes over breaking schema churn unless the old structure is clearly too weak.

## Verification
- [x] node scripts/test-structured-summary-artifacts.js
- [x] node scripts/test-dashboard-command-center.js
- [x] node scripts/test-reporting-completeness.js
- [x] node scripts/test-multi-portfolio-overview.js
- [x] node scripts/generate-portfolio-summary.js portfolio/etf
- [x] node scripts/generate-multi-portfolio-overview.js
- [x] inspect generated JSON / Markdown / HTML outputs directly

## Exit criteria
Phase 31 is complete when approvals and pending operator work are represented as one explicit, ordered queue across artifacts and all focused verification passes.
