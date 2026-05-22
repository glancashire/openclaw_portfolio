# Phase 196 — Retire Hardcoded NEW_BASKET Constant

## Objective
Remove the hardcoded `NEW_BASKET` constant from `scripts/execute-approved-basket-end-to-end.js`. The script should:
1. Default to executing the most recent proposal envelope under `runtime/basket-proposals/<portfolio>/`.
2. Accept `--proposal=<path>` to override.
3. Accept `--reconcile-only --approval-id=<id>` (existing) for re-runs.
4. Save the proposal as an approved basket envelope before invoking the runner.

This finally aligns the script with the Phase 195 workflow: assistant runs `propose-basket.js` to get a fresh proposal, operator approves, assistant runs `execute-approved-basket-end-to-end.js` (no edits required).

## Risks / dependencies
- The script must not silently pick up a stale proposal envelope. Default behavior is to use the most-recently created envelope; if the latest envelope is older than 1 hour, surface a warning.
- The runner needs a valid `approved-order-baskets` envelope; the script must promote the proposal envelope to approved before invoking the runner.

## Actionable checklist
- [ ] Remove the hardcoded `NEW_BASKET` literal.
- [ ] Add `--proposal=<path>` CLI flag.
- [ ] Add helper `latestProposalForPortfolio({ rootDir, portfolio })` returning the most recent proposal envelope file or null.
- [ ] When transmitting (not reconcile-only):
  - Resolve proposal path (CLI flag or latest).
  - If older than 1 hour, log a warning.
  - Promote: read proposal, set status `approved`, save as approved basket envelope.
  - Invoke runner with the promoted approval id.
- [ ] Update CLI usage string.
- [ ] Tests:
  - Unit: `latestProposalForPortfolio` finds the newest file.
  - Integration: the orchestration flow now consumes a proposal envelope without code edits.

## Acceptance criteria
- `node scripts/execute-approved-basket-end-to-end.js` (no args) selects the latest proposal envelope from `runtime/basket-proposals/etf/`, promotes it to approved, runs the canonical runner, and proceeds through the lifecycle.
- `node scripts/execute-approved-basket-end-to-end.js --reconcile-only --approval-id=...` still works for replays.
- Tests pass; existing focused suite stays green.
