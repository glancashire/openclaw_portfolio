# Phase 150 — Portfolio Summary Broker Block Section

## Goal
Make the per-portfolio summary page surface concrete broker-blocked trade rows directly, so operators do not need to cross-reference recovery artifacts just to understand the current execution blockage on a portfolio.

## Checklist
- [ ] Inspect portfolio summary markdown/html rendering for the best insertion point.
- [ ] Add a dedicated broker-block section sourced from `summary.execution.blockedRows`.
- [ ] Keep empty-state behavior clean when no broker blocks are present.
- [ ] Add focused regression coverage for summary-page broker-block rendering.
- [ ] Re-run relevant portfolio-summary/reporting tests.
- [ ] Commit and push once green.

## Verification
- New focused summary rendering regression test.
- Existing broker-block artifact tests stay green.
- Existing portfolio summary / overview tests stay green.

## Non-goals
- No new broker classification rules.
- No recovery-checklist redesign.
- No queue-priority changes.
