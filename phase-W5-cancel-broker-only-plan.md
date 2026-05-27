# Phase W5 — Cancel-portfolio-order broker-only fallback (Spec §1 closeout)

**Goal:** Ship a `--broker-only` fallback for `scripts/cancel-portfolio-order.js` and the underlying `cancelPortfolioOrder()` function, so orders that exist at IBKR but are NOT in the local `trades.md` can still be cancelled (the order-102 case from 2026-05-26).

## Objectives
1. Extend `cancelPortfolioOrder()` to accept `selector.brokerOnly = true`, which:
   - Skips the trades.md reconciliation requirement
   - Looks up the order at IBKR via `client.getOrderStatus(orderId)` (which uses `fetchOpenOrders` → `reqAllOpenOrders` internally — cross-client visible)
   - If found, calls `client.cancelOrder()` and records a synthetic log entry
   - Records the cancel in `runtime/execution-state.json` under a `brokerOnlyCancels` audit log
2. Add `--broker-only` flag to `scripts/cancel-portfolio-order.js` that sets `selector.brokerOnly = true`
3. Preserve the existing local-trades path as primary
4. Write `scripts/test-cancel-order-broker-only.js` with mocked broker client
5. Wire into `verifyRepoChecks`
6. Close Spec §1 cancel item in `spec-outstanding-checklist.md`

## Risks / dependencies
- Touching execution-critical code path. Mitigation: keep existing path unchanged; broker-only is purely additive and gated on `selector.brokerOnly === true`.
- IBKR not connected during test runs. Mitigation: mock `InteractiveBrokersClient` in the test via `require.cache` shim.
- Audit log mutates `runtime/execution-state.json`. Mitigation: test uses a tmp execution-state path via `STATE_PATH` override or by isolating writes in test mode.
- The `recordBrokerError` / `clearBrokerErrors` helpers don't currently export a synthetic-audit helper. Add a `recordBrokerOnlyCancel` helper to `runtimeState.js`.

## Actionable checklist
- [ ] Add `recordBrokerOnlyCancel({ portfolio, orderId, status, message })` to `src/execution/runtimeState.js`, exported alongside the others
- [ ] In `cancelPortfolioOrder()`, when `selector.brokerOnly === true`:
  - Run readiness check + policy blockers same as before
  - Skip the portfolio/holdings blockers if `brokerOnly` (the order isn't ours by definition)
  - Call `client.getOrderStatus(orderId)` first; if not open, return `{ ok: false, reason: 'broker_order_not_open' }`
  - Call `client.cancelOrder(orderId)`; on success, record via `recordBrokerOnlyCancel` + `recordRuntimeEvent`
  - Skip the trades.md reconcile / history snapshot (this isn't our trade)
- [ ] In `scripts/cancel-portfolio-order.js`, parse `--broker-only` flag and pass `selector.brokerOnly = true`
- [ ] Test file `scripts/test-cancel-order-broker-only.js`:
  - Mock the broker client and `getInteractiveBrokersReadiness`
  - Case 1: order open at broker → cancel succeeds → audit logged
  - Case 2: order not open at broker → returns `broker_order_not_open`
  - Case 3: cancel rejection → returns error, no audit log
  - Case 4: broker not authenticated → returns `policy_blocked`
  - Case 5: `userApproved=false` → returns `policy_blocked`
- [ ] Wire test into `src/reporting/verifyRepoChecks.js`
- [ ] Update `spec-outstanding-checklist.md` §1 cancel item
- [ ] Run `npm test` until green
- [ ] Commit + push

## Acceptance criteria
- `cancelPortfolioOrder({ selector: { brokerOnly: true }, ... })` works end-to-end for broker-only orders
- `scripts/cancel-portfolio-order.js --broker-only <portfolio> <orderId>` works as a script
- Existing call sites (no `brokerOnly` flag) behave identically
- ≥5 new assertions in the broker-only test
- `npm test` exit 0
- `runtime/execution-state.json` gains a `brokerOnlyCancels` audit log on success
- Spec §1 cancel item checked off

## Out
A repo where cross-client broker orders (the order-102 case) can be cancelled safely without manual SQL/script edits.
