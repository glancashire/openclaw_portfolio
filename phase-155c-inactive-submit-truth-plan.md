# Phase 155C — Immediate inactive-submit truth and clean execution retry

## Goal
Make live submission truthful when IBKR immediately returns `Inactive`, preserve the broker rejection reason on the fresh row, avoid corrupting historical rows via reused order ids during sync, and only then regenerate/approve/retry the balanced portfolio orders.

## Why this step now
Current live execution reached the broker, but all three submitted orders came back `Inactive` and later status sync degraded them to generic `not_found` while also mutating older historical rows that reused the same broker order ids (`9105`, `9107`). That blocks truthful recovery and makes further retries unsafe.

## Scope
1. [x] Fix `submit-orders-at-open.js` so immediate broker acks with `Inactive` are written as inactive/failed truthfully, including broker error code/message when available.
2. [x] Add focused regression coverage for immediate inactive order recording.
3. [x] Narrow sync/reconciliation matching so reused broker order ids cannot mutate unrelated historical rows.
4. [x] Re-run the submit path only after the truthful inactive reason is captured or the path is patched enough to preserve it.

## Safety gates
- [x] Do not resubmit fresh live orders until the immediate inactive reason is preserved on the current rows.
- [x] Do not hand-edit executed trade rows without test-backed code changes.
- [x] Keep approval and live execution on the repo’s canonical path.

## Verification
- [x] Focused tests for immediate inactive submit truth.
- [x] Focused tests for sync selector / reused order-id safety.
- [x] Direct inspection of `trades.md` showing latest rows capture broker block reason instead of generic `not_found`.
- [x] Only then consider another live retry.

## Outcome
This lane was completed. It exposed the real broker-side blockers (`Duplicate order id`, tick-size mismatch, and conid contract-parameter conflicts), which were then fixed in the native client path and allowed the remaining non-SPYL live orders to submit and fill truthfully.
