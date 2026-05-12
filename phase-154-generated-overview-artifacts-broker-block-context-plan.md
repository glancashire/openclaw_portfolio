# Phase 154 — Generated Overview Artifacts Broker-Block Context

## Goal
Prove that generated overview artifacts carry broker-block context end-to-end by validating the emitted runtime delivery-status JSON/HTML and cockpit HTML after artifact generation, not just isolated render helpers.

## Checklist
- [ ] Inspect existing generated-overview regression coverage for the best extension point.
- [ ] Add assertions that generated delivery-status JSON keeps `deliveryPosture.brokerBlockContext` when a broker-blocked row exists.
- [ ] Add assertions that generated delivery-status markdown/html expose the broker-block reason and next action.
- [ ] Add assertions that generated cockpit HTML exposes the delivery broker-block section.
- [ ] Re-run the focused overview/reporting regression suite and iterate until green.
- [ ] Commit and push once green.

## Verification
- `scripts/test-multi-portfolio-overview.js` passes with generated-artifact assertions.
- Existing targeted broker-block delivery tests remain green.

## Non-goals
- No changes to broker-block ranking logic.
- No changes to delivery readiness recommendation precedence.
- No operational workflow changes.
