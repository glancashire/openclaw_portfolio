# Operator runbooks

These runbooks cover the normal operator actions and the most common incident paths for the current portfolio-manager execution model.

## Scope and assumptions
- The repo is still safety-first and fail-closed.
- `dry-run`, non-transmitted `stage`, and `transmit-live` are distinct lanes.
- Operator actions are expected to leave evidence in `trades.md`, `history.md`, `dashboard.md`, reports, and `runtime/execution-state.json`.
- The examples below use `portfolio/etf`.

## Quick state model

### Trade log states
- `proposed` — draft proposal generated, not approved
- `planned` — non-order planning entry such as the CHF cash sleeve
- `approved` — operator approved for the next execution step
- `staged` — broker order prepared but explicitly not transmitted
- `submitted` — transmitted to broker
- `partially_filled` — broker reports partial execution
- `filled` — broker reports completed execution
- `cancelled` — operator or broker cancelled the order
- `failed` — broker rejected it, status could not be found, or execution failed closed

### Approval labels
- `pending_user_approval`
- `user_approved`
- `user_rejected`
- `staged_not_transmitted`
- `submitted_to_broker`
- `broker_filled`
- `cancelled`
- `broker_failed`

## 1) Approve a trade proposal

### When to use
Use this when a current `proposed` or `planned` row should advance to the next execution step.

### Command
```bash
node scripts/approve-portfolio-trade.js portfolio/etf '{"tickerOrIsin":"LU0950668870","action":"buy"}'
```

### Expected result
- Matching latest proposal row moves to `approved`
- `Approval` becomes `user_approved`
- `Reason` gains `Operator approval recorded.`
- `history.md` gets an `execution_approved` snapshot
- `dashboard.md` refreshes and should reflect approved lifecycle state

### If it fails
Common reasons:
- selector does not match the latest actionable row
- you tried to approve a stale proposal era
- the trade is already terminal or already in flight

## 2) Reject a trade proposal

### When to use
Use this when a proposal should be blocked instead of advanced.

### Command
```bash
node scripts/reject-portfolio-trade.js portfolio/etf '{"tickerOrIsin":"LU0950668870","action":"buy"}'
```

### Expected result
- Matching latest proposal row moves to `rejected`
- `Approval` becomes `user_rejected`
- `Reason` gains `Operator rejection recorded.`
- `history.md` gets an `execution_rejected` snapshot
- `dashboard.md` refreshes

## 3) Stage a non-transmitted broker order

### When to use
Use this only after the trade is approved and you want revocable broker staging without live transmission.

### Command
```bash
node scripts/stage-portfolio-order.js portfolio/etf '{"symbol":"EMUAA","conid":"243939970","action":"BUY","orderType":"LMT","limitPrice":38.5,"quantity":1,"currency":"EUR","exchange":"SMART","secType":"STK","userApproved":true}' stage
```

### Expected result
- Policy gates must pass first
- `trades.md` gets a `staged` row
- `Approval` becomes `staged_not_transmitted`
- `history.md` gets an `execution_staged` snapshot
- `dashboard.md` lifecycle summary shows staged work

### Important note
`stage` is not live transmission. It is still reversible scaffolding.

## 4) Check transmitted-live readiness before a real broker write

### When to use
Use this before any true transmitted live attempt.

### Command
```bash
node scripts/check-transmitted-live-readiness.js portfolio/etf '{"symbol":"EMUAA","conid":"243939970","action":"BUY","orderType":"LMT","limitPrice":38.5,"quantity":1,"currency":"EUR","exchange":"SMART","secType":"STK","userApproved":true,"transmit":true,"transmittedLiveAck":"I UNDERSTAND THIS WILL TRANSMIT A LIVE ORDER"}'
```

### Expected result
- `ok: true` only if every transmitted-live gate passes
- otherwise a blocker list explains why the repo failed closed

## 5) Resync open broker orders

### When to use
Use this when staged/submitted/partial orders may have advanced at the broker or after a restart.

### Command
```bash
node scripts/resync-portfolio-orders.js portfolio/etf
```

### Expected result
- All latest open broker-order rows are checked
- matching rows are updated to `staged`, `submitted`, `partially_filled`, `filled`, `cancelled`, or `failed`
- `Reason` gains `Operator resync refreshed open broker order state.` when applicable
- fill/partial-fill paths may trigger holdings sync
- `history.md` and `dashboard.md` refresh

### If `not_found` appears
Treat it as an incident requiring review:
- confirm whether the order was cancelled/rejected/completed outside the current state trail
- inspect the broker directly
- preserve the `failed` reconciliation evidence in Markdown

## 6) Cancel an in-flight broker order

### When to use
Use this for an eligible staged/submitted broker order that should no longer proceed.

### Command
```bash
node scripts/cancel-portfolio-order.js portfolio/etf 5252 '{"orderId":"5252","tickerOrIsin":"LU0950668870","action":"buy"}'
```

### Expected result
- explicit operator approval is required by the script surface
- matching row moves to `cancelled` when broker cancel succeeds
- `Reason` gains broker cancel details
- `history.md` gets an execution-status snapshot
- `dashboard.md` refreshes

## 7) Broker-error pause and recovery

### What triggers the pause
Repeated broker failures are counted in `runtime/execution-state.json`.
When the threshold is reached, execution policy blocks further live actions.

### Inspect current pause state
```bash
cat runtime/execution-state.json
```

A paused portfolio will show a non-zero consecutive broker error count and policy blockers similar to:
- `Broker automation is paused after 3 consecutive broker errors.`

### Recovery approach
1. Confirm the underlying broker/auth/connectivity issue is actually resolved.
2. Re-run read-only readiness checks.
3. Resync any open orders.
4. Only after a successful broker interaction should the error counter clear naturally.

### Important note
Do not treat the pause as cosmetic. It is a safety brake.

## 8) Expected state transitions

### Proposal path
```text
proposed -> approved -> staged -> submitted -> partially_filled -> filled
```

### Rejection path
```text
proposed -> rejected
approved -> rejected
```

### Cancel path
```text
staged/submitted/partially_filled -> cancelled
```

### Failure path
```text
submitted/staged -> failed
not_found -> failed
broker rejection/error -> failed
```

## 9) Incident examples

### A. Stale proposal approval blocked
Symptoms:
- approval command returns `ok: false`
- a newer proposal exists for the same instrument/action

Response:
1. inspect the latest matching row in `trades.md`
2. approve the newest actionable proposal only
3. regenerate proposals if the current state changed materially

### B. Broker status lookup says `not_found`
Symptoms:
- resync returns `reason: not_found`
- row may reconcile to `failed`

Response:
1. inspect broker UI/API directly
2. decide whether the row represents a cancel, reject, or already-completed action outside the expected path
3. preserve the failure evidence and avoid overlapping new orders until resolved

### C. Broker automation paused after repeated failures
Symptoms:
- execution policy blocker referencing consecutive broker errors
- live/staged execution paths fail closed

Response:
1. resolve auth/connectivity/configuration issue
2. confirm readiness in read-only mode
3. resync outstanding orders
4. retry only once the system produces a successful broker interaction again

## 10) Operator evidence checklist
After any meaningful operator action, check:
- `trades.md` row state and reason text
- `history.md` latest snapshot note
- `dashboard.md` execution lifecycle and warnings
- latest report freshness/generation state if reporting is involved
- `runtime/execution-state.json` if a broker failure occurred
