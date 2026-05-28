# Phase R6 — Terminal order evidence fallback

## Objectives
- Close the remaining gap where old basket-run legs can stay `submitted` even after broker truth shows no open order and no fill.
- Add a deterministic fallback path for terminal broker evidence that is weaker than exact completed-order id matching but stronger than symbol-only guessing.
- Use that fallback to improve stale live run reconciliation without changing execution or approval behavior.

## Risks / dependencies
- Fallback matching can become dangerous if it is too fuzzy; avoid cross-order contamination.
- Native IBKR surfaces may omit different identifiers on different days, so tests need fixture coverage for the tolerated hint combinations.
- Live artifact repair should remain idempotent and should not rewrite already terminal legs.

## Actionable checklist
- [x] Inspect existing order-status/probable-cancelled inference helpers and identify the safest reusable heuristics.
- [x] Write unit/regression tests for basket-run reconciliation using strong terminal hints (order id, permId, symbol + quantity + action, etc.) and explicit anti-false-positive cases.
- [x] Implement the fallback in shared basket reconciliation code, reusing existing normalization where practical.
- [x] Re-run targeted basket/trade reconciliation tests, safe lane, and full suite until green.
- [x] Apply the improved reconciliation to the stale 5-leg run artifact if broker evidence now supports closure, then verify resulting dashboard/report posture. Current live rerun still lacks strong terminal hints for orders `9138` / `9140`, so the artifact remains unchanged.
- [ ] Commit and push the completed phase.

## Acceptance criteria
- Basket-run reconciliation can move a stale `submitted` leg to a terminal state when strong broker hints exist even if one exact surface is missing.
- Unrelated completed-order rows do not close the wrong leg.
- Existing fill precedence remains intact.
- Tests cover both positive and negative cases, and the full suite passes.
