# Phase 192 — One-Command Approve-and-Execute Reproposal Flow

## Objective
After a reproposal exists (Phase 190) and the operator types `approve`, the assistant should be able to run a single command that:
1. Promotes the latest reproposal to an approved basket (Phase 191).
2. Invokes the canonical basket runner.
3. Monitors / reconciles / mirrors / notifies / resyncs (Phase 188+189).
4. If still partially cancelled: emits a fresh reproposal (Phase 190).

This collapses the assistant's post-approval action surface to one command and one envelope, ending the babysitting workflow.

## Risks / dependencies
- The approve-and-execute path must not trigger if no reproposal exists.
- Notifications must remain idempotent (Phase 189 dedupe by broker order id is already in place).
- The runner stores its run state under the reproposal's approval id; reconciliation must use that same id, not the parent.

## Actionable checklist
- [ ] Add `scripts/approve-and-execute-reproposal.js` that:
  - Accepts `--parent=<parent-approval-id>` (required), `--portfolio=etf`, optional `--version`.
  - Calls `promoteReproposalToApproval`.
  - Calls `executeApprovedBasket(...)` with the promoted approval id.
  - Performs the same monitor/reconcile/mirror/notify/resync block as `execute-approved-basket-end-to-end.js` (extract shared helper to avoid drift).
  - Emits a fresh reproposal if any leg cancels again.
  - Prints a one-line status hint at the end.
- [ ] Refactor: extract the monitor+reconcile+mirror+notify+resync logic from `execute-approved-basket-end-to-end.js` into `src/execution/basketLifecycle.js` exporting `runBasketLifecycle({ portfolio, approvalId, rootDir, monitor })`.
- [ ] Wire both `execute-approved-basket-end-to-end.js` and `approve-and-execute-reproposal.js` to use the shared lifecycle helper.
- [ ] Tests:
  - Unit: lifecycle helper handles missing approvals, missing run artifact, broker disconnect.
  - Integration: dry-run lifecycle invocation with stubbed broker fns produces expected artifacts.
  - Regression: existing focused tests still pass.

## Acceptance criteria
- `node scripts/approve-and-execute-reproposal.js --parent=basket-etf-20260522T1041` (after operator approval) runs end-to-end without further input.
- The lifecycle helper is the single source of truth for monitor/reconcile/mirror/notify/resync.
- Existing orchestration script delegates to the helper and produces identical behavior.
- Full focused suite green; new tests for lifecycle helper pass.
