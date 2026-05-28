# Phase next-2 — Reconciliation and audit-trail hardening

## Objectives
- Tighten probable-cancelled reconciliation so completed-order hints cannot cancel the wrong historical trade row when symbol and quantity coincide.
- Preserve the useful strong-match fallback from R6 while requiring stronger broker-evidence alignment where side/action metadata exists.
- Lock the behavior with targeted unit/integration regressions before touching the implementation.

## Risks / dependencies
- Over-tightening the matcher could stop legitimate recovery for older broker rows that expose sparse metadata.
- Completed-order surfaces may expose side/action under different field names, so the normalization needs to be tolerant without becoming vague.
- This phase must not weaken fill precedence, approval gates, or live-order safeguards.

## Actionable checklist
- [ ] Inspect the current probable-cancelled hint matcher in `src/execution/portfolioExecution.js`.
- [ ] Add failing regressions for opposite-side contamination and matching-side acceptance.
- [ ] Patch the matcher to require side/action agreement when the hint exposes it.
- [ ] Re-run focused reconciliation tests.
- [ ] Re-run safe lane and full verification.
- [ ] Commit and push the phase.

## Acceptance criteria
- A completed-order hint with matching symbol/quantity but opposite side does not cancel the row.
- A completed-order hint with matching symbol/quantity and matching side still reconciles as probable-cancelled.
- Focused reconciliation tests pass.
- `npm run test:all -- --lane=safe` and `npm test` both pass.
