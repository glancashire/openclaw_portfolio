# Phase 146 — Broker Reason Classification and Next Action

## Goal
Turn captured native broker inactive/error reasons into consistent operator-facing block truth so submit failures like SPYL do not merely show generic inactive/cancelled outcomes, but instead expose an actionable block code, reason, and next step.

## Checklist
- [ ] Add broker-reason classification helper for common native submit failures.
- [ ] Map captured broker error text/code into stable operator-facing categories.
- [ ] Expose recommended next actions for those categories.
- [ ] Add focused regression tests for classification and reconciliation-visible phrasing.
- [ ] Re-run phase 145 tests plus new tests.
- [ ] Commit and push once green.

## Verification
- New focused broker-reason classification tests.
- `node scripts/test-native-immediate-inactive-reason-capture.js`
- `node scripts/test-inactive-order-reconciliation.js`
- `node scripts/test-probable-cancelled-hint-reconciliation.js`

## Non-goals
- No auto-retries.
- No resubmission policy changes.
- No mutation of historical rows without concrete broker evidence.
