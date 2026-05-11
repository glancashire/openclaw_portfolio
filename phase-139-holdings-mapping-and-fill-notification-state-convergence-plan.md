# Phase 139 — Holdings Mapping and Fill-Notification State Convergence

## Goal
Clear the remaining unmatched-holdings safety blocker and make fill-notification state converge with the already-reconciled EMUAA live fill, so operator surfaces stop showing avoidable residual ambiguity.

## Why this phase exists
After Phase 138, the operator-truth surfaces are much better, but two residual issues remain:
- Safety controls still report: `Holdings contain unmatched instruments: review instrument mapping`.
- The fill monitor logic is now fixed, but runtime notification state still shows zero notified fills for the already-reconciled EMUAA fill.

## Scope
1. Trace the unmatched-holdings blocker to the exact instrument mapping gap.
2. Fix the mapping conservatively so holdings, approved instruments, and execution/reporting surfaces agree.
3. Verify whether EMUAA/9107 can be safely backfilled into notification state without pretending a new live notification was sent.
4. Ensure dashboard/status/delivery/operator surfaces converge after the mapping and notification-state fixes.

## Actionable checklist
- [x] Reproduce and inspect the unmatched-holdings safety blocker source.
- [x] Identify the exact instrument mapping mismatch in holdings/portfolio/approval metadata.
- [x] Implement the smallest conservative mapping fix.
- [x] Test safety controls, dashboard generation, and related reporting after the mapping fix.
- [x] Inspect fill-notification runtime state and notifier behavior for EMUAA/9107.
- [x] Implement a safe state-convergence path for already-reconciled fills if appropriate.
- [x] Add focused regression tests for holdings mapping and fill-notification state convergence.
- [x] Re-run relevant tests and canonical commands; iterate until green.
- [ ] Commit and push once Phase 139 passes.

## Verification target
- The unmatched-holdings blocker is either eliminated or reduced to a precise remaining cause.
- Holdings/instrument identity is consistent across safety, dashboard, and execution surfaces.
- EMUAA fill-notification state is truthful and no longer silently inconsistent with the filled trade row.
- Delivery/status/dashboard surfaces remain aligned after the fix.

## Out of scope
- New live order submission.
- New outbound messaging side effects without explicit operator approval.
