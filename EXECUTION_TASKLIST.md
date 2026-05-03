# Interactive Brokers Execution Completion Task List

Last updated: 2026-05-03 11:35 UTC

## Goal

Close the single highest-priority MVP gap: a safe, portfolio-aware Interactive Brokers execution lifecycle that remains confirmation-gated by default and reconciles execution outcomes back into Markdown state.

## What already exists

- broker client with:
  - quote preview
  - dry-run preview
  - open-order status lookup
  - cancel-path scaffolding
  - readonly protection
- live read-only holdings sync
- trade proposal generation
- trade log writing
- history snapshot writing
- dashboard regeneration
- safety checks and activation checks

## Highest-priority build sequence

### Phase A — portfolio-aware execution gate and order staging
- [ ] add a portfolio execution service above the broker client
- [ ] parse execution mode, approval requirements, and account reference from `portfolio.md`
- [ ] refuse live execution when:
  - portfolio status is not active
  - execution mode is `propose_only`
  - unresolved open questions remain
  - holdings are stale/simulated/unmatched
  - broker auth is unhealthy
  - requested instrument is outside approved universe
  - user confirmation token/flag is missing
- [ ] support dry-run staging with a normalized result envelope
- [ ] support revocable non-transmitted broker staging only when explicitly allowed

### Phase B — execution reconciliation into Markdown state
- [ ] write execution lifecycle events to `trades.md`
- [ ] add helpers for status transitions:
  - proposed -> approved
  - approved -> submitted
  - submitted -> partially_filled
  - submitted -> filled
  - submitted -> cancelled
  - submitted -> failed
- [ ] regenerate `dashboard.md` after execution-state changes
- [ ] append `history.md` snapshots after material execution-state changes
- [ ] prepare holdings refresh hook after fills

### Phase C — durable status/cancel handling
- [ ] add a script to inspect order status by id
- [ ] add a script to request cancel by id with policy gating
- [ ] normalize not-found / open / filled / cancelled / failed cases
- [ ] stop automation on repeated broker errors or auth failures

### Phase D — focused verification
- [ ] add tests/scripts for gate failures
- [ ] add tests/scripts for dry-run staging
- [ ] add tests/scripts for approved->submitted trade-log transition
- [ ] add tests/scripts for status reconciliation
- [ ] verify readonly mode fails closed for live submit/cancel

## Immediate implementation target

Build **Phase A + the first slice of Phase B** now:
1. add a portfolio execution service
2. add portfolio-aware live execution policy checks
3. add a normalized staging API and CLI script
4. append staged execution events into `trades.md` safely
5. regenerate dashboard/history after staging actions where appropriate

## Non-goals for this pass

- enabling auto-trading
- removing confirmation gates
- changing ETF-only / CHF-first MVP scope
- bypassing readonly protections
