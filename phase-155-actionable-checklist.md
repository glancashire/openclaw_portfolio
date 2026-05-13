# Phase 155 Actionable Checklist

## Phase 155A — Canonical execution-state classification and stale-approval truth
- [ ] Add a shared execution-state classifier for trade rows.
- [ ] Normalize stale approval classification into the shared classifier.
- [ ] Thread canonical execution state into readiness, summary, dashboard, and `trade.js status`.
- [ ] Stop counting stale/non-executable queued rows as generically "approved ready".
- [ ] Add focused regression tests for classifier output and stale approval surfacing.
- [ ] Run targeted tests.
- [ ] Commit and push.

## Next planned phases after 155A
- 155B — live reconciliation command + broker evidence persistence
- 155C — rebalance/regenerate from current holdings and cash
- 155D — dashboard priority overhaul + path-to-balanced-portfolio
- 155E — health model + bounded self-healing
