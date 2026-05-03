# Interactive Brokers Execution Completion Task List

Last updated: 2026-05-03 20:46 UTC

## Goal

Close the single highest-priority MVP gap: a safe, portfolio-aware Interactive Brokers execution lifecycle that remains confirmation-gated by default and reconciles execution outcomes back into Markdown state.

## What already exists

- broker client with:
  - quote preview
  - dry-run preview
  - open-order status lookup
  - execution-fill fallback for filled orders
  - completed-order lookup for closed/cancelled history
  - cancel-path scaffolding
  - readonly protection
- live read-only holdings sync
- trade proposal generation
- trade approval + lifecycle reconciliation helpers
- typed history snapshot writing
- dashboard regeneration with execution lifecycle visibility
- safe demo execution flow
- safety checks and activation checks
- bundled execution verification (`npm run verify:execution`)

## Highest-priority build sequence

### Phase A — portfolio-aware execution gate and order staging
- [x] add a portfolio execution service above the broker client
- [x] parse execution mode, approval requirements, and account reference from `portfolio.md`
- [x] refuse live execution when:
  - [x] portfolio status is not active
  - [x] execution mode is `propose_only`
  - [ ] unresolved open questions remain
  - [x] holdings are stale/simulated/unmatched
  - [x] broker auth is unhealthy
  - [x] requested instrument is outside approved universe
  - [x] user confirmation token/flag is missing
- [x] support dry-run staging with a normalized result envelope
- [x] support revocable non-transmitted broker staging only when explicitly allowed

### Phase B — execution reconciliation into Markdown state
- [x] write execution lifecycle events to `trades.md`
- [x] add helpers for status transitions:
  - [x] proposed -> approved
  - [x] approved -> submitted
  - [x] submitted -> partially_filled
  - [x] submitted -> filled
  - [x] submitted -> cancelled
  - [x] submitted -> failed
- [x] regenerate `dashboard.md` after execution-state changes
- [x] append `history.md` snapshots after material execution-state changes
- [x] prepare holdings refresh hook after fills

### Phase C — durable status/cancel handling
- [x] add a script to inspect order status by id
- [x] add a script to request cancel by id with policy gating
- [x] normalize not-found / open / filled / cancelled / failed cases
- [x] stop automation on repeated broker errors or auth failures

### Phase D — focused verification
- [x] add tests/scripts for gate failures
- [x] add tests/scripts for dry-run staging
- [x] add tests/scripts for approved->submitted trade-log transition
- [x] add tests/scripts for status reconciliation
- [x] verify readonly mode fails closed for live submit/cancel
- [x] bundle focused execution checks into one verification command

## What remains highest priority

### Phase E — real writable execution enablement
- [ ] finish repo-level live `placeOrder` path behind explicit safety gates
- [ ] validate writable submit behavior against real broker sessions only after intentional operator enablement
- [ ] harden live `cancelOrder` behavior beyond current scaffolding
- [ ] confirm live status polling/reconciliation under real broker conditions
- [ ] extend live broker action logging and operator-facing summaries

### Phase F — workflow and reporting polish
- [ ] enforce unresolved onboarding/draft questions as an execution blocker where still missing
- [ ] surface execution lifecycle more richly in generated reports
- [ ] tighten proposal-vs-approved separation in dashboard/reporting views
- [ ] optionally compact old superseded execution artifacts in a clearly auditable way

## Immediate implementation target

Build **Phase E prep + Phase F polish** next:
1. keep report/dashboard/state views aligned with the richer execution lifecycle now implemented
2. finish unresolved-question execution gating if any draft-state holes remain
3. prepare the live writable path for explicit operator enablement without weakening safety defaults

## Non-goals for this pass

- enabling auto-trading
- removing confirmation gates
- changing ETF-only / CHF-first MVP scope
- bypassing readonly protections
