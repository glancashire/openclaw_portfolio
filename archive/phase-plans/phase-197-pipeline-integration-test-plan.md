# Phase 197 — End-to-End Pipeline Integration Test

## Objective
Write a single integration test that simulates the full workflow without a live broker:
1. Build a `portfolio.md` + `holdings.md` fixture.
2. Run `generateBasketProposal` (with stub quotes) to produce a proposal envelope.
3. Promote proposal → approved basket envelope.
4. Run `executeApprovedBasket` with stub broker (3 fills + 1 cancellation simulated).
5. Run `runBasketLifecycle` with stub fns (mirror + reconcile + reproposal).
6. Promote the resulting reproposal → approved basket envelope.
7. Run `executeApprovedBasket` again (this time stub fills the last leg).
8. Run lifecycle again; confirm summary shows zero cancelled, all legs filled.

This proves the full autonomous pipeline works end-to-end and pins it against regression.

## Risks / dependencies
- The basket runner currently makes a real broker call via the InteractiveBrokersClient. We need to either:
  - Inject a stub client, OR
  - Mock the `submitOrder` path at the runner level.
- The runner is deeply tied to the IBKR client; check whether `submitOrder` accepts an injected client or whether we need a different injection point.

## Actionable checklist
- [ ] Inspect `executeApprovedBasket` to find the cleanest stub injection point.
- [ ] If no clean injection exists, add one (e.g., `executeApprovedBasket({ ..., brokerClient })`) — backward compatible default.
- [ ] Write `scripts/test-pipeline-end-to-end.js` exercising the full flow.
- [ ] Test must:
  - Generate proposal from fixture portfolio + holdings.
  - Verify proposal has expected legs.
  - Promote and run.
  - Simulate 3-fills/1-cancel.
  - Verify lifecycle produces reproposal.
  - Promote reproposal and execute again, simulating fill.
  - Verify final state shows all 4 legs filled.
- [ ] Existing focused tests stay green.

## Acceptance criteria
- Pipeline test passes deterministically with no broker dependency.
- Test exercises every Phase 188–196 helper at least once.
- All 19 existing focused tests + new pipeline test pass.
