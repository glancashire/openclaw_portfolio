# Phase 187 — End-to-End Basket Execution With One Approval

## Objective
Deliver a clean rebalance flow with exactly one operator approval gate:
1. Sync IBKR holdings + cash (read-only).
2. Refresh broker quotes for the rebalance legs.
3. Propose instruments, quantities and price bands sized against the combined portfolio (invested + broker cash).
4. Ask the operator once for approval.
5. After explicit approval, transmit the basket via the existing runner.
6. Monitor orders; cancel any leg that does not fill within a reasonable window (default 8 minutes); proceed independently with the rest of the basket.
7. After each fill, send an email confirmation via the configured provider.
8. After the basket settles (filled / cancelled / failed across all legs), repropose any cancelled legs with refreshed prices and ask once for approval again.
9. Final sync: re-read holdings/cash and regenerate summary/recovery/dashboard artifacts.

## Constraints
- One approval per round only; no per-leg babysitting.
- Live execution stays gated behind the existing approval envelope + arm window.
- Single failing leg does not block the basket.
- All transmissions go through the canonical basket runner against the approval envelope; no row-by-row submissions.
- Reconciliation must run after every transmit pass.

## Risks / dependencies
- IBKR native socket must remain connected throughout.
- Live arm window must cover the monitor+cancel cycle.
- Email channel must be configured for fill notifications.
- Existing basket runner already supports independent leg outcomes; cancel-and-repropose is a thin layer on top.

## Actionable checklist
- [ ] Sync holdings + cash from IBKR.
- [ ] Refresh per-leg broker quotes and recompute price bands.
- [ ] Persist a fresh basket proposal artifact and approval envelope.
- [ ] Arm live execution window for the monitor + cancel cycle.
- [ ] Present the proposal to the operator for one explicit approval.
- [ ] On approval: invoke the basket runner with the approval envelope.
- [ ] Monitor per-leg status; cancel any unfilled leg after the timeout.
- [ ] Email a confirmation for each filled leg.
- [ ] Resync holdings and regenerate summary/recovery/dashboard artifacts.
- [ ] Repropose cancelled legs with fresh quotes and ask once for approval.

## Acceptance criteria
- One basket proposal/approval per cycle with explicit operator approval.
- Live transmission goes through the canonical basket runner using the approval envelope.
- Per-leg failures do not stop the rest of the basket.
- Each fill triggers an email confirmation.
- Cancelled legs trigger a single fresh reproposal.
- After the round, holdings/cash and summary artifacts reflect the executed state.
