# Phase 145 — Native Inactive Reason Capture

## Goal
Preserve the broker-side reason when a newly submitted native IBKR order immediately transitions into `Inactive`, cancellation, or rejection-like states, so operator surfaces explain the real submit-time failure instead of only showing a later generic inactive/cancelled outcome.

## Checklist
- [ ] Harden `placeNativeOrder()` so it does not resolve too optimistically on first ack.
- [ ] Keep listening briefly for immediate order-scoped IBKR `error` events and `Inactive` transitions.
- [ ] Return broker evidence fields on native placed orders: `brokerReason`, `brokerErrorCode`, `brokerErrorMessage`.
- [ ] Surface those fields through reconciliation reason notes.
- [ ] Add a focused regression test for immediate native inactive/error capture.
- [ ] Re-run existing inactive/cancelled reconciliation tests and native contract normalization.
- [ ] Commit and push once green.

## Verification
- `node scripts/test-inactive-order-reconciliation.js`
- `node scripts/test-probable-cancelled-hint-reconciliation.js`
- `node scripts/test-native-conid-contract-normalization.js`
- Any new focused native inactive/error capture test

## Non-goals
- No automatic resubmission.
- No changes to execution permissions.
- No speculative reclassification of historic orders without evidence.
