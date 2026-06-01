# Phase IBKR-B2 — Sync stabilization and truth restoration

Status: active  
Last updated: 2026-06-01 UTC

## Goal
Make IBKR-backed portfolio sync reliable enough that:
- holdings sync writes truthful non-zero holdings/cash
- accounting snapshot writes truthful positions/ledger
- dashboard/reporting surfaces regenerate from that data without stalling
- degraded quote posture is surfaced honestly without zeroing the portfolio

## Scope
Focus on the read-only native IBKR path and its downstream sync/reporting chain:
- native account/position/ledger discovery
- holdings snapshot generation
- accounting snapshot generation
- dashboard/report regeneration
- concurrency / scheduling safety

## Findings so far
- Native socket connectivity is working.
- Read-only discovery works reliably with a separate native client id.
- Fresh holdings can now be written correctly.
- Empty dashboard state came from stale dashboard regeneration plus slow quote-fallback behavior.
- Parallel sync runs can still produce misleading zero outputs and need guarding.

## Implementation steps

### 1) Stabilize native read-only sync semantics
- Keep write client id and read-only discovery client id separate.
- Audit all read-path entrypoints to ensure they consistently use the read-only client id:
  - accounts
  - positions
  - ledger
  - market snapshot probes
- Add regression coverage for mixed read/write client-id config behavior.

### 2) Prevent concurrent read-sync collisions
- Add a lightweight lock/guard for IBKR read-sync jobs so holdings/accounting/dashboard refreshes do not overlap destructively.
- Apply it to:
  - holdings sync
  - accounting snapshot sync
  - any dashboard/report job that triggers broker-backed refresh
- Fail closed with a truthful `sync already in progress` result rather than writing zeros.

### 3) Harden holdings sync against partial broker data
- Never write an empty/zero holdings snapshot when:
  - auth succeeded
  - account id resolved
  - previous good holdings exist
- Treat missing positions/ledger during a live sync as degraded/unavailable, not as real zero portfolio state.
- Prefer:
  - existing last-known-good snapshot
  - fresh avg-cost-backed holdings rows
  - truthful warning banner
  over emitting zero value state.

### 4) Harden accounting snapshot writes
- Apply the same no-false-zero rule to `sync-ibkr-accounting-snapshot`.
- If positions/ledger come back empty unexpectedly:
  - mark snapshot degraded
  - preserve prior good artifact where appropriate
  - include machine-readable error reason

### 5) Keep dashboard regeneration fast and truthful
- Preserve the patch that skips slow external quote fallback when a usable holdings snapshot already exists.
- Ensure dashboard/report generation:
  - uses fresh holdings if present
  - never blocks long enough to leave stale zero artifacts behind
  - surfaces quote posture as unclear/delayed/unavailable without collapsing value to zero

### 6) Regenerate full portfolio surfaces after sync
After a successful sync, regenerate in order:
1. `portfolio/etf/holdings.md`
2. `runtime/ibkr-accounting/etf/latest.json`
3. `portfolio/etf/dashboard.md`
4. summary/report artifacts that depend on holdings

This should be one controlled flow, not loosely coupled partial steps.

### 7) Add regression tests
Add focused tests for:
- read-only native client id split
- concurrent sync guard behavior
- holdings sync does not overwrite good state with false zero
- accounting snapshot does not overwrite good state with false zero
- dashboard regeneration completes quickly from usable holdings snapshot
- degraded quote posture still yields populated dashboard values

## Verification gates

### Code/tests
- focused IBKR native tests pass
- quote-resolution/dashboard regression tests pass
- new sync guard / false-zero protection tests pass

### Live checks
- `node scripts/test-interactive-brokers-native-client.js`
- `node scripts/sync-interactive-brokers-holdings.js portfolio/etf`
- `node scripts/sync-ibkr-accounting-snapshot.js etf`
- `node scripts/show-dashboard.js etf`

### Expected live outcome
- non-zero holdings count
- non-zero cash
- dashboard total aligned with holdings/accounting
- warning may remain for quote posture, but no false zero portfolio

## Remaining honest caveat
This plan fixes sync truthfulness and artifact reliability. It does not by itself solve the separate question of whether IBKR quote posture should be classified as live vs delayed vs unclear. That should remain an explicit warning until resolved.
