# Phase 155 Actionable Checklist

## Phase 155A — Canonical execution-state classification and stale-approval truth
- [x] Add a shared execution-state classifier for trade rows.
- [x] Normalize stale approval classification into the shared classifier.
- [x] Thread canonical execution state into readiness, summary, dashboard, and `trade.js status`.
- [x] Stop counting stale/non-executable queued rows as generically "approved ready".
- [x] Add focused regression tests for classifier output and stale approval surfacing.
- [x] Run targeted tests.
- [x] Commit and push.

## Phase 155 completion status
- [x] 155B — live reconciliation command + broker evidence persistence
- [x] 155C — rebalance/regenerate from current holdings and cash
- [x] 155D — dashboard priority overhaul + path-to-balanced-portfolio
- [x] 155E — health model + bounded self-healing

## Outcome
- Portfolio state was reconciled against live IBKR evidence.
- Planner cash/allocation truth bugs were fixed.
- Native IBKR execution-path issues were fixed far enough to execute the remaining non-SPYL trades truthfully.
- Holdings/reporting were resynced after fills.
- SPYL was replaced by a validated UBS Core S&P 500 alternative (`IE00BD4TXW66`, IBKR conid `808613958`).
- The portfolio is now balanced within policy, with only sub-minimum residual CHF cash left intentionally untraded.
