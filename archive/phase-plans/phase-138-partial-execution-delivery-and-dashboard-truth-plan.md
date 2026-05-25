# Phase 138 — Partial Execution, Delivery, and Dashboard Truth

## Goal
Explain and fix why the live order set only partially executed, why no confirmation/fill notification was sent, and why dashboard/reporting surfaces still show stale or misleading execution truth.

## Why this phase exists
The operator-visible state is still inconsistent after the first transmitted-live attempt:
- EMUAA filled, but notification state still shows zero notified fills.
- SPYL is still flattened into `not_found`/`failed` truth in key surfaces, even though completed-order evidence exists.
- UBSSLI remained queued instead of transmitting, and the system needs a precise reason chain for that partial execution outcome.
- Dashboard/delivery artifacts still overcount failed rows and show stale blocker/history notes.
- `trade.js status` still emits noisy Python timezone tracebacks before the usable summary.

## Scope
1. Reconstruct the exact outcome of each live order candidate (EMUAA, SPYL, UBSSLI).
2. Make order-status reconciliation distinguish exact fills, probable cancelled evidence, and still-unknown outcomes.
3. Trace the fill-notification path and determine why EMUAA did not produce a confirmation.
4. Make dashboard/history/delivery surfaces reflect reconciled truth instead of stale generic failure counts.
5. Reduce or safely contain the noisy tzdata traceback in operator status flows when possible without unsafe env assumptions.

## Actionable checklist
- [x] Re-run canonical evidence surfaces for execution, authority, delivery, and status.
- [x] Inspect runtime notification state and fill-monitor logic to determine why EMUAA produced no confirmation.
- [x] Inspect reconciliation/history write paths for `not_found`, probable-cancelled, and filled outcomes.
- [x] Implement conservative probable-cancelled surfacing for SPYL/9105 in portfolio/runtime artifacts.
- [x] Implement/report the exact reason UBSSLI did not submit and ensure it remains queued truthfully.
- [x] Refresh dashboard/delivery/reporting summaries so failed/manual-review counts match current reconciled rows.
- [x] Add focused regression tests for:
  - probable-cancelled status surfacing
  - fill notification state after a reconciled fill
  - dashboard/delivery counts after reconciliation
  - status path tolerance of tzdata execution noise where possible
- [x] Re-run relevant tests and canonical commands; iterate until green.
- [ ] Commit and push once Phase 138 passes.

## Verification target
- We can explain exactly why only part of the order set executed.
- EMUAA fill confirmation path is either working and evidenced, or blocked by a concrete bug with a fix landed.
- SPYL is no longer represented as a generic opaque failure when broker-cancelled evidence exists.
- UBSSLI remains queued with an honest operator-visible reason.
- Dashboard, history, and delivery status align with actual reconciled state.

## Out of scope
- Submitting new live orders without renewed operator approval.
- Broad environment reprovisioning unless it is the smallest safe fix for the notification/status path.
